-- 1. Agregar la columna producto_id para diferenciar productos en el mismo lote
ALTER TABLE public.calculos_costos 
ADD COLUMN IF NOT EXISTS producto_id uuid REFERENCES public.productos(id);

-- 2. Asegurar que no haya restriccion de unicidad en lote_id 
-- (Esto permite tener múltiples cálculos/historial para el mismo lote)
-- Si tienes un error de "duplicate key" al guardar, ejecuta esto:
-- ALTER TABLE public.calculos_costos DROP CONSTRAINT IF EXISTS calculos_costos_lote_id_key;
