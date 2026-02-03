-- ==========================================
-- FUNCIONES FINANCIERAS
-- ==========================================

-- ==========================================
-- FUNCIÓN: Calcular saldo de un dueño
-- ==========================================
CREATE OR REPLACE FUNCTION calcular_saldo_dueno(p_dueno_id uuid)
RETURNS numeric AS $$
DECLARE
    total_aportes numeric;
    total_retiros numeric;
    total_compras numeric;
    total_gastos numeric;
    saldo_final numeric;
BEGIN
    -- Sumar aportes
    SELECT COALESCE(SUM(monto), 0)
    INTO total_aportes
    FROM public.aportes_capital
    WHERE dueno_id = p_dueno_id;
    
    -- Sumar retiros
    SELECT COALESCE(SUM(monto), 0)
    INTO total_retiros
    FROM public.retiros_capital
    WHERE dueno_id = p_dueno_id;
    
    -- Sumar compras pendientes (monto pendiente, no total)
    SELECT COALESCE(SUM(monto_pendiente), 0)
    INTO total_compras
    FROM public.compras_proveedores
    WHERE dueno_id = p_dueno_id;
    
    -- Sumar gastos
    SELECT COALESCE(SUM(monto), 0)
    INTO total_gastos
    FROM public.gastos_operativos
    WHERE dueno_id = p_dueno_id;
    
    -- Calcular saldo: Aportes - Retiros - Compras pendientes - Gastos
    saldo_final := total_aportes - total_retiros - total_compras - total_gastos;
    
    RETURN saldo_final;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FUNCIÓN RPC: Resumen financiero de un dueño
