-- ==========================================
-- SISTEMA INTEGRAL TEXTIL PYME (DUAL: MINORISTA & MAYORISTA)
-- ==========================================

-- 1. TIPOS Y ENUMERACIONES
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'produccion', 'ventas', 'inventario', 'contador', 'repositor', 'cortador', 'doblador');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE proveedor_tipo AS ENUM ('tela', 'insumo', 'taller');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. USUARIOS Y PERFILES
-- Usuarios internos de la empresa
CREATE TABLE IF NOT EXISTS public.usuarios_internos (
    id uuid references auth.users not null primary key,
    email text unique not null,
    nombre text not null,
    apellido text,
    rol user_role not null default 'ventas',
    telefono text,
    departamento text,
    activo boolean default true,
    creado_en timestamptz default now(),
    ultimo_login timestamptz
);

-- Clientes (se crean en el checkout)
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid default gen_random_uuid() primary key,
    email text,
    nombre text not null,
    apellido text,
    telefono text not null,
    tipo_cliente text default 'minorista', -- 'minorista', 'mayorista', 'ambos'
    razon_social text,
    cuit text,
    rubro text,
    limite_credito numeric default 0,
    direccion text,
    ciudad text,
    codigo_postal text,
    total_pedidos integer default 0,
    total_gastado numeric default 0,
    primer_pedido_date timestamptz,
    ultimo_pedido_date timestamptz,
    pedidos_como_mayorista integer default 0,
    creado_en timestamptz default now(),
    actualizado_en timestamptz default now()
);

-- 3. PRODUCTOS Y CATÁLOGO
CREATE TABLE IF NOT EXISTS public.categorias (
    id uuid default gen_random_uuid() primary key,
    nombre text not null,
    codigo text unique not null,
    descripcion text,
    imagen_url text,
    orden integer default 0,
    visible_publico boolean default true,
    permite_mayorista boolean default true
);

CREATE TABLE IF NOT EXISTS public.productos (
    id uuid default gen_random_uuid() primary key,
    codigo text unique not null,
    nombre text not null,
    descripcion_publica text,
    descripcion_interna text,
    categoria_id uuid references public.categorias(id),
    tipo_prenda text,
    genero text,
    tela_principal text,
    color_base text,
    composicion text,
    cuidados text,
    imagenes text[] default '{}',
    imagen_principal text,
    -- PRECIOS DUALES
    precio_minorista numeric not null,
    precio_mayorista_curva numeric not null,
    precio_costo_base numeric,
    margen_minorista numeric default 40.00,
    margen_mayorista numeric default 25.00,
    -- CONFIG CURVA
    curva_minima boolean default true,
    talles_por_curva integer,
    descripcion_curva text,
    stock_total integer default 0,
    stock_minimo integer default 10,
    visible_publico boolean default true,
    destacado boolean default false,
    disponible_minorista boolean default true,
    disponible_mayorista boolean default true,
    slug text unique,
    creado_en timestamptz default now(),
    actualizado_en timestamptz default now(),
    creado_por uuid references public.usuarios_internos(id)
);

CREATE TABLE IF NOT EXISTS public.producto_talles (
    id uuid default gen_random_uuid() primary key,
    producto_id uuid references public.productos(id) on delete cascade not null,
    talla_codigo text not null,
    talla_nombre text not null,
    orden integer default 0,
    incluido_curva boolean default true,
    stock integer default 0,
    stock_minimo integer default 5,
    disponible_publico boolean default true,
    unique(producto_id, talla_codigo)
);

