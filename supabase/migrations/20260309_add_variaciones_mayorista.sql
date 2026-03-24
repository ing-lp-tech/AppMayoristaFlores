-- Agregar columna jsonb para guardar las variaciones de colores y talles dentro del pedido mayorista
ALTER TABLE public.pedido_items_mayorista 
ADD COLUMN IF NOT EXISTS variaciones jsonb DEFAULT '[]'::jsonb;
