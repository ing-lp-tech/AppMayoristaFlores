-- ============================================================
-- RESINCRONIZACIÓN: stock_por_color a partir de lotes terminados
-- 
-- Problema: stock_por_color en producto_talles tiene valores
-- incorrectos (iguales por color) en vez de los del lote real.
--
-- Este script reconstruye el stock de cada talle por color
-- sumando las cantidades de TODOS los lotes terminados.
--
-- EJECUTAR CON CUIDADO: resetea y reconstruye stock_por_color.
-- El stock total del talle (columna stock) y de producto 
-- (stock_total) TAMBIÉN se recalcula.
-- ============================================================

-- PASO 1: Ver estado actual antes de modificar
SELECT
    p.nombre as producto,
    pt.talla_codigo,
    pt.stock,
    pt.stock_por_color
FROM producto_talles pt
JOIN productos p ON p.id = pt.producto_id
ORDER BY p.nombre, pt.orden;

-- ============================================================
-- PASO 2: Resetear stock_por_color a {} y stock a 0
-- (Solo para los talles de productos que tienen lotes terminados)
-- ============================================================
UPDATE producto_talles pt
SET 
    stock_por_color = '{}'::jsonb,
    stock = 0
WHERE pt.producto_id IN (
    SELECT DISTINCT lp.producto_id
    FROM lote_productos lp
    JOIN lotes_produccion lo ON lo.id = lp.lote_id
    WHERE lo.estado = 'terminado'
);

-- También resetear stock_total en productos afectados
UPDATE productos p
SET stock_total = 0
WHERE p.id IN (
    SELECT DISTINCT lp.producto_id
    FROM lote_productos lp
    JOIN lotes_produccion lo ON lo.id = lp.lote_id
    WHERE lo.estado = 'terminado'
);

-- ============================================================
-- PASO 3: Reconstruir stock_por_color sumando lotes terminados
-- 
-- tallas_distribucion tiene estructura JSON: { color: { talle_id: qty } }
-- Necesitamos sumar para cada (producto_id, talle_id, color) todas
-- las cantidades de lotes terminados.
-- ============================================================
DO $$
DECLARE
    lp_rec RECORD;
    color_key TEXT;
    talle_id UUID;
    qty NUMERIC;
    talle_dist JSONB;
BEGIN
    -- Iterar sobre todos los lote_productos con distribución de lotes terminados
    FOR lp_rec IN
        SELECT 
            lp.producto_id,
            lp.tallas_distribucion
        FROM lote_productos lp
        JOIN lotes_produccion lo ON lo.id = lp.lote_id
        WHERE lo.estado = 'terminado'
          AND lp.tallas_distribucion IS NOT NULL
          AND lp.tallas_distribucion != 'null'::jsonb
          AND lp.tallas_distribucion != '{}'::jsonb
    LOOP
        BEGIN
            -- Iterar sobre cada color en la distribución
            FOR color_key IN SELECT jsonb_object_keys(lp_rec.tallas_distribucion)
            LOOP
                talle_dist := lp_rec.tallas_distribucion -> color_key;
                
                -- Iterar sobre cada talle_id dentro del color
                FOR talle_id IN SELECT (jsonb_object_keys(talle_dist))::UUID
                LOOP
                    qty := (talle_dist ->> talle_id::text)::NUMERIC;
                    
                    IF qty IS NULL OR qty <= 0 THEN
                        CONTINUE;
                    END IF;

                    -- Verificar que el talle existe y pertenece al producto
                    IF NOT EXISTS (
                        SELECT 1 FROM producto_talles
                        WHERE id = talle_id AND producto_id = lp_rec.producto_id
                    ) THEN
                        CONTINUE;
                    END IF;

                    -- Acumular en stock_por_color
                    UPDATE producto_talles
                    SET stock_por_color = jsonb_set(
                        stock_por_color,
                        ARRAY[color_key],
                        to_jsonb(
                            COALESCE((stock_por_color ->> color_key)::NUMERIC, 0) + qty
                        )
                    )
                    WHERE id = talle_id AND producto_id = lp_rec.producto_id;

                    -- Acumular en stock total del talle
                    UPDATE producto_talles
                    SET stock = stock + qty
                    WHERE id = talle_id AND producto_id = lp_rec.producto_id;

                END LOOP;
            END LOOP;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Error procesando lote_producto para producto_id=%: %', lp_rec.producto_id, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================================
-- PASO 4: Resincronizar stock_total en productos
-- ============================================================
UPDATE productos p
SET stock_total = (
    SELECT COALESCE(SUM(pt.stock), 0)
    FROM producto_talles pt
    WHERE pt.producto_id = p.id
)
WHERE p.id IN (
    SELECT DISTINCT lp.producto_id
    FROM lote_productos lp
    JOIN lotes_produccion lo ON lo.id = lp.lote_id
    WHERE lo.estado = 'terminado'
);

-- ============================================================
-- PASO 5: Verificación final — comparar stock vs suma de colores
-- ============================================================
SELECT
    p.nombre as producto,
    pt.talla_codigo,
    pt.stock as stock_total_talle,
    pt.stock_por_color,
    (
        SELECT COALESCE(SUM(value::NUMERIC), 0)
        FROM jsonb_each_text(pt.stock_por_color)
    ) as suma_colores,
    CASE 
        WHEN pt.stock = (
            SELECT COALESCE(SUM(value::NUMERIC), 0)
            FROM jsonb_each_text(pt.stock_por_color)
        ) THEN '✅ OK'
        ELSE '❌ DESINCRONIZADO'
    END as estado
FROM producto_talles pt
JOIN productos p ON p.id = pt.producto_id
WHERE pt.stock > 0
ORDER BY p.nombre, pt.orden;
