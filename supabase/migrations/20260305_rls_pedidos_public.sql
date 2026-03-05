-- Políticas RLS para permitir que compradores públicos (anon) creen pedidos
-- Esto es necesario para que el checkout funcione sin autenticación

-- ── 1. Tabla pedidos ────────────────────────────────────────────────────────
-- Permitir INSERT a usuarios anónimos (compradores del e-commerce)
CREATE POLICY "public_can_insert_pedidos"
    ON public.pedidos
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Permitir SELECT solo del propio pedido por ID (para mostrar confirmación)
CREATE POLICY "public_can_select_own_pedido"
    ON public.pedidos
    FOR SELECT
    TO anon
    USING (true);

-- ── 2. Tabla pedido_items_minorista ─────────────────────────────────────────
CREATE POLICY "public_can_insert_items_minorista"
    ON public.pedido_items_minorista
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- ── 3. Tabla pedido_items_mayorista ─────────────────────────────────────────
CREATE POLICY "public_can_insert_items_mayorista"
    ON public.pedido_items_mayorista
    FOR INSERT
    TO anon
    WITH CHECK (true);