-- ==========================================
CREATE OR REPLACE FUNCTION get_resumen_financiero_dueno(
    p_dueno_id uuid,
    p_fecha_desde date DEFAULT NULL,
    p_fecha_hasta date DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    resultado json;
    fecha_desde_final date;
    fecha_hasta_final date;
BEGIN
    -- Establecer fechas por defecto si no se proporcionan
    fecha_desde_final := COALESCE(p_fecha_desde, '2000-01-01'::date);
    fecha_hasta_final := COALESCE(p_fecha_hasta, current_date);
    
    -- Construir JSON con resumen completo
    SELECT json_build_object(
        'dueno_id', p_dueno_id,
        'periodo', json_build_object(
            'desde', fecha_desde_final,
            'hasta', fecha_hasta_final
        ),
        'aportes', json_build_object(
            'total', COALESCE((
                SELECT SUM(monto)
                FROM public.aportes_capital
                WHERE dueno_id = p_dueno_id
                AND fecha_aporte BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0),
            'cantidad', COALESCE((
                SELECT COUNT(*)
                FROM public.aportes_capital
                WHERE dueno_id = p_dueno_id
                AND fecha_aporte BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0)
        ),
        'retiros', json_build_object(
            'total', COALESCE((
                SELECT SUM(monto)
                FROM public.retiros_capital
                WHERE dueno_id = p_dueno_id
                AND fecha_retiro BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0),
            'cantidad', COALESCE((
                SELECT COUNT(*)
                FROM public.retiros_capital
                WHERE dueno_id = p_dueno_id
                AND fecha_retiro BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0)
        ),
        'compras', json_build_object(
            'total', COALESCE((
                SELECT SUM(monto_total)
                FROM public.compras_proveedores
                WHERE dueno_id = p_dueno_id
                AND fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0),
            'pagado', COALESCE((
                SELECT SUM(monto_pagado)
                FROM public.compras_proveedores
                WHERE dueno_id = p_dueno_id
                AND fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0),
            'pendiente', COALESCE((
                SELECT SUM(monto_pendiente)
                FROM public.compras_proveedores
                WHERE dueno_id = p_dueno_id
                AND fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0),
            'cantidad', COALESCE((
                SELECT COUNT(*)
                FROM public.compras_proveedores
                WHERE dueno_id = p_dueno_id
                AND fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0)
        ),
        'pagos', json_build_object(
            'total', COALESCE((
                SELECT SUM(monto)
                FROM public.pagos_proveedores
                WHERE dueno_id = p_dueno_id
                AND fecha_pago BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0),
            'cantidad', COALESCE((
                SELECT COUNT(*)
                FROM public.pagos_proveedores
                WHERE dueno_id = p_dueno_id
                AND fecha_pago BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0)
        ),
        'gastos', json_build_object(
            'total', COALESCE((
                SELECT SUM(monto)
                FROM public.gastos_operativos
                WHERE dueno_id = p_dueno_id
                AND fecha_gasto BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0),
            'cantidad', COALESCE((
                SELECT COUNT(*)
                FROM public.gastos_operativos
                WHERE dueno_id = p_dueno_id
                AND fecha_gasto BETWEEN fecha_desde_final AND fecha_hasta_final
            ), 0),
            'por_categoria', COALESCE((
                SELECT json_object_agg(categoria, total)
                FROM (
                    SELECT categoria, SUM(monto) as total
                    FROM public.gastos_operativos
                    WHERE dueno_id = p_dueno_id
                    AND fecha_gasto BETWEEN fecha_desde_final AND fecha_hasta_final
                    GROUP BY categoria
                ) sub
            ), '{}'::json)
        ),
        'saldo_actual', calcular_saldo_dueno(p_dueno_id)
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FUNCIÓN RPC: Resumen consolidado de todos los dueños
-- ==========================================
CREATE OR REPLACE FUNCTION get_resumen_consolidado(
    p_fecha_desde date DEFAULT NULL,
    p_fecha_hasta date DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    resultado json;
    fecha_desde_final date;
    fecha_hasta_final date;
BEGIN
    fecha_desde_final := COALESCE(p_fecha_desde, '2000-01-01'::date);
    fecha_hasta_final := COALESCE(p_fecha_hasta, current_date);
    
    SELECT json_build_object(
        'periodo', json_build_object(
            'desde', fecha_desde_final,
            'hasta', fecha_hasta_final
        ),
        'por_dueno', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'dueno', json_build_object(
                        'id', d.id,
                        'nombre', d.nombre || ' ' || d.apellido,
                        'color', d.color_identificador
                    ),
                    'resumen', get_resumen_financiero_dueno(d.id, fecha_desde_final, fecha_hasta_final)
                )
            )
            FROM public.duenos d
            WHERE d.activo = true
            ORDER BY d.nombre
        ), '[]'::json),
        'totales', json_build_object(
            'aportes', COALESCE((SELECT SUM(monto) FROM public.aportes_capital WHERE fecha_aporte BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'retiros', COALESCE((SELECT SUM(monto) FROM public.retiros_capital WHERE fecha_retiro BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'compras', COALESCE((SELECT SUM(monto_total) FROM public.compras_proveedores WHERE fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'pendiente', COALESCE((SELECT SUM(monto_pendiente) FROM public.compras_proveedores WHERE fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'gastos', COALESCE((SELECT SUM(monto) FROM public.gastos_operativos WHERE fecha_gasto BETWEEN fecha_desde_final AND fecha_hasta_final), 0)
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- FUNCIÓN: Obtener deudas pendientes por proveedor
-- ==========================================
CREATE OR REPLACE FUNCTION get_deudas_por_proveedor(p_dueno_id uuid DEFAULT NULL)
RETURNS TABLE (
    proveedor_id uuid,
    proveedor_nombre text,
    total_compras numeric,
    total_pagado numeric,
    total_pendiente numeric,
    cantidad_compras bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        prov.id as proveedor_id,
        prov.nombre as proveedor_nombre,
        COALESCE(SUM(cp.monto_total), 0) as total_compras,
        COALESCE(SUM(cp.monto_pagado), 0) as total_pagado,
        COALESCE(SUM(cp.monto_pendiente), 0) as total_pendiente,
        COUNT(cp.id) as cantidad_compras
    FROM public.proveedores prov
    LEFT JOIN public.compras_proveedores cp ON cp.proveedor_id = prov.id
    WHERE 
        (p_dueno_id IS NULL OR cp.dueno_id = p_dueno_id)
        AND cp.monto_pendiente > 0
    GROUP BY prov.id, prov.nombre
    HAVING SUM(cp.monto_pendiente) > 0
    ORDER BY total_pendiente DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION calcular_saldo_dueno IS 'Calcula el saldo financiero actual de un dueño (aportes - retiros - compras pendientes - gastos)';
COMMENT ON FUNCTION get_resumen_financiero_dueno IS 'Retorna un resumen financiero completo de un dueño en formato JSON para un período específico';
COMMENT ON FUNCTION get_resumen_consolidado IS 'Retorna un resumen financiero consolidado de todos los dueños activos';
COMMENT ON FUNCTION get_deudas_por_proveedor IS 'Lista las deudas pendientes agrupadas por proveedor, opcionalmente filtradas por dueño';
