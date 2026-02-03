-- ==========================================
-- ⚠️ MIGRACIÓN DE PRODUCCIÓN - REACTIVAR RLS
-- ==========================================
-- 🚨 EJECUTAR SOLO ANTES DE SUBIR A PRODUCCIÓN
-- 🚨 NO ejecutar en desarrollo local si quieres seguir trabajando sin autenticación

-- ==========================================
-- PASO 1: REACTIVAR RLS
-- ==========================================

ALTER TABLE public.duenos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos_proveedores ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PASO 2: ELIMINAR POLÍTICAS ANTERIORES
-- ==========================================

-- Duenos
DROP POLICY IF EXISTS "Authenticated users full access duenos" ON public.duenos;
DROP POLICY IF EXISTS "Admin full access duenos" ON public.duenos;
DROP POLICY IF EXISTS "Duenos read own data" ON public.duenos;
DROP POLICY IF EXISTS "Authenticated users access duenos" ON public.duenos;

-- Compras
DROP POLICY IF EXISTS "Authenticated full access compras" ON public.compras_proveedores;
DROP POLICY IF EXISTS "Admin full access compras" ON public.compras_proveedores;
DROP POLICY IF EXISTS "Duenos read own compras" ON public.compras_proveedores;
DROP POLICY IF EXISTS "Duenos create own compras" ON public.compras_proveedores;
DROP POLICY IF EXISTS "Authenticated users access compras" ON public.compras_proveedores;

-- Pagos
DROP POLICY IF EXISTS "Authenticated full access pagos" ON public.pagos_proveedores;
DROP POLICY IF EXISTS "Admin full access pagos" ON public.pagos_proveedores;
DROP POLICY IF EXISTS "Duenos read own pagos" ON public.pagos_proveedores;
DROP POLICY IF EXISTS "Duenos create own pagos" ON public.pagos_proveedores;
DROP POLICY IF EXISTS "Authenticated users access pagos" ON public.pagos_proveedores;

-- ==========================================
-- PASO 3: CREAR POLÍTICAS SEGURAS
-- ==========================================

-- OPCIÓN A: Todos los usuarios autenticados ven todo (más simple)
-- Usa esta si todos los dueños van a trabajar juntos y pueden ver datos de todos

CREATE POLICY "Authenticated users access duenos"
    ON public.duenos
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users access compras"
    ON public.compras_proveedores
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users access pagos"
    ON public.pagos_proveedores
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ==========================================
-- OPCIÓN B (COMENTADA): Segregación por dueño
-- ==========================================
-- Descomenta esto si quieres que cada dueño SOLO vea sus propios datos
-- Requiere que hayas creado la tabla usuarios_duenos

/*
-- Admin ve todo
CREATE POLICY "Admin full access duenos"
    ON public.duenos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND 'admin' = ANY(roles)
        )
    );

-- Dueños solo ven su registro
CREATE POLICY "Duenos read own data"
    ON public.duenos
    FOR SELECT
    USING (
        id IN (
            SELECT dueno_id 
            FROM public.usuarios_duenos 
            WHERE usuario_id = auth.uid()
        )
    );

-- Similar para compras y pagos...
*/

-- ==========================================
-- VERIFICACIÓN
-- ==========================================

-- Ver políticas activas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename IN ('duenos', 'compras_proveedores', 'pagos_proveedores')
ORDER BY tablename, policyname;

-- Verificar que RLS está activado
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('duenos', 'compras_proveedores', 'pagos_proveedores');

-- ==========================================
-- CONFIRMACIÓN
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS REACTIVADO CON ÉXITO';
    RAISE NOTICE '✅ Solo usuarios autenticados pueden acceder a los datos';
    RAISE NOTICE '⚠️ Verifica que la aplicación funcione correctamente';
    RAISE NOTICE '⚠️ Prueba con diferentes usuarios antes de desplegar';
END $$;
