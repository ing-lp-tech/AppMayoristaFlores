-- ============================================================
-- CORRECCIÓN: Stock 172 → 168 por producto (Lote 0001)
-- El stock quedó en 172 pero el lote produjo 168 prendas reales.
-- Se reduce proporcionalmente cada talla de ambos productos.
-- ============================================================

-- PASO 1: Ver estado actual (verificación previa)
SELECT 
    p.nombre as producto,
    p.codigo,
    pt.talla_codigo,
    pt.stock,
    pt.id as talle_id
FROM producto_talles pt
JOIN productos p ON p.id = pt.producto_id
WHERE p.codigo IN ('CT9NI', 'D001')
ORDER BY p.codigo, pt.talla_codigo;

-- ============================================================
-- PASO 2: Corregir el stock — escalar de 172 a 168 proporcionalmente
-- Formula: nuevo_stock = FLOOR(stock_actual * 168.0 / 172.0)
-- Se usa FLOOR para no exceder nunca las 168 unidades totales.
-- ============================================================

UPDATE producto_talles pt
SET stock = FLOOR(pt.stock * 168.0 / 172.0)
WHERE pt.producto_id IN (
    SELECT id FROM productos WHERE codigo IN ('CT9NI', 'D001')
)
AND pt.stock > 0;

-- ============================================================
-- PASO 3: Re-sincronizar stock_total en la tabla productos
-- ============================================================
UPDATE productos
SET stock_total = (
    SELECT COALESCE(SUM(pt.stock), 0)
    FROM producto_talles pt
    WHERE pt.producto_id = productos.id
)
WHERE codigo IN ('CT9NI', 'D001');

-- ============================================================
-- VERIFICACIÓN FINAL
-- ============================================================
SELECT 
    p.nombre as producto,
    p.codigo,
    p.stock_total as total_producto,
    pt.talla_codigo,
    pt.stock
FROM producto_talles pt
JOIN productos p ON p.id = pt.producto_id
WHERE p.codigo IN ('CT9NI', 'D001')
ORDER BY p.codigo, pt.talla_codigo;
