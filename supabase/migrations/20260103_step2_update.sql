-- ==========================================
-- PASO 2: ACTUALIZAR TABLAS Y USUARIOS
-- ==========================================
-- Ejecuta este bloque SOLO DESPUÉS de que el Paso 1 haya tenido éxito.

-- 1. Agregar columna de roles (lista)
ALTER TABLE public.usuarios_internos ADD COLUMN IF NOT EXISTS roles user_role[] DEFAULT ARRAY['cliente']::user_role[];

-- 2. Migrar datos antiguos (copiar rol simple a lista)
UPDATE public.usuarios_internos 
SET roles = ARRAY[rol] 
WHERE (roles IS NULL OR roles = ARRAY['cliente']::user_role[]) AND rol IS NOT NULL;

-- 3. Convertir Admins antiguos en Owners también
UPDATE public.usuarios_internos 
SET roles = array_append(roles, 'owner') 
WHERE rol = 'admin' AND NOT ('owner' = ANY(roles));

-- 4. BOOTSTRAP: Dar súper poderes a tu cuenta
-- Nota: Asegura todos los permisos para tu usuario principal
UPDATE public.usuarios_internos 
SET roles = ARRAY['owner', 'admin', 'produccion', 'ventas', 'inventario', 'contador', 'repositor', 'cortador', 'doblador']::user_role[]
WHERE email ILIKE '%ing.lp.tech%';

-- 5. Asegurar Default para el futuro
ALTER TABLE public.usuarios_internos ALTER COLUMN roles SET DEFAULT ARRAY['cliente']::user_role[];
