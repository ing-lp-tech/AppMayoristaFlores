-- ==========================================
-- PASO 1: AGREGAR NUEVOS ROLES
-- ==========================================
-- Ejecuta este bloque primero y espera a que termine con éxito.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'cliente';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'owner';

-- FIN DEL PASO 1
