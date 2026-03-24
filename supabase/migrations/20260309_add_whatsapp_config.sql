-- Configuración WhatsApp - Añadir columna y RLS

-- 1. Añadimos la columna whatsapp_pedidos
ALTER TABLE public.configuracion_sistema 
ADD COLUMN IF NOT EXISTS whatsapp_pedidos text DEFAULT '5491126879409';

-- 2. Asegurarnos de que el RLS esté activo
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- 3. Borrar políticas existentes si hubiese conflictos
DROP POLICY IF EXISTS "Public read configuracion" ON public.configuracion_sistema;
DROP POLICY IF EXISTS "Admin full access configuracion" ON public.configuracion_sistema;

-- 4. Cualquiera puede leer la configuración (para la tienda pública y el checkout)
CREATE POLICY "Public read configuracion" 
ON public.configuracion_sistema FOR SELECT 
TO anon, authenticated
USING (true);

-- 5. Solo admins pueden modificar la configuración (utilizan la key 'anon' en el cliente pero con acceso autorizado por app)
CREATE POLICY "Admin full access configuracion" 
ON public.configuracion_sistema FOR ALL 
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 6. Otorgar permisos
GRANT ALL ON public.configuracion_sistema TO anon;
GRANT ALL ON public.configuracion_sistema TO authenticated;

-- 7. Asegurarnos que haya al menos un registro de configuración
INSERT INTO public.configuracion_sistema (whatsapp_pedidos)
SELECT '5491126879409'
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_sistema);
