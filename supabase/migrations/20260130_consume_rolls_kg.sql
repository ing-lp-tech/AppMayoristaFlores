-- Migration: 20260130_consume_rolls_kg
-- Description: Replace consume_rolls_for_batch to work exclusively with kilograms (no density conversion)

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
BEGIN
    IF p_rolls IS NULL OR jsonb_array_length(p_rolls) = 0 THEN
        RETURN;
    END IF;

    FOR r_record IN SELECT * FROM jsonb_array_elements(p_rolls)
    LOOP
        r_id := (r_record->>'rollo_id')::uuid;
        kg_to_consume := (r_record->>'kg_consumido')::numeric;

        IF r_id IS NOT NULL AND kg_to_consume > 0 THEN
            UPDATE public.rollos_tela
            SET 
                -- Deduct kg directly from peso_restante (NO density calculation)
                peso_restante = GREATEST(0, peso_restante - kg_to_consume),
                updated_at = NOW(),
                estado = CASE 
                            WHEN (peso_restante - kg_to_consume) <= 0.01 THEN 'agotado'
                            ELSE 'usado' 
                         END
            WHERE id = r_id;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.consume_rolls_for_batch IS 'Descuenta kg consumidos del stock de rollos. NO usa densidad, solo resta kg directamente.';
