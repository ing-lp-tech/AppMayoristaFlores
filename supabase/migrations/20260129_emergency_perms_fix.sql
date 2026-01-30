-- EMERGENCY FIX: PERMISSION DENIED for lote_productos
-- The error "permission denied" often means the role lacks GRANT privileges, not just RLS policies.

-- 1. Grant explicit permissions to the tables
GRANT ALL ON TABLE public.lote_productos TO authenticated;
GRANT ALL ON TABLE public.lote_productos TO service_role;
GRANT ALL ON TABLE public.lote_productos TO anon;

GRANT ALL ON TABLE public.lotes_produccion TO authenticated;
GRANT ALL ON TABLE public.lotes_produccion TO service_role;
GRANT ALL ON TABLE public.lotes_produccion TO anon;

-- 2. RESET RLS Policies to be Publicly accessible (to rule out role issues)
ALTER TABLE public.lote_productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Emergency Access" ON public.lote_productos;
CREATE POLICY "Emergency Access" ON public.lote_productos FOR ALL TO public USING (true) WITH CHECK (true);

ALTER TABLE public.lotes_produccion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Emergency Access" ON public.lotes_produccion;
CREATE POLICY "Emergency Access" ON public.lotes_produccion FOR ALL TO public USING (true) WITH CHECK (true);

-- 3. Ensure 'productos' is also accessible (as it's joined)
GRANT ALL ON TABLE public.productos TO authenticated;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read all products" ON public.productos;
CREATE POLICY "Read all products" ON public.productos FOR SELECT TO public USING (true);
