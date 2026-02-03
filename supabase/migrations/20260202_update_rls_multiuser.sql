-- ==========================================
-- ACTUALIZAR POLÍTICAS RLS PARA SISTEMA MULTI-USUARIO
-- ==========================================
-- Ahora que tenemos la tabla usuarios_duenos, actualizamos las políticas
-- para que los dueños solo vean sus propios datos

-- ==========================================
-- TABLA: DUENOS
-- ==========================================

-- Eliminar política permisiva actual
DROP POLICY IF EXISTS "Authenticated users full access duenos" ON public.duenos;

-- Admin: acceso total
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

-- Dueños: solo pueden ver su propio registro
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

-- ==========================================
-- TABLA: COMPRAS_PROVEEDORES
-- ==========================================

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Admin full access compras" ON public.compras_proveedores;
DROP POLICY IF EXISTS "Dueno read own compras" ON public.compras_proveedores;

-- Admin: acceso total
CREATE POLICY "Admin full access compras"
    ON public.compras_proveedores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND 'admin' = ANY(roles)
        )
    );

-- Dueños: solo sus propias compras
CREATE POLICY "Duenos read own compras"
    ON public.compras_proveedores
    FOR SELECT
    USING (
        dueno_id IN (
            SELECT dueno_id 
            FROM public.usuarios_duenos 
            WHERE usuario_id = auth.uid()
        )
    );

-- Dueños: pueden crear sus propias compras
CREATE POLICY "Duenos create own compras"
    ON public.compras_proveedores
    FOR INSERT
    WITH CHECK (
        dueno_id IN (
            SELECT dueno_id 
            FROM public.usuarios_duenos 
            WHERE usuario_id = auth.uid()
        )
    );

-- ==========================================
-- TABLA: PAGOS_PROVEEDORES
-- ==========================================

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Admin full access pagos" ON public.pagos_proveedores;
DROP POLICY IF EXISTS "Dueno read own pagos" ON public.pagos_proveedores;

-- Admin: acceso total
CREATE POLICY "Admin full access pagos"
    ON public.pagos_proveedores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND 'admin' = ANY(roles)
        )
    );

-- Dueños: solo sus propios pagos
CREATE POLICY "Duenos read own pagos"
    ON public.pagos_proveedores
    FOR SELECT
    USING (
        dueno_id IN (
            SELECT dueno_id 
            FROM public.usuarios_duenos 
            WHERE usuario_id = auth.uid()
        )
    );

-- Dueños: pueden crear pagos para sus compras
CREATE POLICY "Duenos create own pagos"
    ON public.pagos_proveedores
    FOR INSERT
    WITH CHECK (
        dueno_id IN (
            SELECT dueno_id 
            FROM public.usuarios_duenos 
            WHERE usuario_id = auth.uid()
        )
    );

-- ==========================================
-- COMENTARIOS
-- ==========================================

COMMENT ON POLICY "Admin full access duenos" ON public.duenos IS 
    'Administradores tienen acceso completo a todos los dueños';

COMMENT ON POLICY "Duenos read own data" ON public.duenos IS 
    'Cada dueño solo puede ver su propio registro';

COMMENT ON POLICY "Duenos read own compras" ON public.compras_proveedores IS 
    'Cada dueño solo puede ver sus propias compras';

COMMENT ON POLICY "Duenos read own pagos" ON public.pagos_proveedores IS 
    'Cada dueño solo puede ver sus propios pagos';
