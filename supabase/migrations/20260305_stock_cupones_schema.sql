-- Migración para añadir soporte de stock por color y tabla de cupones

-- 1. Añadir columna JSONB de stock por color a producto_talles
ALTER TABLE public.producto_talles
ADD COLUMN IF NOT EXISTS stock_por_color JSONB DEFAULT '{}'::jsonb;

-- 2. Crear tabla de cupones de descuento
CREATE TABLE IF NOT EXISTS public.cupones_descuento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo VARCHAR(50) UNIQUE NOT NULL,
    descuento_porcentaje NUMERIC(5,2) NOT NULL CHECK (descuento_porcentaje > 0 AND descuento_porcentaje <= 100),
    fecha_expiracion TIMESTAMP WITH TIME ZONE NOT NULL,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para cupones_descuento
ALTER TABLE public.cupones_descuento ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer cupones activos (para validarlos en el checkout)
CREATE POLICY "Cupones visibles para todos"
ON public.cupones_descuento FOR SELECT
USING (activo = true);

-- Solo administradores pueden gestionar cupones (asumimos acceso anon para el panel admin en esta app)
CREATE POLICY "Admins gestionan cupones"
ON public.cupones_descuento FOR ALL
USING (true)
WITH CHECK (true);

-- 3. Crear función y trigger para descontar stock al entregar pedido
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
BEGIN
    -- Solo ejecutar si el estado cambia A 'entregado'
    IF (NEW.estado = 'entregado' AND OLD.estado != 'entregado') THEN
        
        -- PROCESAR ITEMS MINORISTAS
        FOR item_minorista IN SELECT * FROM pedido_items_minorista WHERE pedido_id = NEW.id LOOP
            -- 1. Descontar del total del producto
            UPDATE productos 
            SET stock_total = GREATEST(0, stock_total - item_minorista.cantidad)
            WHERE id = item_minorista.producto_id;

            -- 2. Descontar del stock global del talle
            UPDATE producto_talles
            SET stock = GREATEST(0, stock - item_minorista.cantidad)
            WHERE id = item_minorista.talle_id;

            -- 3. Si hay color especificado, intentar descontar del JSONB de color
            IF item_minorista.color_nombre IS NOT NULL THEN
                UPDATE producto_talles
                -- Uso jsonb_set y el operador de resta en PostgreSQL 14+ no existe directo para valores dentro de jsonb, 
                -- hay que reconstruirlo o crear un pequeño bloque dinámico si la key existe.
                -- Forma simplificada segura para decrementar dentro de un JSONB (evitando valores negativos):
                SET stock_por_color = 
                    CASE 
                        WHEN stock_por_color ? item_minorista.color_nombre THEN
                            jsonb_set(
                                stock_por_color, 
                                array[item_minorista.color_nombre], 
                                to_jsonb(GREATEST(0, (stock_por_color->>item_minorista.color_nombre)::int - item_minorista.cantidad))
                            )
                        ELSE stock_por_color
                    END
                WHERE id = item_minorista.talle_id;
            END IF;
        END LOOP;

        -- PROCESAR ITEMS MAYORISTAS
        FOR item_mayorista IN SELECT * FROM pedido_items_mayorista WHERE pedido_id = NEW.id LOOP
            -- iteramos el json variaciones de mayorista 
            -- ej de elemento variaciones: {"talle": "S", "color": {"nombre": "Rojo", "hex": "..."}, "cantidad": 2}
            IF item_mayorista.variaciones IS NOT NULL AND jsonb_typeof(item_mayorista.variaciones) = 'array' THEN
                FOR v_variacion IN SELECT * FROM jsonb_array_elements(item_mayorista.variaciones) LOOP
                    v_talle_codigo := v_variacion->>'talle';
                    v_color_nombre := v_variacion->'color'->>'nombre';
                    v_cantidad := (v_variacion->>'cantidad')::numeric;

                    -- Necesitamos encontrar el talle_id basado en producto_id y talla_codigo
                    SELECT id INTO v_talle_id FROM producto_talles WHERE producto_id = item_mayorista.producto_id AND talla_codigo = v_talle_codigo;

                    IF v_talle_id IS NOT NULL THEN
                        -- Descontar del talle
                        UPDATE producto_talles SET stock = GREATEST(0, stock - v_cantidad) WHERE id = v_talle_id;
                        
                        -- Descontar del color en el talle
                        UPDATE producto_talles
                        SET stock_por_color = 
                            CASE 
                                WHEN stock_por_color ? v_color_nombre THEN
                                    jsonb_set(
                                        stock_por_color, 
                                        array[v_color_nombre], 
                                        to_jsonb(GREATEST(0, (stock_por_color->>v_color_nombre)::int - v_cantidad))
                                    )
                                ELSE stock_por_color
                            END
                        WHERE id = v_talle_id;

                        -- Descontar del producto global
                        UPDATE productos SET stock_total = GREATEST(0, stock_total - v_cantidad) WHERE id = item_mayorista.producto_id;
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asignar el trigger a la tabla pedidos
DROP TRIGGER IF EXISTS trigger_descontar_stock_entregado ON public.pedidos;
CREATE TRIGGER trigger_descontar_stock_entregado
    AFTER UPDATE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION public.descontar_stock_al_entregar();
