-- ==========================================
-- PASO 1: CONFIGURAR SUPER ADMIN
-- ==========================================
-- Esta migración asigna el rol de 'admin' a ing.lp.tech@gmail.com

-- Actualizar rol a admin
UPDATE public.usuarios_internos
SET roles = ARRAY['admin']::user_role[]
WHERE email = 'ing.lp.tech@gmail.com';

-- Si el usuario no existe en usuarios_internos, crearlo
-- (Esto puede pasar si te registraste pero no se sincronizó)
INSERT INTO public.usuarios_internos (id, email, roles, nombre)
SELECT 
    id, 
    email, 
    ARRAY['admin']::user_role[],
    COALESCE(raw_user_meta_data->>'name', email)
FROM auth.users
WHERE email = 'ing.lp.tech@gmail.com'
    AND NOT EXISTS (
        SELECT 1 FROM public.usuarios_internos 
        WHERE usuarios_internos.id = auth.users.id
    )
ON CONFLICT (id) DO UPDATE
SET roles = ARRAY['admin']::user_role[];

-- Verificar configuración
SELECT id, email, roles, nombre 
FROM public.usuarios_internos 
WHERE email = 'ing.lp.tech@gmail.com';

-- Mensaje de confirmación
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.usuarios_internos 
        WHERE email = 'ing.lp.tech@gmail.com' 
        AND 'admin' = ANY(roles)
    ) THEN
        RAISE NOTICE '✅ Usuario ing.lp.tech@gmail.com configurado como ADMIN exitosamente';
    ELSE
        RAISE WARNING '⚠️ No se pudo configurar el usuario como admin. Verifica que esté registrado.';
    END IF;
END $$;
