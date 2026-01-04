-- ==========================================
-- 1. Tabla de Plantillas de Procesos (Ej. "Proceso Jean", "Proceso Remera")
-- ==========================================
CREATE TABLE IF NOT EXISTS procesos_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 2. Tabla de Pasos del Proceso (Ej. 1. Corte, 2. Taller, etc.)
-- ==========================================
CREATE TABLE IF NOT EXISTS pasos_proceso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proceso_id UUID REFERENCES procesos_templates(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL, -- Nombre de la etapa
    orden INTEGER NOT NULL, -- 1, 2, 3...
    requiere_input BOOLEAN DEFAULT FALSE, -- Si true, pedirá confirmar cantidad al completar
    creado_en TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(proceso_id, orden)
);

-- ==========================================
-- 3. Vincular Productos a un Proceso
-- ==========================================
-- Agregamos la columna si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'proceso_produccion_id') THEN
        ALTER TABLE productos 
        ADD COLUMN proceso_produccion_id UUID REFERENCES procesos_templates(id);
    END IF;
END $$;

-- ==========================================
-- 4. Actualizar Lotes para soportar Procesos Dinámicos
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lotes_produccion' AND column_name = 'proceso_snapshot') THEN
        ALTER TABLE lotes_produccion 
        ADD COLUMN proceso_snapshot JSONB; -- Guardará la copia de los pasos
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lotes_produccion' AND column_name = 'paso_actual_index') THEN
        ALTER TABLE lotes_produccion 
        ADD COLUMN paso_actual_index INTEGER DEFAULT 0;
    END IF;
END $$;

-- ==========================================
-- 5. Insertar Datos de Ejemplo (Seed)
-- ==========================================
-- Insertar un proceso básico para empezar
WITH new_proc AS (
    INSERT INTO procesos_templates (nombre, descripcion) 
    VALUES ('Proceso Estándar Completo', 'Flujo completo para prendas complejas')
    RETURNING id
)
INSERT INTO pasos_proceso (proceso_id, nombre, orden, requiere_input)
VALUES 
    ((SELECT id FROM new_proc), 'Planificado', 0, false),
    ((SELECT id FROM new_proc), 'Corte', 1, false),
    ((SELECT id FROM new_proc), 'Taller / Confección', 2, false),
    ((SELECT id FROM new_proc), 'Control de Calidad', 3, false),
    ((SELECT id FROM new_proc), 'Terminado', 4, true);
