-- SCRIPT DE DIAGNÓSTICO Y CORRECCIÓN DE ROLES
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Ver qué usuario soy (funciona si lo corres desde la app via RPC, pero en SQL Editor auth.uid() es nulo a veces)
-- Mejor estrategia: Buscar por tu email y Forzar roles.

-- Reemplaza 'TU_EMAIL_AQUI' por el email con el que te logueaste (ej: el que sale en el sidebar)
-- Si no sabes exacto, este script intenta arreglar TODOS los usuarios que coincidan con 'admin' o 'owner'.

DO $$
DECLARE
    target_email TEXT := 'luisp@example.com'; -- CAMBIA ESTO SI POSEES EL EMAIL EXACTO
BEGIN
    -- Vamos a intentar sincronizar auth.users con usuarios_internos si falta
    INSERT INTO public.usuarios_internos (id, email, roles, nombre)
    SELECT id, email, ARRAY['owner','admin']::user_role[], 'Admin Recuperado'
    FROM auth.users
    WHERE NOT EXISTS (
        SELECT 1 FROM public.usuarios_internos WHERE usuarios_internos.id = auth.users.id
    );

    -- Actualizar roles a full acceso para todos los usuarios existentes
    UPDATE public.usuarios_internos
    SET roles = ARRAY['owner', 'admin', 'produccion', 'ventas', 'inventario']::user_role[]
    WHERE id IN (SELECT id FROM auth.users);
    
    -- Verificar si RLS está fallando por policies mal aplicadas
    -- Re-aplicar política de escritura explícita para asegurarse
END $$;

-- Verificamos los resultados
SELECT id, email, roles FROM public.usuarios_internos;
