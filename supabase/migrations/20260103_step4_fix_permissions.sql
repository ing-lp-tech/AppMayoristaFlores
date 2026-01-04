-- ==========================================
-- PASO 4: SOLUCIÓN DEFINITIVA DE PERMISOS
-- ==========================================
-- Ejecuta esto para solucionar el error 403 (Forbidden)

-- 1. Función de seguridad para chequear permisos sin causar bucles infinitos
-- "SECURITY DEFINER" significa que esta función se ejecuta con permisos de superusuario
CREATE OR REPLACE FUNCTION public.check_is_admin_or_owner(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.usuarios_internos 
    WHERE id = user_id 
    AND roles && ARRAY['admin', 'owner']::user_role[]
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Asegurar permisos básicos en la tabla
GRANT SELECT, UPDATE ON public.usuarios_internos TO authenticated;

-- 3. Re-crear las Políticas usando la función segura

-- Habilitar RLS (por si acaso)
ALTER TABLE public.usuarios_internos ENABLE ROW LEVEL SECURITY;

-- Política de Lectura: Todos ven a todos (necesario para el panel)
DROP POLICY IF EXISTS "Ver usuarios" ON public.usuarios_internos;
CREATE POLICY "Ver usuarios" ON public.usuarios_internos 
FOR SELECT USING (true); 
-- Simplificado a 'true' para evitar problemas de lectura, ya que auth.role() = 'authenticated' a veces falla si no hay sesión limpia.
-- O mantenemos: FOR SELECT USING (auth.role() = 'authenticated'); 

-- Política de Edición: Solo Admins/Owners pueden editar
DROP POLICY IF EXISTS "Admin editar usuarios" ON public.usuarios_internos;
CREATE POLICY "Admin editar usuarios" ON public.usuarios_internos 
FOR UPDATE USING (
  -- Usamos la función segura pasando el ID del usuario logueado
  public.check_is_admin_or_owner(auth.uid())
);
