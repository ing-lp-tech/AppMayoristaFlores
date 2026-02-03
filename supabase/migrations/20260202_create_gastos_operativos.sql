-- ==========================================
-- TABLA: GASTOS OPERATIVOS
-- ==========================================

-- Tipo ENUM para categorías de gastos
DO $$ BEGIN
    CREATE TYPE categoria_gasto_tipo AS ENUM (
        'alquiler',
        'servicios',
        'sueldos',
        'impuestos',
        'mantenimiento',
        'transporte',
        'marketing',
        'otros'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.gastos_operativos (
    id uuid default gen_random_uuid() primary key,
    dueno_id uuid references public.duenos(id) on delete restrict not null,
    
    -- Datos del gasto
    categoria categoria_gasto_tipo not null,
    concepto text not null,
    fecha_gasto date not null default current_date,
    monto numeric not null check (monto > 0),
    metodo_pago text, -- 'efectivo', 'transferencia', 'tarjeta', etc.
    
    -- Detalles
    descripcion text,
    notas text,
    comprobante_url text,
    es_recurrente boolean default false,
    
    -- Timestamps
    creado_en timestamptz default now(),
    actualizado_en timestamptz default now(),
    creado_por uuid references public.usuarios_internos(id),
    
    -- Constraints
    constraint fecha_gasto_valida check (fecha_gasto <= current_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_gastos_dueno ON public.gastos_operativos(dueno_id);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON public.gastos_operativos(categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos_operativos(fecha_gasto DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_recurrente ON public.gastos_operativos(es_recurrente) WHERE es_recurrente = true;

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_gastos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gastos_timestamp
    BEFORE UPDATE ON public.gastos_operativos
    FOR EACH ROW
    EXECUTE FUNCTION update_gastos_timestamp();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.gastos_operativos ENABLE ROW LEVEL SECURITY;

-- Admin puede ver y modificar todo
CREATE POLICY "Admin full access gastos"
    ON public.gastos_operativos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

-- Cada dueño solo puede ver sus propios gastos
CREATE POLICY "Dueno read own gastos"
    ON public.gastos_operativos
    FOR SELECT
    USING (
        dueno_id IN (
            SELECT d.id FROM public.duenos d
            WHERE auth.role() = 'authenticated'
        )
    );

-- Comentarios
COMMENT ON TABLE public.gastos_operativos IS 'Registro de gastos operativos de la tienda pagados por cada dueño';
COMMENT ON COLUMN public.gastos_operativos.es_recurrente IS 'Indica si el gasto se repite mensualmente (ej: alquiler, servicios)';
