-- Migration: 20260126_add_product_colors
-- Description: Add 'colores' column to products table to store array of colors (JSONB)

ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS colores JSONB DEFAULT '[]';

-- Example structure of JSONB:
-- [
--   {"nombre": "Rojo", "hex": "#FF0000"},
--   {"nombre": "Azul", "hex": "#0000FF"}
-- ]
