-- Migration: 20260130_update_existing_colors_with_hex
-- Description: Updates existing product colors that have null hex values with automatic color assignment

DO $$
DECLARE
    product_record RECORD;
    updated_colors JSONB;
    color_obj JSONB;
    color_name TEXT;
    color_hex TEXT;
    colors_array JSONB[];
BEGIN
    -- Loop through all products that have colors
    FOR product_record IN 
        SELECT id, nombre, colores 
        FROM public.productos 
        WHERE colores IS NOT NULL AND jsonb_array_length(colores) > 0
    LOOP
        colors_array := ARRAY[]::JSONB[];
        
        -- Process each color in the product
        FOR color_obj IN SELECT * FROM jsonb_array_elements(product_record.colores)
        LOOP
            color_name := color_obj->>'nombre';
            color_hex := color_obj->>'hex';
            
            -- If hex is null, assign automatic color based on name
            IF color_hex IS NULL THEN
                -- Auto-assign hex based on Spanish/Latin American color names
                color_hex := CASE
                    WHEN LOWER(color_name) LIKE '%negro%' OR LOWER(color_name) LIKE '%black%' THEN '#000000'
                    WHEN LOWER(color_name) LIKE '%blanco%' OR LOWER(color_name) LIKE '%white%' THEN '#FFFFFF'
                    WHEN LOWER(color_name) LIKE '%rojo%' OR LOWER(color_name) LIKE '%red%' THEN '#DC2626'
                    WHEN LOWER(color_name) LIKE '%azul%' OR LOWER(color_name) LIKE '%blue%' THEN '#2563EB'
                    WHEN LOWER(color_name) LIKE '%marino%' OR LOWER(color_name) LIKE '%navy%' THEN '#1E3A8A'
                    WHEN LOWER(color_name) LIKE '%verde%' OR LOWER(color_name) LIKE '%green%' THEN '#16A34A'
                    WHEN LOWER(color_name) LIKE '%amarillo%' OR LOWER(color_name) LIKE '%yellow%' THEN '#EAB308'
                    WHEN LOWER(color_name) LIKE '%naranja%' OR LOWER(color_name) LIKE '%orange%' THEN '#F97316'
                    WHEN LOWER(color_name) LIKE '%rosa%' OR LOWER(color_name) LIKE '%pink%' THEN '#EC4899'
                    WHEN LOWER(color_name) LIKE '%morado%' OR LOWER(color_name) LIKE '%violeta%' OR LOWER(color_name) LIKE '%purple%' THEN '#A855F7'
                    WHEN LOWER(color_name) LIKE '%gris%' OR LOWER(color_name) LIKE '%gray%' OR LOWER(color_name) LIKE '%grey%' THEN '#6B7280'
                    WHEN LOWER(color_name) LIKE '%beige%' OR LOWER(color_name) LIKE '%arena%' THEN '#F5F5DC'
                    WHEN LOWER(color_name) LIKE '%crema%' OR LOWER(color_name) LIKE '%cream%' THEN '#FAEBD7'
                    WHEN LOWER(color_name) LIKE '%café%' OR LOWER(color_name) LIKE '%marrón%' OR LOWER(color_name) LIKE '%brown%' THEN '#92400E'
                    WHEN LOWER(color_name) LIKE '%chocolate%' THEN '#7C2D12'
                    WHEN LOWER(color_name) LIKE '%camel%' THEN '#C19A6B'
                    WHEN LOWER(color_name) LIKE '%vison%' OR LOWER(color_name) LIKE '%visón%' THEN '#8B7355'
                    WHEN LOWER(color_name) LIKE '%nude%' THEN '#E8BEAC'
                    WHEN LOWER(color_name) LIKE '%coral%' THEN '#FF7F50'
                    WHEN LOWER(color_name) LIKE '%turquesa%' OR LOWER(color_name) LIKE '%turquoise%' THEN '#14B8A6'
                    WHEN LOWER(color_name) LIKE '%celeste%' OR LOWER(color_name) LIKE '%sky%' THEN '#7DD3FC'
                    WHEN LOWER(color_name) LIKE '%bordo%' OR LOWER(color_name) LIKE '%burgundy%' OR LOWER(color_name) LIKE '%borgoña%' THEN '#7F1D1D'
                    WHEN LOWER(color_name) LIKE '%mostaza%' OR LOWER(color_name) LIKE '%mustard%' THEN '#D97706'
                    WHEN LOWER(color_name) LIKE '%oliva%' OR LOWER(color_name) LIKE '%olive%' THEN '#65A30D'
                    -- Melange colors (lighter versions)
                    WHEN LOWER(color_name) LIKE '%melange%' AND LOWER(color_name) LIKE '%gris%' THEN '#9CA3AF'
                    WHEN LOWER(color_name) LIKE '%melange%' AND LOWER(color_name) LIKE '%azul%' THEN '#60A5FA'
                    WHEN LOWER(color_name) LIKE '%melange%' AND LOWER(color_name) LIKE '%verde%' THEN '#4ADE80'
                    ELSE NULL -- Keep null if no match
                END;
                
                RAISE NOTICE 'Product %: Updating color "%" from null to %', product_record.nombre, color_name, COALESCE(color_hex, 'null (no match)');
            END IF;
            
            -- Build updated color object
            colors_array := array_append(colors_array, jsonb_build_object('nombre', color_name, 'hex', color_hex));
        END LOOP;
        
        -- Convert array to JSONB and update product
        updated_colors := to_jsonb(colors_array);
        
        UPDATE public.productos
        SET colores = updated_colors
        WHERE id = product_record.id;
    END LOOP;
    
    RAISE NOTICE '✅ Colores actualizados correctamente';
END $$;
