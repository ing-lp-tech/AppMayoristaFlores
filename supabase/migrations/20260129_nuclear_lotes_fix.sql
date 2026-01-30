-- "NUCLEAR" FIX: Wipe all RLS policies for lotes_produccion and start fresh.
-- Use this if the previous fix did not work.

-- 1. Disable RLS momentarily to clear slate (optional but cleaner)
ALTER TABLE public.lotes_produccion DISABLE ROW LEVEL SECURITY;

-- 2. Drop EVERY known policy we might have created (brute force)
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Enable all" ON public.lotes_produccion;
DROP POLICY IF EXISTS "Allow read/write" ON public.lotes_produccion;

-- 3. Re-enable RLS
ALTER TABLE public.lotes_produccion ENABLE ROW LEVEL SECURITY;

-- 4. Create ONE single, simple policy for everything
CREATE POLICY "Allow all for authenticated"
ON public.lotes_produccion
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Repeat for lote_productos
ALTER TABLE public.lote_productos DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.lote_productos;
ALTER TABLE public.lote_productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated"
ON public.lote_productos
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
