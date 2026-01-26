-- SOLUCIÓN FINAL SEGURA (RLS ACTIVADO + VERIFICACIÓN DE ROL)
-- 1. Primero, volvemos a ACTIVAR la seguridad (RLS)
ALTER TABLE public.calculos_costos ENABLE ROW LEVEL SECURITY;

-- 2. Revocamos los permisos públicos excesivos que dimos antes
REVOKE ALL ON TABLE public.calculos_costos FROM anon;
REVOKE ALL ON TABLE public.calculos_costos FROM authenticated;
-- Devolvemos el control estándar a Postgres
GRANT ALL ON TABLE public.calculos_costos TO postgres;
GRANT ALL ON TABLE public.calculos_costos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calculos_costos TO authenticated;

-- 3. Definimos la FUNCIÓN SEGURA (Mejorada para evitar errores de tipos)
CREATE OR REPLACE FUNCTION public.check_is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con super-permisos para poder leer usuarios_internos
SET search_path = public -- Buena práctica de seguridad
AS $$
BEGIN
    -- Verificamos si el usuario tiene rol 'owner' o 'admin' en su array de roles
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios_internos
        WHERE id = auth.uid()
        AND (
            'owner'::user_role = ANY(roles) OR 
            'admin'::user_role = ANY(roles)
        )
    );
END;
$$;

-- 4. Limpiamos todas las políticas anteriores
DO $$
BEGIN
    DROP POLICY IF EXISTS "Access for authenticated" ON public.calculos_costos;
    DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Write access for admins and owners" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Read access for authenticated" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Allow all for public" ON public.calculos_costos;
END $$;

-- 5. APLICAMOS LA POLÍTICA DE SEGURIDAD REAL
-- Lectura: Permitida a cualquier usuario logueado (para que todos vean el historial)
CREATE POLICY "Read access for staff"
ON public.calculos_costos
FOR SELECT
TO authenticated
USING (true);

-- Escritura: Permitida SOLO si pasa el chequeo de Admin/Owner
CREATE POLICY "Write access for admin/owner only"
ON public.calculos_costos
FOR ALL -- Insert, Update, Delete
TO authenticated
USING ( public.check_is_admin_or_owner() )
WITH CHECK ( public.check_is_admin_or_owner() );
