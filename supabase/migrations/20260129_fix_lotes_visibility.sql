-- FIX: Add RLS policies for lotes_produccion
-- The user reported that lots are not visible in the browser, likely due to missing SELECT policies.

ALTER TABLE public.lotes_produccion ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow read for authenticated" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.lotes_produccion;

-- 2. Create permissive policies for Authenticated users
-- (Assumes all logged-in staff can view/edit production lots)

CREATE POLICY "Allow all for authenticated"
ON public.lotes_produccion
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Also fix lote_productos (Join table) just in case
ALTER TABLE public.lote_productos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON public.lote_productos;

CREATE POLICY "Allow all for authenticated"
ON public.lote_productos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Optional: Explicit Read Policy (redundant with ALL but good for clarity if we needed different write rules)
-- For now, "Allow all" covers SELECT, INSERT, UPDATE, DELETE.
