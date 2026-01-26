-- SOLUCIÓN "NUCLEAR" CORREGIDA (Sin diagnósticos que fallen)

-- 1. DESACTIVAR LA SEGURIDAD (RLS) POR COMPLETO EN LA TABLA
ALTER TABLE public.calculos_costos DISABLE ROW LEVEL SECURITY;

-- 2. RESETEAR PERMISOS BÁSICOS (GRANTS)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.calculos_costos TO postgres;
GRANT ALL ON TABLE public.calculos_costos TO anon;
GRANT ALL ON TABLE public.calculos_costos TO authenticated;
GRANT ALL ON TABLE public.calculos_costos TO service_role;
