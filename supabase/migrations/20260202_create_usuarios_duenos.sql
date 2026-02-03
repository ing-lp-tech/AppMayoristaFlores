-- ==========================================
-- TABLA: RELACIÓN USUARIOS ↔ DUEÑOS
-- ==========================================
-- Esta tabla vincula usuarios de Supabase Auth con registros en la tabla duenos

CREATE TABLE IF NOT EXISTS public.usuarios_duenos (
    usuario_id uuid NOT NULL REFERENCES public.usuarios_internos(id) ON DELETE CASCADE,
    dueno_id uuid NOT NULL REFERENCES public.duenos(id) ON DELETE CASCADE,
    creado_en timestamptz DEFAULT now(),
    creado_por uuid REFERENCES public.usuarios_internos(id),
    
    -- Constraint: un usuario solo puede estar vinculado a un dueño
    PRIMARY KEY (usuario_id, dueno_id),
    
    -- Constraint: un dueño solo puede tener un usuario
    UNIQUE (dueno_id)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_usuarios_duenos_usuario ON public.usuarios_duenos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_duenos_dueno ON public.usuarios_duenos(dueno_id);

-- ==========================================
-- FUNCIÓN HELPER: Obtener dueño del usuario actual
-- ==========================================
CREATE OR REPLACE FUNCTION get_dueno_id_from_user()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT dueno_id 
    FROM public.usuarios_duenos 
    WHERE usuario_id = auth.uid()
    LIMIT 1;
$$;

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.usuarios_duenos ENABLE ROW LEVEL SECURITY;

-- Admin puede ver y modificar todo
CREATE POLICY "Admin full access usuarios_duenos"
    ON public.usuarios_duenos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND 'admin' = ANY(roles)
        )
    );

-- Usuarios pueden ver su propia relación
CREATE POLICY "Users read own dueno relation"
    ON public.usuarios_duenos
    FOR SELECT
    USING (usuario_id = auth.uid());

-- Comentarios para documentación
COMMENT ON TABLE public.usuarios_duenos IS 
    'Tabla de relación entre usuarios de Supabase Auth y registros de dueños. Un usuario puede ser dueño, y cada dueño tiene un usuario asociado.';

COMMENT ON COLUMN public.usuarios_duenos.usuario_id IS 
    'ID del usuario en auth.users y usuarios_internos';

COMMENT ON COLUMN public.usuarios_duenos.dueno_id IS 
    'ID del dueño en la tabla duenos';
