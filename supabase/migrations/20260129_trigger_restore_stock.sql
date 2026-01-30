-- Trigger to restore fabric stock when a Batch (Lote) is deleted.
-- Handles returning the 'metros' used from 'detalle_rollos' back to 'rollos_tela'.

CREATE OR REPLACE FUNCTION public.restore_rolls_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rollo_record jsonb;
    r_id uuid;
    metros_to_restore numeric;
BEGIN
    -- Check if detalhe_rollos exists and is an array
    IF OLD.detalle_rollos IS NOT NULL AND jsonb_typeof(OLD.detalle_rollos) = 'array' THEN
        
        -- Loop through each roll usage in the JSON array
        FOR rollo_record IN SELECT * FROM jsonb_array_elements(OLD.detalle_rollos)
        LOOP
            -- Extract ID and Metros safely
            r_id := (rollo_record->>'rollo_id')::uuid;
            metros_to_restore := (rollo_record->>'metros')::numeric;

            -- Only proceed if we have valid ID and quantity > 0
            IF r_id IS NOT NULL AND metros_to_restore > 0 THEN
                
                -- Update the roll stock
                UPDATE public.rollos_tela
                SET 
                    metros_restantes = metros_restantes + metros_to_restore,
                    updated_at = NOW(),
                    -- If we restore stock, ensure it's marked as available (in case it was 'agotado'/'finished')
                    estado = 'disponible' 
                WHERE id = r_id;

            END IF;
        END LOOP;
        
    END IF;

    RETURN OLD;
END;
$$;

-- Drop trigger if exists to allow safe re-run
DROP TRIGGER IF EXISTS trigger_restore_rolls_on_delete ON public.lotes_produccion;

-- Create the trigger
CREATE TRIGGER trigger_restore_rolls_on_delete
    BEFORE DELETE ON public.lotes_produccion
    FOR EACH ROW
    EXECUTE FUNCTION public.restore_rolls_on_delete();
