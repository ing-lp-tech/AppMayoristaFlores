-- Migration: Fix consume_rolls_for_batch RPC
-- Description: Fix the RPC function to correctly update roll status based on remaining weight percentage

DROP FUNCTION IF EXISTS public.consume_rolls_for_batch(uuid, jsonb);

CREATE OR REPLACE FUNCTION public.consume_rolls_for_batch(p_batch_id uuid, p_rolls jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_record jsonb;
    r_id uuid;
    kg_to_consume numeric;
    current_peso_inicial numeric;
    current_peso_restante numeric;
    new_peso_restante numeric;
    percentage_remaining numeric;
BEGIN
    IF p_rolls IS NULL OR jsonb_array_length(p_rolls) = 0 THEN
        RETURN;
    END IF;

    FOR r_record IN SELECT * FROM jsonb_array_elements(p_rolls)
    LOOP
        r_id := (r_record->>'rollo_id')::uuid;
        kg_to_consume := (r_record->>'kg_consumido')::numeric;

        IF r_id IS NOT NULL AND kg_to_consume > 0 THEN
            -- Get current values
            SELECT peso_inicial, peso_restante
            INTO current_peso_inicial, current_peso_restante
            FROM public.rollos_tela
            WHERE id = r_id;

            -- Calculate new remaining weight
            new_peso_restante := GREATEST(0, current_peso_restante - kg_to_consume);
            
            -- Calculate percentage remaining (based on initial weight)
            IF current_peso_inicial > 0 THEN
                percentage_remaining := (new_peso_restante / current_peso_inicial) * 100;
            ELSE
                percentage_remaining := 0;
            END IF;

            -- Update roll with new weight and status
            UPDATE public.rollos_tela
            SET 
                peso_restante = new_peso_restante,
                updated_at = NOW(),
                estado = CASE 
                    WHEN new_peso_restante <= 0.01 THEN 'agotado'
                    WHEN percentage_remaining < 10 THEN 'agotado'
                    ELSE 'usado'
                END
            WHERE id = r_id;

            -- Log the update for debugging (optional, can be removed in production)
            RAISE NOTICE 'Roll % updated: % kg -> % kg (% %% remaining), status: %',
                r_id,
                current_peso_restante,
                new_peso_restante,
                ROUND(percentage_remaining, 1),
                CASE 
                    WHEN new_peso_restante <= 0.01 THEN 'agotado'
                    WHEN percentage_remaining < 10 THEN 'agotado'
                    ELSE 'usado'
                END;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.consume_rolls_for_batch IS 'Descuenta kg consumidos del stock de rollos. Actualiza estado basado en porcentaje restante (< 10% = agotado).';
