-- FIX DATA: Insert missing products for Lot 00001
-- The user indicated that "CT9NI+D001" represents two products.
-- We will link the products with these codes to the lot.

DO $$
DECLARE
    target_lote_id UUID := '1cc753dc-b1f0-45dc-8554-7ee07fbb0448';
    prod_1_code TEXT := 'CT9NI';
    prod_2_code TEXT := 'D001';
    
    p1_id UUID;
    p2_id UUID;
BEGIN
    -- 1. Find Product IDs
    SELECT id INTO p1_id FROM public.productos WHERE codigo = prod_1_code LIMIT 1;
    SELECT id INTO p2_id FROM public.productos WHERE codigo = prod_2_code LIMIT 1;

    -- 2. Insert into lote_productos if found
    IF p1_id IS NOT NULL THEN
        -- Check if exists to avoid dups
        IF NOT EXISTS (SELECT 1 FROM public.lote_productos WHERE lote_id = target_lote_id AND producto_id = p1_id) THEN
            INSERT INTO public.lote_productos (lote_id, producto_id, orden)
            VALUES (target_lote_id, p1_id, 1);
        END IF;
    END IF;

    IF p2_id IS NOT NULL THEN
         IF NOT EXISTS (SELECT 1 FROM public.lote_productos WHERE lote_id = target_lote_id AND producto_id = p2_id) THEN
            INSERT INTO public.lote_productos (lote_id, producto_id, orden)
            VALUES (target_lote_id, p2_id, 2);
         END IF;
    END IF;

    -- 3. Also update legacy producto_id in lotes_produccion to p1 just in case (optional)
    IF p1_id IS NOT NULL THEN
        UPDATE public.lotes_produccion SET producto_id = p1_id WHERE id = target_lote_id;
    END IF;

END $$;
