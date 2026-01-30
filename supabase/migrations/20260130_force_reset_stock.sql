-- ==============================================================================
-- SCRIPT DE RESTAURACIÓN FORZADA DE STOCK (CORREGIDO)
-- ==============================================================================
-- Este script arregla los rollos que aparecen como AGOTADO (0m).
-- Se ha eliminado la referencia a updated_at que causaba error.
-- ==============================================================================

BEGIN;

UPDATE public.rollos_tela
SET 
  -- 1. Intenta usar el valor original. Si no existe, pone 50 metros por defecto.
  metros_restantes = CASE 
                        WHEN metros_iniciales IS NOT NULL AND metros_iniciales > 0 THEN metros_iniciales 
                        ELSE 50 -- Valor por defecto seguro
                     END,
                     
  -- 2. Asegura que el estado sea disponible
  estado = 'disponible'

  -- Nota: No tocamos updated_at para evitar errores si la columna no existe.
WHERE 
  -- Solo aplica a los rollos con problemas (Agotados o con 0m)
  estado = 'agotado' OR metros_restantes <= 0.5;

COMMIT;
