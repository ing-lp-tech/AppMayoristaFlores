-- Agregar columnas de color a pedido_items_minorista
-- Estas columnas son opcionales (nullable) para compatibilidad con pedidos existentes

ALTER TABLE pedido_items_minorista
    ADD COLUMN IF NOT EXISTS color_nombre TEXT,
    ADD COLUMN IF NOT EXISTS color_hex TEXT;

COMMENT ON COLUMN pedido_items_minorista.color_nombre IS 'Nombre del color elegido por el cliente (ej: Rojo, Azul Marino)';
COMMENT ON COLUMN pedido_items_minorista.color_hex IS 'Código hexadecimal del color elegido (ej: #FF0000)';
