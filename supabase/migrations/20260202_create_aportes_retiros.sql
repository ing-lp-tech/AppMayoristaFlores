-- ==========================================
-- TABLA: APORTES DE CAPITAL
-- ==========================================

-- Tipo ENUM para tipo de aporte
DO $$ BEGIN
    CREATE TYPE tipo_aporte_enum AS ENUM ('inicial', 'adicional', 'extraordinario');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.aportes_capital (
    id uuid default gen_random_uuid() primary key,
    dueno_id uuid references public.duenos(id) on delete restrict not null,
    
    -- Datos del aporte
    fecha_aporte date not null default current_date,
    monto numeric not null check (monto > 0),
    tipo_aporte tipo_aporte_enum not null,
    metodo text, -- 'efectivo', 'transferencia', etc.
    
    -- Detalles
    concepto text,
    notas text,
    comprobante_url text,
    
    -- Timestamps
    creado_en timestamptz default now(),
    creado_por uuid references public.usuarios_internos(id),
    
    -- Constraints
    constraint fecha_aporte_valida check (fecha_aporte <= current_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_aportes_dueno ON public.aportes_capital(dueno_id);
CREATE INDEX IF NOT EXISTS idx_aportes_fecha ON public.aportes_capital(fecha_aporte DESC);
CREATE INDEX IF NOT EXISTS idx_aportes_tipo ON public.aportes_capital(tipo_aporte);

-- ==========================================
-- TABLA: RETIROS DE CAPITAL
-- ==========================================

CREATE TABLE IF NOT EXISTS public.retiros_capital (
    id uuid default gen_random_uuid() primary key,
    dueno_id uuid references public.duenos(id) on delete restrict not null,
    
    -- Datos del retiro
    fecha_retiro date not null default current_date,
    monto numeric not null check (monto > 0),
    concepto text not null,
    metodo text, -- 'efectivo', 'transferencia', etc.
    
    -- Detalles
    notas text,
    comprobante_url text,
    
    -- Aprobación
    aprobado_por uuid references public.usuarios_internos(id),
    fecha_aprobacion timestamptz,
    
    -- Timestamps
    creado_en timestamptz default now(),
    creado_por uuid references public.usuarios_internos(id),
    
    -- Constraints
    constraint fecha_retiro_valida check (fecha_retiro <= current_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_retiros_dueno ON public.retiros_capital(dueno_id);
CREATE INDEX IF NOT EXISTS idx_retiros_fecha ON public.retiros_capital(fecha_retiro DESC);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- APORTES
ALTER TABLE public.aportes_capital ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access aportes"
    ON public.aportes_capital
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

CREATE POLICY "Dueno read own aportes"
    ON public.aportes_capital
    FOR SELECT
    USING (
        dueno_id IN (
            SELECT d.id FROM public.duenos d
            WHERE auth.role() = 'authenticated'
        )
    );

-- RETIROS
ALTER TABLE public.retiros_capital ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access retiros"
    ON public.retiros_capital
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

CREATE POLICY "Dueno read own retiros"
    ON public.retiros_capital
    FOR SELECT
    USING (
        dueno_id IN (
            SELECT d.id FROM public.duenos d
            WHERE auth.role() = 'authenticated'
        )
    );

-- Comentarios
COMMENT ON TABLE public.aportes_capital IS 'Registro de aportes de capital realizados por cada dueño';
COMMENT ON TABLE public.retiros_capital IS 'Registro de retiros de capital realizados por cada dueño';
COMMENT ON COLUMN public.retiros_capital.aprobado_por IS 'Usuario admin que aprobó el retiro';
