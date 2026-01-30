-- ==============================================================================
-- SCRIPT DE REINICIO DE SIMULACIÓN (HARD RESET)
-- ==============================================================================
-- ADVERTENCIA: Este script ELIMINARÁ TODOS LOS LOTES DE PRODUCCIÓN
-- y RESTAURARÁ el stock de telas a sus valores INICIALES.
-- Úsalo solo si quieres empezar de cero.
-- ==============================================================================

BEGIN;

-- 1. Eliminar todos los productos asociados a lotes (limpieza de tablas hijas)
DELETE FROM public.lote_productos;

-- 2. Eliminar todos los lotes de producción
DELETE FROM public.lotes_produccion;

-- 3. Restaurar Rollos de Tela a su estado Original
-- Solo afecta a rollos que tengan 'metros_iniciales' registrados.
UPDATE public.rollos_tela
SET 
    metros_restantes = metros_iniciales,
    peso_restante = peso_inicial, -- Restaurar peso también si existe
    estado = 'disponible',
    updated_at = NOW()
WHERE 
    metros_iniciales IS NOT NULL 
    AND metros_iniciales > 0;

-- 4. (Opcional) Si hubo rollos sin metros_iniciales que quedaron en 0, 
-- no podemos restaurarlos automáticamente. Quedarán como están o puedes borrarlos manualmente.

COMMIT;

-- ==============================================================================
-- FIN DEL SCRIPT
-- ==============================================================================
