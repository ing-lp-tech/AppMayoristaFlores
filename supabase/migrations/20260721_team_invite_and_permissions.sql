-- ==========================================
-- INVITAR MIEMBROS + PERMISOS GRANULARES POR USUARIO
-- ==========================================
-- 1) Permite que un admin/owner cree filas nuevas en usuarios_internos
--    (hasta ahora solo existian policies de SELECT y UPDATE, por eso
--    el alta de un usuario nuevo fallaba silenciosamente).
-- 2) Agrega una columna "permisos" para poder otorgar, por usuario individual,
--    acceso granular (ver / editar / eliminar) a un modulo del panel,
--    sin depender unicamente del rol.

-- 1. Columna de permisos granulares por modulo
ALTER TABLE public.usuarios_internos
    ADD COLUMN IF NOT EXISTS permisos jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.usuarios_internos.permisos IS
    'Permisos granulares por modulo, ej: {"produccion": {"ver": true, "editar": true, "eliminar": false}}. Si un modulo no tiene entrada aca, se usa el acceso por rol (comportamiento legacy). Owner/Admin siempre tienen acceso total.';

-- 2. Permitir INSERT a usuarios autenticados (la policy de abajo restringe quien puede)
GRANT INSERT ON public.usuarios_internos TO authenticated;

-- 3. Solo admin/owner pueden crear nuevos miembros del equipo
DROP POLICY IF EXISTS "Admin crear usuarios" ON public.usuarios_internos;
CREATE POLICY "Admin crear usuarios" ON public.usuarios_internos
FOR INSERT WITH CHECK (
    public.check_is_admin_or_owner(auth.uid())
);
