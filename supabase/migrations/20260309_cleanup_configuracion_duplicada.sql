-- Limpiar configuraciones duplicadas dejando solo la editada más recientemente
DELETE FROM public.configuracion_sistema
WHERE id NOT IN (
    SELECT id 
    FROM public.configuracion_sistema 
    ORDER BY actualizado_en DESC 
    LIMIT 1
);
