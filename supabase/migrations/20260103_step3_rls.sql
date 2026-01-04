-- ==========================================
-- PASO 3: ARREGLAR PERMISOS (RLS)
-- ==========================================
-- Ejecuta esto si tienes errores al intentar editar roles.

ALTER TABLE public.usuarios_internos ENABLE ROW LEVEL SECURITY;

-- 1. Permitir que todos los usuarios logueados vean la lista de usuarios
-- (Necesario para listar el equipo en el panel)
DROP POLICY IF EXISTS "Ver usuarios" ON public.usuarios_internos;
CREATE POLICY "Ver usuarios" ON public.usuarios_internos 
FOR SELECT USING (auth.role() = 'authenticated');

-- 2. Permitir que Dueños y Admins editen usuarios
-- Verificamos si el usuario que intenta hacer la acción tiene rol 'admin' u 'owner'
DROP POLICY IF EXISTS "Admin editar usuarios" ON public.usuarios_internos;
CREATE POLICY "Admin editar usuarios" ON public.usuarios_internos 
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_internos
    WHERE id = auth.uid()
    AND roles && ARRAY['admin', 'owner']::user_role[]
  )
);
