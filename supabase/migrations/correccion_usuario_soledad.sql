-- 1. Actualizar Color del Avatar (Tabla duenos)
UPDATE public.duenos 
SET color_identificador = '#E91E63' 
WHERE email = 's.sotosiles@gmail.com';

-- 2. Actualizar Rol a Dueño/Socio (Tabla usuarios_internos)
-- Esto quitará el rol 'admin' y dejará solo 'owner'
UPDATE public.usuarios_internos
SET roles = ARRAY['owner']::user_role[]
WHERE email = 's.sotosiles@gmail.com';

-- 3. Verificación (Opcional)
SELECT email, roles FROM public.usuarios_internos WHERE email = 's.sotosiles@gmail.com';
SELECT email, color_identificador FROM public.duenos WHERE email = 's.sotosiles@gmail.com';
