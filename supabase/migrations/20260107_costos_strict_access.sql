-- SOLUCIÓN DEFINITIVA: ACCESO ESTRICTO (Owner, Admin, Contador)

-- 1. Asegurar que el rol 'contador' exista en la base de datos
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'contador';

-- 2. REACTIVAR SEGURIDAD (Si estaba desactivada)
ALTER TABLE public.calculos_costos ENABLE ROW LEVEL SECURITY;

-- 3. Revocar permisos públicos (Cerrar puertas)
REVOKE ALL ON TABLE public.calculos_costos FROM anon;
REVOKE ALL ON TABLE public.calculos_costos FROM authenticated;
-- Restaurar permisos base
GRANT ALL ON TABLE public.calculos_costos TO postgres;
GRANT ALL ON TABLE public.calculos_costos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.calculos_costos TO authenticated;

-- 4. Nueva Función Verificadora: Incluye 'contador'
CREATE OR REPLACE FUNCTION public.check_costos_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.usuarios_internos
        WHERE id = auth.uid()
        AND (
            'owner'::user_role = ANY(roles) OR 
            'admin'::user_role = ANY(roles) OR
            'contador'::user_role = ANY(roles)
        )
    );
END;
$$;

-- 5. Limpieza de Políticas Anteriores
DO $$
BEGIN
    DROP POLICY IF EXISTS "authenticated_users_full_access" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Write access for admins and owners" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Read access for staff" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Write access for admin/owner only" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Costos Access Policy" ON public.calculos_costos;
END $$;

-- 6. APLICAR POLÍTICA ÚNICA Y ESTRICTA
-- Tanto para LEER como para ESCRIBIR, debes tener uno de los 3 roles.
CREATE POLICY "Costos Access Policy"
ON public.calculos_costos
FOR ALL
TO authenticated
USING ( public.check_costos_access() )
WITH CHECK ( public.check_costos_access() );
