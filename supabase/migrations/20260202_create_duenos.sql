-- ==========================================
-- TABLA: DUEÑOS/SOCIOS DE LA TIENDA
-- ==========================================

CREATE TABLE IF NOT EXISTS public.duenos (
    id uuid default gen_random_uuid() primary key,
    nombre text not null,
    apellido text not null,
    dni text unique not null,
    telefono_whatsapp text not null,
    email text,
    porcentaje_participacion numeric check (porcentaje_participacion >= 0 and porcentaje_participacion <= 100),
    activo boolean default true,
    color_identificador text default '#3B82F6', -- Color para UI (azul por defecto)
    fecha_incorporacion date default current_date,
    notas text,
    creado_en timestamptz default now(),
    actualizado_en timestamptz default now(),
    
    -- Constraints
    constraint dni_valido check (length(dni) >= 7 and length(dni) <= 10),
    constraint telefono_valido check (length(telefono_whatsapp) >= 10)
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_duenos_activo ON public.duenos(activo);
CREATE INDEX IF NOT EXISTS idx_duenos_dni ON public.duenos(dni);

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_duenos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_duenos_timestamp
    BEFORE UPDATE ON public.duenos
    FOR EACH ROW
    EXECUTE FUNCTION update_duenos_timestamp();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.duenos ENABLE ROW LEVEL SECURITY;

-- Super Admin puede ver todos los dueños
CREATE POLICY "Admin full access duenos"
    ON public.duenos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

-- Dueños pueden ver solo su propio registro
-- Nota: Necesitaremos crear una tabla de relación usuario_interno <-> dueno
-- Por ahora, permitimos lectura a usuarios autenticados para el panel admin
CREATE POLICY "Authenticated read duenos"
    ON public.duenos
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Comentarios para documentación
COMMENT ON TABLE public.duenos IS 'Tabla de dueños/socios de la tienda con información completa';
COMMENT ON COLUMN public.duenos.color_identificador IS 'Color hexadecimal para identificación visual en la UI';
COMMENT ON COLUMN public.duenos.porcentaje_participacion IS 'Porcentaje de participación en la sociedad (0-100)';
