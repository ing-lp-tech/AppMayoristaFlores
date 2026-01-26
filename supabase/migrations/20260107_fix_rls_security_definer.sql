-- SOLUCIÓN DEFINITIVA: FUNCIÓN SECURITY DEFINER
-- Esto evita problemas de visibilidad RLS al consultar la tabla usuarios_internos

-- 1. Crear función segura para verificar admin/owner
CREATE OR REPLACE FUNCTION public.check_is_admin_or_owner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER -- Ejecuta con permisos de superusuario (bypasea RLS de usuarios_internos)
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.usuarios_internos
        WHERE id = auth.uid()
        AND (
            roles @> ARRAY['owner'::user_role] OR 
            roles @> ARRAY['admin'::user_role]
        )
    );
$$;

-- 2. Limpiar políticas de nuevo
DO $$
BEGIN
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Enable all for authenticated" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Allow all for authenticated" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Allow all for public" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Restricted access for admins and owners" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Read access for authenticated" ON public.calculos_costos;
    DROP POLICY IF EXISTS "Write access for admins and owners" ON public.calculos_costos;
END $$;

-- 3. Crear políticas usando la FUNCION SEGURA
ALTER TABLE public.calculos_costos ENABLE ROW LEVEL SECURITY;

-- Lectura para todos los logueados
CREATE POLICY "Read access for authenticated"
ON public.calculos_costos
FOR SELECT
TO authenticated
USING (true);

-- Escritura usando la función (SOLO Owners/Admins)
CREATE POLICY "Write access for admins and owners"
ON public.calculos_costos
FOR ALL
TO authenticated
USING ( public.check_is_admin_or_owner() )
WITH CHECK ( public.check_is_admin_or_owner() );
