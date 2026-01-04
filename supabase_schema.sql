-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USUARIOS (Combines Auth and Profiles)
CREATE TABLE public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'repositor', 'cortador', 'doblador', 'vendedor')),
  telefono VARCHAR(20),
  foto_url TEXT,
  estado VARCHAR(10) DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PRODUCTOS
CREATE TABLE public.productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  categoria VARCHAR(20) NOT NULL,
  descripcion TEXT,
  especificaciones JSONB DEFAULT '{}',
  tallas JSONB DEFAULT '{}',
  precios JSONB DEFAULT '{}',
  fotos TEXT[],
  estado VARCHAR(10) DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PROVEEDORES
CREATE TABLE public.proveedores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('tela', 'insumo', 'taller')),
  contacto VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(100),
  saldo_actual DECIMAL(12,2) DEFAULT 0,
  limite_credito DECIMAL(12,2) DEFAULT 0,
  terminos_pago_dias INTEGER DEFAULT 30,
  servicios JSONB DEFAULT '{}',
  estado VARCHAR(10) DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ROLLOS DE TELA
CREATE TABLE public.rollos_tela (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo_tela VARCHAR(50) NOT NULL,
  color VARCHAR(50),
  metros_totales DECIMAL(8,2) NOT NULL,
  metros_disponibles DECIMAL(8,2) NOT NULL,
  metros_reservados DECIMAL(8,2) DEFAULT 0,
  costo_por_metro DECIMAL(8,2) NOT NULL,
  proveedor_id UUID REFERENCES public.proveedores(id),
  ubicacion VARCHAR(100),
  estado VARCHAR(20) DEFAULT 'disponible',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INSUMOS
CREATE TABLE public.insumos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  categoria VARCHAR(20) NOT NULL,
  unidad_medida VARCHAR(20) NOT NULL,
  stock_actual DECIMAL(10,2) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(10,2) NOT NULL DEFAULT 0,
  costo_unitario DECIMAL(8,2) NOT NULL,
  proveedor_id UUID REFERENCES public.proveedores(id),
  ubicacion VARCHAR(100),
  estado VARCHAR(10) DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LOTES DE PRODUCCIÓN
CREATE TABLE public.lotes_produccion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  producto_id UUID REFERENCES public.productos(id),
  variante VARCHAR(100),
  cantidad_total INTEGER NOT NULL,
  tallas_distribucion JSONB NOT NULL,
  estado_general VARCHAR(20) DEFAULT 'planificado',
  progreso_porcentaje DECIMAL(5,2) DEFAULT 0,
  rollos_asignados JSONB DEFAULT '[]',
  insumos_asignados JSONB DEFAULT '[]',
  procesos JSONB DEFAULT '[]',
  costos_calculados JSONB DEFAULT '{}',
  costos_reales JSONB DEFAULT '{}',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  fecha_inicio_real TIMESTAMP WITH TIME ZONE,
  fecha_entrega_estimada TIMESTAMP WITH TIME ZONE,
  fecha_terminacion TIMESTAMP WITH TIME ZONE
);

-- 7. CLIENTES
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('minorista', 'mayorista', 'consumidor_final')),
  nombre VARCHAR(100) NOT NULL,
  contacto VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(100),
  financiero JSONB DEFAULT '{}',
  estado VARCHAR(10) DEFAULT 'activo',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. VENTAS
CREATE TABLE public.ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  canal VARCHAR(20) NOT NULL CHECK (canal IN ('tienda_1', 'tienda_2', 'live_sales')),
  vendedor_id UUID REFERENCES public.usuarios(id),
  cliente_id UUID REFERENCES public.clientes(id),
  items JSONB NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL,
  descuento_total DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  pago JSONB NOT NULL,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. COMPRAS
CREATE TABLE public.compras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo VARCHAR(50) UNIQUE NOT NULL,
  proveedor_id UUID REFERENCES public.proveedores(id),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('tela', 'insumo', 'servicio')),
  factura JSONB NOT NULL,
  items JSONB NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente',
  saldo_pendiente DECIMAL(12,2) NOT NULL,
  pagos_realizados JSONB DEFAULT '[]',
  fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. MOVIMIENTOS INVENTARIO
CREATE TABLE public.movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste')),
  item_tipo VARCHAR(20) NOT NULL CHECK (item_tipo IN ('rollo_tela', 'insumo', 'producto_terminado')),
  item_id UUID NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL,
  referencia_id UUID,
  referencia_tipo VARCHAR(50),
  usuario_id UUID REFERENCES public.usuarios(id),
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. MOVIMIENTOS FINANCIEROS
CREATE TABLE public.movimientos_financieros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('pago_proveedor', 'cobro_cliente')),
  monto DECIMAL(12,2) NOT NULL,
  referencia_id UUID NOT NULL,
  referencia_tipo VARCHAR(20) NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) - Permitir todo por ahora para facilitar desarrollo
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rollos_tela ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lotes_produccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_financieros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public access for dev" ON public.usuarios FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.productos FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.proveedores FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.rollos_tela FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.insumos FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.lotes_produccion FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.clientes FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.ventas FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.compras FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.movimientos_inventario FOR ALL USING (true);
CREATE POLICY "Allow public access for dev" ON public.movimientos_financieros FOR ALL USING (true);

-- Trigger para crear perfil de usuario automáticamente al registrarse en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol, estado)
  VALUES (new.id, new.email, split_part(new.email, '@', 1), 'admin', 'activo');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
