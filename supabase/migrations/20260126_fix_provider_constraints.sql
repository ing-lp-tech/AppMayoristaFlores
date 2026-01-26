-- Migration: 20260126_fix_provider_constraints
-- Description: Change referenced tables to SET NULL on provider deletion

-- 1. Modify tipos_tela
ALTER TABLE public.tipos_tela
DROP CONSTRAINT IF EXISTS tipos_tela_proveedor_id_fkey;

ALTER TABLE public.tipos_tela
ADD CONSTRAINT tipos_tela_proveedor_id_fkey
FOREIGN KEY (proveedor_id)
REFERENCES public.proveedores(id)
ON DELETE SET NULL;

-- 2. Modify rollos_tela
ALTER TABLE public.rollos_tela
DROP CONSTRAINT IF EXISTS rollos_tela_proveedor_id_fkey;

ALTER TABLE public.rollos_tela
ADD CONSTRAINT rollos_tela_proveedor_id_fkey
FOREIGN KEY (proveedor_id)
REFERENCES public.proveedores(id)
ON DELETE SET NULL;

-- 3. Modify insumos
ALTER TABLE public.insumos
DROP CONSTRAINT IF EXISTS insumos_proveedor_id_fkey;

ALTER TABLE public.insumos
ADD CONSTRAINT insumos_proveedor_id_fkey
FOREIGN KEY (proveedor_id)
REFERENCES public.proveedores(id)
ON DELETE SET NULL;
