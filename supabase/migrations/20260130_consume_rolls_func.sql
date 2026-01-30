CREATE OR REPLACE FUNCTION public.consume_rolls_for_batch(p_batch_id uuid, p_rolls jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_record jsonb;
    r_id uuid;
    metros_to_consume numeric;
BEGIN
    IF p_rolls IS NULL OR jsonb_array_length(p_rolls) = 0 THEN
        RETURN;
    END IF;

    FOR r_record IN SELECT * FROM jsonb_array_elements(p_rolls)
    LOOP
        r_id := (r_record->>'rollo_id')::uuid;
        metros_to_consume := (r_record->>'metros_usados')::numeric;

        IF r_id IS NOT NULL AND metros_to_consume > 0 THEN
            UPDATE public.rollos_tela
            SET 
                -- Update weight first or use old value of meters
                peso_restante = CASE 
                                    WHEN metros_restantes > 0 THEN GREATEST(0, peso_restante * (GREATEST(0, metros_restantes - metros_to_consume) / metros_restantes))
                                    ELSE 0 
                                END,
                metros_restantes = GREATEST(0, metros_restantes - metros_to_consume),
                updated_at = NOW(),
                estado = CASE 
                            WHEN (metros_restantes - metros_to_consume) <= 0.5 THEN 'agotado'
                            ELSE 'usado' 
                         END
            WHERE id = r_id;
        END IF;
    END LOOP;
END;
$$;
