-- Agregar política UPDATE para que anon pueda actualizar el preference_id de MP
CREATE POLICY "public_can_update_pedido_mp"
    ON public.pedidos
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (true);

-- Grant explícito de UPDATE
GRANT UPDATE ON public.pedidos TO anon;
