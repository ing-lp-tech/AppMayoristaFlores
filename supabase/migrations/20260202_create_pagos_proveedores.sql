-- ==========================================
-- TABLA: PAGOS A PROVEEDORES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.pagos_proveedores (
    id uuid default gen_random_uuid() primary key,
    compra_id uuid references public.compras_proveedores(id) on delete restrict not null,
    dueno_id uuid references public.duenos(id) on delete restrict not null,
    
    -- Datos del pago
    fecha_pago date not null default current_date,
    monto numeric not null check (monto > 0),
    metodo_pago text not null, -- 'efectivo', 'transferencia', 'cheque', 'tarjeta'
    numero_comprobante text,
    
    -- Detalles
    notas text,
    comprobante_url text,
    
    -- Timestamps
    creado_en timestamptz default now(),
    creado_por uuid references public.usuarios_internos(id),
    
    -- Constraints
    constraint fecha_pago_valida check (fecha_pago <= current_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagos_compra ON public.pagos_proveedores(compra_id);
CREATE INDEX IF NOT EXISTS idx_pagos_dueno ON public.pagos_proveedores(dueno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON public.pagos_proveedores(fecha_pago DESC);

-- ==========================================
-- TRIGGER: Actualizar monto pagado en compra
-- ==========================================

CREATE OR REPLACE FUNCTION actualizar_monto_pagado_compra()
RETURNS TRIGGER AS $$
DECLARE
    total_pagado numeric;
    compra_total numeric;
BEGIN
    -- Calcular total pagado para esta compra
    SELECT COALESCE(SUM(monto), 0)
    INTO total_pagado
    FROM public.pagos_proveedores
    WHERE compra_id = COALESCE(NEW.compra_id, OLD.compra_id);
    
    -- Obtener monto total de la compra
    SELECT monto_total
    INTO compra_total
    FROM public.compras_proveedores
    WHERE id = COALESCE(NEW.compra_id, OLD.compra_id);
    
    -- Actualizar monto_pagado y estado en compras_proveedores
    UPDATE public.compras_proveedores
    SET 
        monto_pagado = total_pagado,
        estado_pago = CASE
            WHEN total_pagado = 0 THEN 'pendiente'::estado_pago_tipo
            WHEN total_pagado < compra_total THEN 'parcial'::estado_pago_tipo
            WHEN total_pagado >= compra_total THEN 'pagado'::estado_pago_tipo
        END,
        actualizado_en = now()
    WHERE id = COALESCE(NEW.compra_id, OLD.compra_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger en INSERT, UPDATE, DELETE
CREATE TRIGGER trigger_actualizar_monto_pagado_insert
    AFTER INSERT ON public.pagos_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_monto_pagado_compra();

CREATE TRIGGER trigger_actualizar_monto_pagado_update
    AFTER UPDATE ON public.pagos_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_monto_pagado_compra();

CREATE TRIGGER trigger_actualizar_monto_pagado_delete
    AFTER DELETE ON public.pagos_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_monto_pagado_compra();

-- ==========================================
-- VALIDACIÓN: No permitir pagos que excedan el monto pendiente
-- ==========================================

CREATE OR REPLACE FUNCTION validar_monto_pago()
RETURNS TRIGGER AS $$
DECLARE
    monto_pendiente_actual numeric;
BEGIN
    -- Obtener monto pendiente de la compra
    SELECT (monto_total - monto_pagado)
    INTO monto_pendiente_actual
    FROM public.compras_proveedores
    WHERE id = NEW.compra_id;
    
    -- Validar que el nuevo pago no exceda el pendiente
    IF NEW.monto > monto_pendiente_actual THEN
        RAISE EXCEPTION 'El monto del pago (%) excede el monto pendiente (%)', 
            NEW.monto, monto_pendiente_actual;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validar_monto_pago
    BEFORE INSERT OR UPDATE ON public.pagos_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION validar_monto_pago();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.pagos_proveedores ENABLE ROW LEVEL SECURITY;

-- Admin puede ver y modificar todo
CREATE POLICY "Admin full access pagos"
    ON public.pagos_proveedores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.usuarios_internos
            WHERE id = auth.uid()
            AND rol = 'admin'
        )
    );

-- Cada dueño solo puede ver sus propios pagos
CREATE POLICY "Dueno read own pagos"
    ON public.pagos_proveedores
    FOR SELECT
    USING (
        dueno_id IN (
            SELECT d.id FROM public.duenos d
            WHERE auth.role() = 'authenticated'
        )
    );

-- Comentarios
COMMENT ON TABLE public.pagos_proveedores IS 'Registro de pagos realizados a proveedores, vinculados a compras específicas';
COMMENT ON TRIGGER trigger_actualizar_monto_pagado_insert ON public.pagos_proveedores IS 'Actualiza automáticamente el monto pagado y estado de la compra';
