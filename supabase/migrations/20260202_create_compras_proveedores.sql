-- ==========================================
-- TABLA: COMPRAS A PROVEEDORES
-- ==========================================

-- Tipo ENUM para estado de pago
DO $$ BEGIN
    CREATE TYPE estado_pago_tipo AS ENUM ('pendiente', 'parcial', 'pagado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.compras_proveedores (
    id uuid default gen_random_uuid() primary key,
    dueno_id uuid references public.duenos(id) on delete restrict not null,
    proveedor_id uuid references public.proveedores(id) on delete restrict not null,
    
    -- Datos de la compra
    codigo_compra text unique not null,
    fecha_compra date not null default current_date,
    fecha_vencimiento date,
    
    -- Montos
    monto_total numeric not null check (monto_total >= 0),
    monto_pagado numeric default 0 check (monto_pagado >= 0),
    monto_pendiente numeric generated always as (monto_total - monto_pagado) stored,
    
    -- Estado
    estado_pago estado_pago_tipo default 'pendiente',
    metodo_pago text, -- 'efectivo', 'transferencia', 'cheque', etc.
    
    -- Detalles
    descripcion text,
    items jsonb, -- Array de items: [{descripcion, cantidad, precio_unitario}]
    notas text,
    comprobante_url text,
    
    -- Timestamps
    creado_en timestamptz default now(),
    actualizado_en timestamptz default now(),
    creado_por uuid references public.usuarios_internos(id),
    
    -- Constraints
    constraint monto_pagado_no_excede_total check (monto_pagado <= monto_total),
    constraint fecha_vencimiento_posterior check (fecha_vencimiento is null or fecha_vencimiento >= fecha_compra)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_compras_dueno ON public.compras_proveedores(dueno_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON public.compras_proveedores(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON public.compras_proveedores(estado_pago);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON public.compras_proveedores(fecha_compra DESC);

-- Función para generar código único de compra
CREATE OR REPLACE FUNCTION generar_codigo_compra()
RETURNS text AS $$
DECLARE
    nuevo_codigo text;
    existe boolean;
BEGIN
    LOOP
        -- Formato: COMP-YYYYMMDD-XXXX
        nuevo_codigo := 'COMP-' || to_char(current_date, 'YYYYMMDD') || '-' || 
                       lpad(floor(random() * 9999)::text, 4, '0');
        
        -- Verificar si ya existe
        SELECT EXISTS(SELECT 1 FROM public.compras_proveedores WHERE codigo_compra = nuevo_codigo) INTO existe;
        
        EXIT WHEN NOT existe;
    END LOOP;
    
    RETURN nuevo_codigo;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar código automáticamente si no se proporciona
CREATE OR REPLACE FUNCTION set_codigo_compra()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_compra IS NULL OR NEW.codigo_compra = '' THEN
        NEW.codigo_compra := generar_codigo_compra();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_codigo_compra
    BEFORE INSERT ON public.compras_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION set_codigo_compra();

-- Trigger para actualizar timestamp
CREATE OR REPLACE FUNCTION update_compras_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_compras_timestamp
    BEFORE UPDATE ON public.compras_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION update_compras_timestamp();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.compras_proveedores ENABLE ROW LEVEL SECURITY;

-- Admin puede ver y modificar todo
CREATE POLICY "Admin full access compras"
    ON public.compras_proveedores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

-- Cada dueño solo puede ver sus propias compras
CREATE POLICY "Dueno read own compras"
    ON public.compras_proveedores
    FOR SELECT
    USING (
        dueno_id IN (
            SELECT d.id FROM public.duenos d
            -- Aquí necesitaremos una tabla de relación usuario<->dueno
            -- Por ahora, permitimos a usuarios autenticados
            WHERE auth.role() = 'authenticated'
        )
    );

-- Comentarios
COMMENT ON TABLE public.compras_proveedores IS 'Registro de compras realizadas a proveedores por cada dueño';
COMMENT ON COLUMN public.compras_proveedores.items IS 'Array JSON de items de la compra: [{descripcion, cantidad, precio_unitario, subtotal}]';
