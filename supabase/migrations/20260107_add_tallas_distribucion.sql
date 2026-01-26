-- Add tallas_distribucion column to lotes_produccion table
ALTER TABLE public.lotes_produccion 
ADD COLUMN IF NOT EXISTS tallas_distribucion JSONB DEFAULT '{}';

-- Optional: Update existing rows to have empty object instead of null if we enforced NOT NULL (which we don't strictly here but good practice)
UPDATE public.lotes_produccion 
SET tallas_distribucion = '{}' 
WHERE tallas_distribucion IS NULL;
