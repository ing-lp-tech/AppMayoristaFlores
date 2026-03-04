-- Migration: 20260304_adjust_roll_on_batch_edit
-- Description: 
--   1. Nueva función adjust_roll_consumption para corregir el stock de un rollo
--      al editar los kg consumidos en un lote (devuelve o descuenta la diferencia).
--   2. Mejora de consume_rolls_for_batch: umbral de 'agotado' más conservador
--      (solo cuando peso_restante <= 0.1 kg, no por porcentaje).

-- --------------------------------------------------------
-- FUNCIÓN 1: adjust_roll_consumption
-- Ajusta el peso_restante de un rollo según la diferencia entre
-- los kg_anteriores y kg_nuevos del lote.
-- delta = kg_nuevo - kg_anterior
--   Si delta > 0 → se descuenta más tela
--   Si delta < 0 → se devuelve tela al rollo
-- --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.adjust_roll_consumption(
    p_rollo_id uuid,
    p_kg_anterior numeric,
    p_kg_nuevo numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    delta numeric;
    current_peso_restante numeric;
    new_peso_restante numeric;
BEGIN
    delta := p_kg_nuevo - p_kg_anterior;

    -- No hacer nada si no hay cambio
    IF delta = 0 THEN
        RETURN;
    END IF;

    -- Obtener el peso restante actual
    SELECT peso_restante
    INTO current_peso_restante
    FROM public.rollos_tela
    WHERE id = p_rollo_id;

    IF NOT FOUND THEN
        RAISE WARNING 'Rollo % no encontrado al ajustar consumo', p_rollo_id;
        RETURN;
    END IF;

    -- Calcular nuevo peso (no puede ser negativo)
    new_peso_restante := GREATEST(0, current_peso_restante - delta);

    -- Actualizar el rollo
    UPDATE public.rollos_tela
    SET
        peso_restante = new_peso_restante,
        updated_at = NOW(),
        estado = CASE
            -- Agotado solo si queda menos de 0.1 kg (umbral absoluto)
            WHEN new_peso_restante <= 0.1 THEN 'agotado'
            -- Disponible si nunca fue usado (peso_restante == peso_inicial próximo)
            WHEN new_peso_restante >= (SELECT peso_inicial FROM public.rollos_tela WHERE id = p_rollo_id) * 0.98 THEN 'disponible'
            ELSE 'usado'
        END
    WHERE id = p_rollo_id;

    RAISE NOTICE 'Rollo % ajustado: % kg -> % kg (delta: %)',
        p_rollo_id, current_peso_restante, new_peso_restante, delta;
END;
$$;

COMMENT ON FUNCTION public.adjust_roll_consumption IS
    'Ajusta el peso_restante de un rollo dado el kg anterior y el kg nuevo consumido en un lote. '
    'Positivo delta = consume más tela; Negativo delta = devuelve tela al inventario.';

-- --------------------------------------------------------
-- FUNCIÓN 2: Reemplazar consume_rolls_for_batch con umbral 
--            de agotado corregido (0.1 kg, no 10%)
-- --------------------------------------------------------
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
    new_peso_restante numeric;
BEGIN
    IF p_rolls IS NULL OR jsonb_array_length(p_rolls) = 0 THEN
        RETURN;
    END IF;

    FOR r_record IN SELECT * FROM jsonb_array_elements(p_rolls)
    LOOP
        r_id := (r_record->>'rollo_id')::uuid;
        kg_to_consume := (r_record->>'kg_consumido')::numeric;

        IF r_id IS NOT NULL AND kg_to_consume > 0 THEN
            -- Calcular nuevo peso restante
            SELECT GREATEST(0, peso_restante - kg_to_consume)
            INTO new_peso_restante
            FROM public.rollos_tela
            WHERE id = r_id;

            UPDATE public.rollos_tela
            SET
                peso_restante = new_peso_restante,
                updated_at = NOW(),
                estado = CASE
                    -- Agotado solo si queda 0.1 kg o menos
                    WHEN new_peso_restante <= 0.1 THEN 'agotado'
                    ELSE 'usado'
                END
            WHERE id = r_id;

            RAISE NOTICE 'Rollo % consumido: % kg descontados. Restante: % kg, Estado: %',
                r_id,
                kg_to_consume,
                new_peso_restante,
                CASE WHEN new_peso_restante <= 0.1 THEN 'agotado' ELSE 'usado' END;
        END IF;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION public.consume_rolls_for_batch IS
    'Descuenta kg consumidos del stock de rollos. '
    'Marca como agotado solo si peso_restante <= 0.1 kg (umbral absoluto, no porcentual).';
