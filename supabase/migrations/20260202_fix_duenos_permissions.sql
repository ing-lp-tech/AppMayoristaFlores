-- ==========================================
-- FIX: Permisos de tabla DUENOS
-- ==========================================
-- Problema: Las políticas RLS previas eran demasiado restrictivas
-- Solución: Permitir acceso completo a usuarios autenticados

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Admin full access duenos" ON public.duenos;
DROP POLICY IF EXISTS "Authenticated read duenos" ON public.duenos;

-- Política nueva: Acceso completo para usuarios autenticados
-- Todos los usuarios internos autenticados pueden gestionar dueños
CREATE POLICY "Authenticated users full access duenos"
    ON public.duenos
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Comentario para documentación
COMMENT ON POLICY "Authenticated users full access duenos" ON public.duenos IS 
    'Permite acceso completo (SELECT, INSERT, UPDATE, DELETE) a todos los usuarios autenticados';
