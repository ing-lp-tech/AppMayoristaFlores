-- ============================================================
-- Migración: Corrección del trigger de stock y permisos RLS
-- Fecha: 2026-03-11
-- ============================================================

-- 1. Asegurar permisos de UPDATE en pedidos para usuarios autenticados
GRANT UPDATE ON public.pedidos TO authenticated;

-- 2. Actualizar la función descontar_stock_al_entregar con:
--    - SECURITY DEFINER: para evitar bloqueos de RLS al modificar productos/talles
--    - COALESCE en stock_por_color: para manejar JSONBs nulos o claves ausentes sin fallar silenciosamente

CREATE OR REPLACE FUNCTION public.descontar_stock_al_entregar()
RETURNS TRIGGER AS $$
DECLARE
    item_minorista RECORD;
    item_mayorista RECORD;
    v_variacion jsonb;
    v_color_nombre text;
    v_talle_codigo text;
    v_cantidad numeric;
    v_talle_id uuid;
    v_talle_nombre text;
    v_usuario_id uuid;
BEGIN
    -- Solo ejecutar si el estado cambia A 'entregado'
    IF (NEW.estado = 'entregado' AND OLD.estado IS DISTINCT FROM 'entregado') THEN

        -- Obtener el usuario del contexto de auth
        v_usuario_id := auth.uid();

        -- =============================================
        -- PROCESAR ITEMS MINORISTAS
        -- =============================================
        FOR item_minorista IN
            SELECT * FROM pedido_items_minorista WHERE pedido_id = NEW.id
        LOOP
            -- 1a. Descontar del stock total del producto
            UPDATE productos
            SET stock_total = GREATEST(0, stock_total - item_minorista.cantidad)
            WHERE id = item_minorista.producto_id;

            -- 1b. Descontar del stock global del talle y capturar el código
            UPDATE producto_talles
            SET stock = GREATEST(0, stock - item_minorista.cantidad)
            WHERE id = item_minorista.talle_id
            RETURNING talla_codigo INTO v_talle_nombre;

            -- 1c. Si hay color, descontar del JSONB y registrar historial
            IF item_minorista.color_nombre IS NOT NULL THEN
                UPDATE producto_talles
                SET stock_por_color = jsonb_set(
                    COALESCE(stock_por_color, '{}'::jsonb),
                    ARRAY[item_minorista.color_nombre],
                    to_jsonb(
                        GREATEST(
                            0,
                            (COALESCE(stock_por_color ->> item_minorista.color_nombre, '0'))::int
                            - item_minorista.cantidad::int
                        )
                    )
                )
                WHERE id = item_minorista.talle_id;

                INSERT INTO public.movimientos_stock_productos (
                    tipo_movimiento, producto_id, talle_id, talle, color,
                    cantidad, referencia_tipo, referencia_id, usuario_id
                ) VALUES (
                    'salida_venta',
                    item_minorista.producto_id,
                    item_minorista.talle_id,
                    COALESCE(v_talle_nombre, '?'),
                    item_minorista.color_nombre,
                    item_minorista.cantidad,
                    'pedido',
                    NEW.id,
                    v_usuario_id
                );
            END IF;
        END LOOP;

        -- =============================================
        -- PROCESAR ITEMS MAYORISTAS
        -- =============================================
        FOR item_mayorista IN
            SELECT * FROM pedido_items_mayorista WHERE pedido_id = NEW.id
        LOOP
            IF item_mayorista.variaciones IS NOT NULL
               AND jsonb_typeof(item_mayorista.variaciones) = 'array'
            THEN
                FOR v_variacion IN
                    SELECT * FROM jsonb_array_elements(item_mayorista.variaciones)
                LOOP
                    v_talle_codigo := v_variacion ->> 'talle';
                    v_color_nombre := v_variacion -> 'color' ->> 'nombre';
                    v_cantidad     := (v_variacion ->> 'cantidad')::numeric;

                    SELECT id INTO v_talle_id
                    FROM producto_talles
                    WHERE producto_id = item_mayorista.producto_id
                      AND talla_codigo = v_talle_codigo
                    LIMIT 1;

                    IF v_talle_id IS NOT NULL THEN
                        -- Descontar del talle
                        UPDATE producto_talles
                        SET stock = GREATEST(0, stock - v_cantidad)
                        WHERE id = v_talle_id;

                        -- Descontar del producto global
                        UPDATE productos
                        SET stock_total = GREATEST(0, stock_total - v_cantidad)
                        WHERE id = item_mayorista.producto_id;

                        -- Descontar del JSONB de colores (con COALESCE para clave ausente)
                        IF v_color_nombre IS NOT NULL THEN
                            UPDATE producto_talles
                            SET stock_por_color = jsonb_set(
                                COALESCE(stock_por_color, '{}'::jsonb),
                                ARRAY[v_color_nombre],
                                to_jsonb(
                                    GREATEST(
                                        0,
                                        (COALESCE(stock_por_color ->> v_color_nombre, '0'))::int
                                        - v_cantidad::int
                                    )
                                )
                            )
                            WHERE id = v_talle_id;
                        END IF;

                        -- Registrar en historial
                        INSERT INTO public.movimientos_stock_productos (
                            tipo_movimiento, producto_id, talle_id, talle, color,
                            cantidad, referencia_tipo, referencia_id, usuario_id
                        ) VALUES (
                            'salida_venta',
                            item_mayorista.producto_id,
                            v_talle_id,
                            COALESCE(v_talle_codigo, '?'),
                            COALESCE(v_color_nombre, 'Sin Color'),
                            v_cantidad,
                            'pedido',
                            NEW.id,
                            v_usuario_id
                        );
                    END IF;
                END LOOP;
            END IF;
        END LOOP;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Confirmar que el trigger está asociado (por si acaso se perdió)
DROP TRIGGER IF EXISTS trigger_descontar_stock_entregado ON public.pedidos;
CREATE TRIGGER trigger_descontar_stock_entregado
    AFTER UPDATE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION public.descontar_stock_al_entregar();
