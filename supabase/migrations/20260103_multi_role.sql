-- ==========================================
-- MIGRATION: MULTI-ROLE SUPPORT & OWNER BOOTSTRAP
-- ==========================================

-- 1. Add new roles to the ENUM (if they don't exist)
-- Note: 'cliente' and 'owner' might need to be added. 
-- Since we can't easily check existence in a simple script without PL/pgSQL blocks sometimes, 
-- we use the standard approach or just try/catch if running line by line.
-- In Supabase SQL Editor, you can just run these:

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cliente';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';

-- 2. Modify usuarios_internos table
-- Add the new column
ALTER TABLE public.usuarios_internos ADD COLUMN IF NOT EXISTS roles user_role[] DEFAULT ARRAY['cliente']::user_role[];

-- Migrate data (Copy 'rol' to 'roles')
UPDATE public.usuarios_internos 
SET roles = ARRAY[rol] 
WHERE roles = ARRAY['cliente']::user_role[] AND rol IS NOT NULL;

-- Make existing Admins also Owners (Optional, but good for migration)
UPDATE public.usuarios_internos 
SET roles = array_append(roles, 'owner') 
WHERE rol = 'admin' AND NOT ('owner' = ANY(roles));

-- Safe Drop of old column (Only run if you are sure logic is updated)
-- ALTER TABLE public.usuarios_internos DROP COLUMN rol;

-- 3. BOOTSTRAP OWNER ACCOUNT
-- Update the specific user (ing.lp.tech) to have full access
UPDATE public.usuarios_internos 
SET roles = ARRAY['owner', 'admin', 'produccion', 'ventas', 'inventario']::user_role[]
WHERE email ILIKE '%ing.lp.tech%';

-- 4. Set Default for future inserts
ALTER TABLE public.usuarios_internos ALTER COLUMN roles SET DEFAULT ARRAY['cliente']::user_role[];
