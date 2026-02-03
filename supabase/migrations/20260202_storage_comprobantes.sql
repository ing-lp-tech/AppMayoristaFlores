-- ==========================================
-- CONFIGURACIÓN: SUPABASE STORAGE
-- Bucket para almacenar comprobantes de compras/pagos
-- ==========================================

-- 1. Crear el bucket "comprobantes" (si no existe)
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Políticas de Seguridad (RLS)

-- Política: Admin puede subir comprobantes
DROP POLICY IF EXISTS "Admin upload comprobantes" ON storage.objects;
CREATE POLICY "Admin upload comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'comprobantes' AND
    EXISTS (
        SELECT 1 FROM public.usuarios_internos
        WHERE id = auth.uid() AND 'admin' = ANY(roles)
    )
);

-- Política: Dueños pueden subir en su propia carpeta
DROP POLICY IF EXISTS "Duenos upload own comprobantes" ON storage.objects;
CREATE POLICY "Duenos upload own comprobantes"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'comprobantes' AND
    (storage.foldername(name))[1] IN (
        SELECT dueno_id::text 
        FROM public.usuarios_duenos 
        WHERE usuario_id = auth.uid()
    )
);

-- Política: Lectura pública (cualquiera puede ver)
DROP POLICY IF EXISTS "Public read comprobantes" ON storage.objects;
CREATE POLICY "Public read comprobantes"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comprobantes');

-- Política: Admin puede eliminar comprobantes
DROP POLICY IF EXISTS "Admin delete comprobantes" ON storage.objects;
CREATE POLICY "Admin delete comprobantes"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'comprobantes' AND
    EXISTS (
        SELECT 1 FROM public.usuarios_internos
        WHERE id = auth.uid() AND 'admin' = ANY(roles)
    )
);

-- Verificar políticas
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';
