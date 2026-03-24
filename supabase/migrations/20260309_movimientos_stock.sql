-- Migración para añadir historial detallado de movimientos de stock

-- 1. Crear tabla de historiales de stock por talle y color
CREATE TABLE IF NOT EXISTS public.movimientos_stock_productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada_produccion', 'salida_venta', 'ajuste')),
    producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    talle_id UUID NOT NULL REFERENCES public.producto_talles(id) ON DELETE CASCADE,
    talle VARCHAR(50) NOT NULL,
    color VARCHAR(100) NOT NULL,
    cantidad INTEGER NOT NULL,
    referencia_tipo VARCHAR(50) NOT NULL CHECK (referencia_tipo IN ('pedido', 'lote_produccion', 'manual')),
    referencia_id UUID,
    usuario_id UUID REFERENCES public.usuarios_internos(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para movimientos_stock_productos
ALTER TABLE public.movimientos_stock_productos ENABLE ROW LEVEL SECURITY;

-- Permitir a usuarios autenticados insertar, leer y actualizar movimientos de stock
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'movimientos_stock_productos' 
        AND policyname = 'Allow public access for dev'
    ) THEN
        CREATE POLICY "Allow public access for dev" ON public.movimientos_stock_productos FOR ALL USING (true);
    END IF;
END
$$;

-- Otorgar permisos a los roles de la base de datos de Supabase para esta tabla
GRANT ALL ON TABLE public.movimientos_stock_productos TO anon;
GRANT ALL ON TABLE public.movimientos_stock_productos TO authenticated;
GRANT ALL ON TABLE public.movimientos_stock_productos TO service_role;


-- 2. Modificar trigger de entrega de pedidos para registrar salidas

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
    IF (NEW.estado = 'entregado' AND OLD.estado != 'entregado') THEN
        
        -- Attempt to get user id from auth context
        v_usuario_id := auth.uid();

        -- PROCESAR ITEMS MINORISTAS
        FOR item_minorista IN SELECT * FROM pedido_items_minorista WHERE pedido_id = NEW.id LOOP
            -- 1. Descontar del total del producto
            UPDATE productos 
            SET stock_total = GREATEST(0, stock_total - item_minorista.cantidad)
            WHERE id = item_minorista.producto_id;

            -- 2. Descontar del stock global del talle y obtener el codigo
            UPDATE producto_talles
            SET stock = GREATEST(0, stock - item_minorista.cantidad)
            WHERE id = item_minorista.talle_id
            RETURNING talla_codigo INTO v_talle_nombre;

            -- 3. Si hay color especificado, descontar e insertar historial
            IF item_minorista.color_nombre IS NOT NULL THEN
                UPDATE producto_talles
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

                -- REGISTRAR EN EL HISTORIAL
                INSERT INTO public.movimientos_stock_productos (
                    fecha, tipo_movimiento, producto_id, talle_id, talle, color, cantidad, referencia_tipo, referencia_id, usuario_id
                ) VALUES (
                    NOW(), 'salida_venta', item_minorista.producto_id, item_minorista.talle_id, v_talle_nombre, item_minorista.color_nombre, item_minorista.cantidad, 'pedido', NEW.id, v_usuario_id
                );

            END IF;
        END LOOP;

        -- PROCESAR ITEMS MAYORISTAS
        FOR item_mayorista IN SELECT * FROM pedido_items_mayorista WHERE pedido_id = NEW.id LOOP
            -- iteramos el json variaciones de mayorista 
            IF item_mayorista.variaciones IS NOT NULL AND jsonb_typeof(item_mayorista.variaciones) = 'array' THEN
                FOR v_variacion IN SELECT * FROM jsonb_array_elements(item_mayorista.variaciones) LOOP
                    v_talle_codigo := v_variacion->>'talle';
                    v_color_nombre := v_variacion->'color'->>'nombre';
                    v_cantidad := (v_variacion->>'cantidad')::numeric;

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

                        -- REGISTRAR EN EL HISTORIAL
                        INSERT INTO public.movimientos_stock_productos (
                            fecha, tipo_movimiento, producto_id, talle_id, talle, color, cantidad, referencia_tipo, referencia_id, usuario_id
                        ) VALUES (
                            NOW(), 'salida_venta', item_mayorista.producto_id, v_talle_id, v_talle_codigo, v_color_nombre, v_cantidad, 'pedido', NEW.id, v_usuario_id
                        );

                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Not dropping trigger as it already exists, CREATE OR REPLACE updates the function.
