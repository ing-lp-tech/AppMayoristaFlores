-- Agregar columnas direccion y observaciones a la tabla proveedores

ALTER TABLE proveedores
    ADD COLUMN IF NOT EXISTS direccion TEXT,
    ADD COLUMN IF NOT EXISTS observaciones TEXT;

COMMENT ON COLUMN proveedores.direccion IS 'Dirección física del proveedor';
COMMENT ON COLUMN proveedores.observaciones IS 'Notas adicionales u observaciones sobre el proveedor';