-- 4. INVENTARIO (TELAS E INSUMOS)
CREATE TABLE IF NOT EXISTS public.proveedores (
    id uuid default gen_random_uuid() primary key,
    codigo text unique not null,
    nombre text not null,
    tipo proveedor_tipo not null,
    contacto text,
    telefono text,
    email text,
    saldo_actual numeric default 0,
    creado_en timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.rollos_tela (
    id uuid default gen_random_uuid() primary key,
    codigo text unique not null,
    tipo_tela text not null,
    color text,
    metros_iniciales numeric not null,
    metros_restantes numeric not null,
    costo_por_metro numeric not null,
    proveedor_id uuid references public.proveedores(id) on delete set null,
    estado text default 'disponible',
    creado_en timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.tipos_tela (
    id uuid default gen_random_uuid() primary key,
    nombre text not null unique,
    composicion text,
    proveedor_id uuid references public.proveedores(id) on delete set null,
    onza text,
    precio_por_kilo numeric,
    creado_en timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.insumos (
    id uuid default gen_random_uuid() primary key,
    codigo text unique not null,
    nombre text not null,
    stock_actual numeric default 0,
    unidad_medida text not null,
    costo_unitario numeric,
    proveedor_id uuid references public.proveedores(id) on delete set null,
    creado_en timestamptz default now()
);

-- 5. PRODUCCIÓN (LOTES)
CREATE TABLE IF NOT EXISTS public.lotes_produccion (
    id uuid default gen_random_uuid() primary key,
    codigo text unique not null,
    producto_id uuid references public.productos(id) not null,
    detalle_rollos jsonb, -- [{rollo_id, color, metros}]
    modelo_corte text,
    cantidad_total integer default 0,
    cantidad_real integer,
    estado text default 'planificado',
    progreso_porcentaje integer default 0,
    fecha_inicio date,
    fecha_fin date,
    creado_en timestamptz default now()
);

-- 6. E-COMMERCE (CARRITO Y PEDIDOS)
CREATE TABLE IF NOT EXISTS public.pedidos (
    id uuid default gen_random_uuid() primary key,
    codigo_pedido text unique not null,
    cliente_id uuid references public.clientes(id),
    cliente_nombre text not null,
    cliente_email text,
    cliente_telefono text not null,
    tipo_cliente_pedido text default 'minorista', -- 'minorista', 'mayorista'
    razon_social text,
    cuit text,
    tipo_factura text default 'consumidor_final',
    direccion_envio text not null,
    ciudad_envio text not null,
    codigo_postal_envio text,
    subtotal_minorista numeric default 0,
    subtotal_mayorista numeric default 0,
    total numeric not null,
    estado text default 'pendiente', -- 'pendiente', 'confirmado', 'en_preparacion', 'enviado', 'entregado'
    metodo_pago text,
    estado_pago text default 'pendiente',
    creado_en timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.pedido_items_minorista (
    id uuid default gen_random_uuid() primary key,
    pedido_id uuid references public.pedidos(id) on delete cascade not null,
    producto_id uuid references public.productos(id) not null,
    talle_id uuid references public.producto_talles(id) not null,
    cantidad integer not null,
    precio_unitario numeric not null,
    subtotal numeric not null
);

CREATE TABLE IF NOT EXISTS public.pedido_items_mayorista (
    id uuid default gen_random_uuid() primary key,
    pedido_id uuid references public.pedidos(id) on delete cascade not null,
    producto_id uuid references public.productos(id) not null,
    nombre_curva text not null,
    talles_incluidos jsonb not null, -- ['S', 'M', 'L']
    cantidad_curvas integer not null,
    precio_curva numeric not null,
    subtotal numeric not null
);

-- 7. SISTEMA DE STOCK Y RESERVAS
CREATE TABLE IF NOT EXISTS public.stock_reservas (
    id uuid default gen_random_uuid() primary key,
    producto_id uuid references public.productos(id) not null,
    talle_id uuid references public.producto_talles(id) not null,
    cantidad_reservada_minorista integer default 0,
    cantidad_reservada_mayorista integer default 0,
    ultimo_ajuste timestamptz default now(),
    unique(producto_id, talle_id)
);

-- 8. CONFIGURACIÓN
CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
    id uuid default gen_random_uuid() primary key,
    minimo_curvas_mayorista integer default 1,
    descuento_mayorista_porcentaje numeric default 15.00,
    requiere_cuit_mayorista boolean default true,
    actualizado_en timestamptz default now()
);

-- 9. FUNCIONES RPC
CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id uuid, p_talle_id uuid, quantity integer)
RETURNS void AS $$
BEGIN
  UPDATE public.producto_talles
  SET stock = stock + quantity
  WHERE producto_id = p_product_id AND id = p_talle_id;
  
  -- Sincronizar stock_total en la tabla productos
  UPDATE public.productos
  SET stock_total = (SELECT SUM(stock) FROM public.producto_talles WHERE producto_id = p_product_id)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. RLS POLICIES (Simplificadas para acceso rápido)
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products" ON public.productos FOR SELECT USING (true);
CREATE POLICY "Admin full access products" ON public.productos FOR ALL USING (true);

ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read categories" ON public.categorias FOR SELECT USING (true);
CREATE POLICY "Admin full access categories" ON public.categorias FOR ALL USING (true);

ALTER TABLE public.producto_talles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sizes" ON public.producto_talles FOR SELECT USING (true);
CREATE POLICY "Admin full access sizes" ON public.producto_talles FOR ALL USING (true);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert orders" ON public.pedidos FOR INSERT WITH CHECK (true);
CREATE POLICY "Admin view orders" ON public.pedidos FOR SELECT USING (true);

-- Nota: Activa RLS en el resto de tablas según necesites, aquí habilitamos lo crítico para el e-commerce.
