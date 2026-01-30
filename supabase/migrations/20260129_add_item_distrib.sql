-- Add tallas_distribucion to lote_productos to support multi-product lots separate logic
ALTER TABLE public.lote_productos 
ADD COLUMN IF NOT EXISTS tallas_distribucion JSONB DEFAULT '{}';

ALTER TABLE public.lote_productos 
ADD COLUMN IF NOT EXISTS cantidad_producto NUMERIC DEFAULT 0;

-- Optional: Allow public access to update this (since we use direct updates)
-- (The previous emergency fix granted ALL on lote_productos, so we are good)
