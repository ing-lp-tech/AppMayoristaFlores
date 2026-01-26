-- 1. Asegurar limpieza total antes de empezar
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
END $$;

-- 2. Habilitar RLS
ALTER TABLE public.calculos_costos ENABLE ROW LEVEL SECURITY;

-- 3. Crear función auxiliar para facilitar chequeo de roles (opcional pero recomendado)
--    O podemos hacer la query directa en el policy. Haremos direct query por simplicidad.
--    Asumimos que la tabla de usuarios es 'public.usuarios_internos' y el link es 'id' = 'auth.uid()' 
--    OJO: Verificar si usuarios_internos usa UUID igual a auth.users. 
--    Si no, usamos email. En este proyecto parece que se linkea por auth.uid().

-- POLÍTICA 1: LECTURA PARA TODOS LOS AUTENTICADOS (O solo admins? Asumamos todos pro ahora para que vean historial)
CREATE POLICY "Read access for authenticated"
ON public.calculos_costos
FOR SELECT
TO authenticated
USING (true);

-- POLÍTICA 2: ESCRITURA (INSERT/UPDATE/DELETE) SOLO PARA OWNER/ADMIN
CREATE POLICY "Write access for admins and owners"
ON public.calculos_costos
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.usuarios_internos
        WHERE id = auth.uid()
        AND (
            'owner' = ANY(roles) OR 
            'admin' = ANY(roles)
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.usuarios_internos
        WHERE id = auth.uid()
        AND (
            'owner' = ANY(roles) OR 
            'admin' = ANY(roles)
        )
    )
);
