-- Agregar columnas faltantes en la tabla pedidos
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS notas text;

COMMENT ON COLUMN public.pedidos.notas IS 'Notas adicionales del pedido o datos internos del mayorista';
