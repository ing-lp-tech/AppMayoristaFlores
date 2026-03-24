-- Fix: cupones_descuento RLS permissions
-- El error "permission denied for table cupones_descuento" ocurre porque las políticas
-- anteriores no estaban aplicadas correctamente o la tabla no existía todavía.

-- 1. Asegurarse de que la tabla exista
CREATE TABLE IF NOT EXISTS public.cupones_descuento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descuento_porcentaje NUMERIC(5,2) NOT NULL CHECK (descuento_porcentaje > 0 AND descuento_porcentaje <= 100),
    fecha_expiracion TIMESTAMP WITH TIME ZONE NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.cupones_descuento ENABLE ROW LEVEL SECURITY;

-- 3. Borrar políticas existentes para evitar duplicados
DROP POLICY IF EXISTS "Cupones visibles para todos" ON public.cupones_descuento;
DROP POLICY IF EXISTS "Admins gestionan cupones" ON public.cupones_descuento;
DROP POLICY IF EXISTS "cupones_select_public" ON public.cupones_descuento;
DROP POLICY IF EXISTS "cupones_all_anon" ON public.cupones_descuento;

-- 4. Política: cualquiera puede leer todos los cupones (activos e inactivos, para el panel admin)
CREATE POLICY "cupones_select_public"
ON public.cupones_descuento FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Política: anon y authenticated pueden hacer INSERT, UPDATE, DELETE (admin panel usa anon key)
CREATE POLICY "cupones_all_anon"
ON public.cupones_descuento FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Asegurarse de que anon tiene permiso de acceso a la tabla
GRANT ALL ON public.cupones_descuento TO anon;
GRANT ALL ON public.cupones_descuento TO authenticated;
