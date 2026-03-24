-- Agregar Foreign Key faltante a talle_id en pedido_items_minorista
-- Para que PostgREST (Supabase) pueda hacer el JOIN automático con producto_tallas

ALTER TABLE pedido_items_minorista
    ADD CONSTRAINT pedido_items_minorista_talle_id_fkey 
    FOREIGN KEY (talle_id) 
    REFERENCES producto_tallas(id)
    ON DELETE SET NULL;
