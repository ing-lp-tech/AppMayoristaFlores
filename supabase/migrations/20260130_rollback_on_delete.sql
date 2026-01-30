-- Migration: Complete rollback when batch is deleted
-- Description: Replaces old trigger to rollback BOTH product stock AND fabric rolls (kg + metros)

-- Drop old trigger and function
DROP TRIGGER IF EXISTS trigger_restore_rolls_on_delete ON public.lotes_produccion;
DROP FUNCTION IF EXISTS public.restore_rolls_on_delete();

-- New comprehensive rollback function
CREATE OR REPLACE FUNCTION public.rollback_batch_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    lp_record RECORD;
    distribution jsonb;
    rollo_record jsonb;
    total_qty_per_talle jsonb;
BEGIN
    -- Only rollback if batch was finalized (has cantidad_real > 0)
    IF OLD.cantidad_real IS NULL OR OLD.cantidad_real <= 0 THEN
        RAISE NOTICE 'Batch % was not finalized, skipping stock rollback', OLD.codigo;
        RETURN OLD;
    END IF;

    RAISE NOTICE '🔄 Rolling back stock for finalized batch: %', OLD.codigo;

    -- ========================================
    -- 1. ROLLBACK FABRIC ROLLS (restore kg)
    -- ========================================
    IF OLD.detalle_rollos IS NOT NULL THEN
        FOR rollo_record IN SELECT * FROM jsonb_array_elements(OLD.detalle_rollos)
        LOOP
            DECLARE
                r_id uuid;
                kg_used numeric;
                metros_used numeric;
                new_peso numeric;
                new_metros numeric;
                peso_inicial numeric;
                percentage_remaining numeric;
            BEGIN
                r_id := (rollo_record->>'rollo_id')::uuid;
                kg_used := COALESCE((rollo_record->>'kg_consumido')::numeric, 0);
                metros_used := COALESCE((rollo_record->>'metros')::numeric, 0);

                IF r_id IS NOT NULL AND (kg_used > 0 OR metros_used > 0) THEN
                    -- Get current peso_inicial for percentage calculation
                    SELECT rl.peso_inicial 
                    INTO peso_inicial
                    FROM public.rollos_tela rl
                    WHERE rl.id = r_id;

                    -- Restore both kg and metros
                    UPDATE public.rollos_tela
                    SET 
                        peso_restante = peso_restante + kg_used,
                        metros_restantes = metros_restantes + metros_used,
                        updated_at = NOW()
                    WHERE id = r_id
                    RETURNING peso_restante, metros_restantes INTO new_peso, new_metros;

                    -- Recalculate estado based on restored peso
                    IF peso_inicial > 0 THEN
                        percentage_remaining := (new_peso / peso_inicial) * 100;
                    ELSE
                        percentage_remaining := 0;
                    END IF;

                    UPDATE public.rollos_tela
                    SET estado = CASE
                        WHEN new_peso <= 0.01 THEN 'agotado'
                        WHEN percentage_remaining >= 95 THEN 'disponible'
                        WHEN percentage_remaining >= 10 THEN 'usado'
                        ELSE 'agotado'
                    END
                    WHERE id = r_id;

                    RAISE NOTICE '  ✅ Restored roll %: +% kg, +% m (new: % kg, % m)',
                        r_id, kg_used, metros_used, new_peso, new_metros;
                END IF;
            END;
        END LOOP;
    END IF;

    -- ========================================
    -- 2. ROLLBACK PRODUCT STOCK (subtract from producto_talles)
    -- ========================================
    FOR lp_record IN 
        SELECT lp.producto_id, lp.tallas_distribucion
        FROM lote_productos lp
        WHERE lp.lote_id = OLD.id
    LOOP
        distribution := lp_record.tallas_distribucion;
        
        IF distribution IS NOT NULL AND jsonb_typeof(distribution) = 'object' THEN
            RAISE NOTICE '  📦 Rolling back product %', lp_record.producto_id;
            
            -- Iterate through distribution: { "Color1": { "talle_id": qty, ... }, ... }
            DECLARE
                color_name text;
                color_tallajes jsonb;
                talle_id text;
                talle_qty numeric;
            BEGIN
                -- Loop through each color
                FOR color_name, color_tallajes IN SELECT * FROM jsonb_each(distribution)
                LOOP
                    -- Loop through each talle in this color
                    FOR talle_id, talle_qty IN SELECT key, value::numeric FROM jsonb_each_text(color_tallajes)
                    LOOP
                        -- Subtract stock from this specific talle
                        UPDATE public.producto_talles
                        SET 
                            stock = GREATEST(0, stock - talle_qty),
                            updated_at = NOW()
                        WHERE producto_id = lp_record.producto_id
                          AND id = talle_id::uuid;

                        RAISE NOTICE '    - Talle %: -% units (color: %)', talle_id, talle_qty, color_name;
                    END LOOP;
                END LOOP;
            END;

            -- Update total stock for the product
            UPDATE public.productos
            SET stock_total = (
                SELECT COALESCE(SUM(stock), 0)
                FROM public.producto_talles
                WHERE producto_id = lp_record.producto_id
            ),
            updated_at = NOW()
            WHERE id = lp_record.producto_id;
        END IF;
    END LOOP;

    RAISE NOTICE '✅ Rollback completed for batch %', OLD.codigo;
    RETURN OLD;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_rollback_batch_on_delete ON lotes_produccion;
CREATE TRIGGER trigger_rollback_batch_on_delete
    BEFORE DELETE ON lotes_produccion
    FOR EACH ROW
    EXECUTE FUNCTION public.rollback_batch_on_delete();

COMMENT ON FUNCTION public.rollback_batch_on_delete IS 'Revierte stock de productos (por talle/color) y rollos (kg + metros) cuando se elimina un lote finalizado';
