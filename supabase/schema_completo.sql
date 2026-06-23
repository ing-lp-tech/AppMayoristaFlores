-- ============================================================================
-- SCHEMA COMPLETO - SISTEMA TEXTIL PYME (MINORISTA & MAYORISTA)
-- ============================================================================
-- Archivo consolidado de toda la base de datos.
-- Ejecutar en orden en un proyecto Supabase nuevo (SQL Editor).
-- Fecha de consolidacion: 2026-06-23
-- ============================================================================
--
-- ORDEN DE EJECUCION:
--   PARTE 1: Extensiones y ENUMs
--   PARTE 2: Tablas base (sin FK cruzadas)
--   PARTE 3: Tablas dependientes (con FK)
--   PARTE 4: Tablas financieras
--   PARTE 5: Tablas de e-commerce (pedidos)
--   PARTE 6: Tablas auxiliares (stock, cupones, historial, costos)
--   PARTE 7: Funciones y Triggers
--   PARTE 8: Row Level Security (RLS)
--   PARTE 9: Grants de permisos
--   PARTE 10: Storage (buckets)
--   PARTE 11: Datos iniciales (seed)
-- ============================================================================


-- ============================================================================
-- PARTE 1: EXTENSIONES Y ENUMERACIONES
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'admin', 'produccion', 'ventas', 'inventario',
        'contador', 'repositor', 'cortador', 'doblador',
        'cliente', 'owner'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE proveedor_tipo AS ENUM ('tela', 'insumo', 'taller');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE estado_pago_tipo AS ENUM ('pendiente', 'parcial', 'pagado');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE categoria_gasto_tipo AS ENUM (
        'alquiler', 'servicios', 'sueldos', 'impuestos',
        'mantenimiento', 'transporte', 'marketing', 'otros'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tipo_aporte_enum AS ENUM ('inicial', 'adicional', 'extraordinario');
EXCEPTION WHEN duplicate_object THEN null; END $$;


-- ============================================================================
-- PARTE 2: TABLAS BASE (sin FK cruzadas)
-- ============================================================================

-- 2.1 USUARIOS INTERNOS
CREATE TABLE IF NOT EXISTS public.usuarios_internos (
    id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
    email text UNIQUE NOT NULL,
    nombre text NOT NULL,
    apellido text,
    rol user_role NOT NULL DEFAULT 'ventas',
    roles user_role[] DEFAULT ARRAY['cliente']::user_role[],
    telefono text,
    departamento text,
    activo boolean DEFAULT true,
    creado_en timestamptz DEFAULT now(),
    ultimo_login timestamptz
);

-- 2.2 CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text,
    nombre text NOT NULL,
    apellido text,
    telefono text NOT NULL,
    tipo_cliente text DEFAULT 'minorista',
    razon_social text,
    cuit text,
    rubro text,
    limite_credito numeric DEFAULT 0,
    direccion text,
    ciudad text,
    codigo_postal text,
    total_pedidos integer DEFAULT 0,
    total_gastado numeric DEFAULT 0,
    primer_pedido_date timestamptz,
    ultimo_pedido_date timestamptz,
    pedidos_como_mayorista integer DEFAULT 0,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now()
);

-- 2.3 CATEGORIAS
CREATE TABLE IF NOT EXISTS public.categorias (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    codigo text UNIQUE NOT NULL,
    descripcion text,
    imagen_url text,
    orden integer DEFAULT 0,
    visible_publico boolean DEFAULT true,
    permite_mayorista boolean DEFAULT true
);

-- 2.4 PROVEEDORES
CREATE TABLE IF NOT EXISTS public.proveedores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo text UNIQUE NOT NULL,
    nombre text NOT NULL,
    tipo proveedor_tipo NOT NULL,
    contacto text,
    telefono text,
    email text,
    saldo_actual numeric DEFAULT 0,
    direccion text,
    observaciones text,
    creado_en timestamptz DEFAULT now()
);

-- 2.5 DUENOS / SOCIOS
CREATE TABLE IF NOT EXISTS public.duenos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    apellido text NOT NULL,
    dni text UNIQUE NOT NULL,
    telefono_whatsapp text NOT NULL,
    email text,
    porcentaje_participacion numeric CHECK (porcentaje_participacion >= 0 AND porcentaje_participacion <= 100),
    activo boolean DEFAULT true,
    color_identificador text DEFAULT '#3B82F6',
    fecha_incorporacion date DEFAULT current_date,
    notas text,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now(),

    CONSTRAINT dni_valido CHECK (length(dni) >= 7 AND length(dni) <= 10),
    CONSTRAINT telefono_valido CHECK (length(telefono_whatsapp) >= 10)
);

CREATE INDEX IF NOT EXISTS idx_duenos_activo ON public.duenos(activo);
CREATE INDEX IF NOT EXISTS idx_duenos_dni ON public.duenos(dni);


-- ============================================================================
-- PARTE 3: TABLAS DEPENDIENTES (con FK)
-- ============================================================================

-- 3.1 PRODUCTOS
CREATE TABLE IF NOT EXISTS public.productos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo text UNIQUE NOT NULL,
    nombre text NOT NULL,
    descripcion_publica text,
    descripcion_interna text,
    categoria_id uuid REFERENCES public.categorias(id),
    tipo_prenda text,
    genero text,
    tela_principal text,
    color_base text,
    composicion text,
    cuidados text,
    imagenes text[] DEFAULT '{}',
    imagen_principal text,
    colores jsonb DEFAULT '[]',
    -- Precios duales
    precio_minorista numeric NOT NULL,
    precio_mayorista_curva numeric NOT NULL,
    precio_costo_base numeric,
    margen_minorista numeric DEFAULT 40.00,
    margen_mayorista numeric DEFAULT 25.00,
    -- Configuracion de curva mayorista
    curva_minima boolean DEFAULT true,
    talles_por_curva integer,
    descripcion_curva text,
    -- Stock
    stock_total integer DEFAULT 0,
    stock_minimo integer DEFAULT 10,
    -- Visibilidad
    visible_publico boolean DEFAULT true,
    destacado boolean DEFAULT false,
    disponible_minorista boolean DEFAULT true,
    disponible_mayorista boolean DEFAULT true,
    slug text UNIQUE,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now(),
    creado_por uuid REFERENCES public.usuarios_internos(id)
);

-- 3.2 PRODUCTO TALLES (tallas con stock por color)
CREATE TABLE IF NOT EXISTS public.producto_talles (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    producto_id uuid REFERENCES public.productos(id) ON DELETE CASCADE NOT NULL,
    talla_codigo text NOT NULL,
    talla_nombre text NOT NULL,
    orden integer DEFAULT 0,
    incluido_curva boolean DEFAULT true,
    stock integer DEFAULT 0,
    stock_minimo integer DEFAULT 5,
    disponible_publico boolean DEFAULT true,
    stock_por_color jsonb DEFAULT '{}'::jsonb,
    UNIQUE(producto_id, talla_codigo)
);

-- 3.3 ROLLOS DE TELA
CREATE TABLE IF NOT EXISTS public.rollos_tela (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo text UNIQUE NOT NULL,
    tipo_tela text NOT NULL,
    color text,
    metros_iniciales numeric NOT NULL,
    metros_restantes numeric NOT NULL,
    costo_por_metro numeric NOT NULL,
    ancho_cm numeric,
    peso_inicial numeric DEFAULT 0,
    peso_restante numeric DEFAULT 0,
    propietario text,
    proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
    estado text DEFAULT 'disponible',
    deleted_at timestamptz,
    updated_at timestamptz DEFAULT now(),
    creado_en timestamptz DEFAULT now()
);

-- 3.4 TIPOS DE TELA
CREATE TABLE IF NOT EXISTS public.tipos_tela (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    composicion text,
    proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
    onza text,
    precio_por_kilo numeric,
    creado_en timestamptz DEFAULT now()
);

-- 3.5 INSUMOS
CREATE TABLE IF NOT EXISTS public.insumos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo text UNIQUE NOT NULL,
    nombre text NOT NULL,
    stock_actual numeric DEFAULT 0,
    stock_minimo numeric DEFAULT 0,
    unidad_medida text NOT NULL,
    costo_unitario numeric,
    proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE SET NULL,
    creado_en timestamptz DEFAULT now()
);

-- 3.6 LOTES DE PRODUCCION
CREATE TABLE IF NOT EXISTS public.lotes_produccion (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo text UNIQUE NOT NULL,
    producto_id uuid REFERENCES public.productos(id) NOT NULL,
    detalle_rollos jsonb,
    tallas_distribucion jsonb DEFAULT '{}'::jsonb,
    modelo_corte text,
    cantidad_total integer DEFAULT 0,
    cantidad_real integer,
    cantidad_producto numeric DEFAULT 0,
    estado text DEFAULT 'planificado',
    progreso_porcentaje integer DEFAULT 0,
    fecha_inicio date,
    fecha_fin date,
    creado_en timestamptz DEFAULT now()
);

-- 3.7 RELACION USUARIOS <-> DUENOS
CREATE TABLE IF NOT EXISTS public.usuarios_duenos (
    usuario_id uuid NOT NULL REFERENCES public.usuarios_internos(id) ON DELETE CASCADE,
    dueno_id uuid NOT NULL REFERENCES public.duenos(id) ON DELETE CASCADE,
    creado_en timestamptz DEFAULT now(),
    creado_por uuid REFERENCES public.usuarios_internos(id),
    PRIMARY KEY (usuario_id, dueno_id),
    UNIQUE (dueno_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_duenos_usuario ON public.usuarios_duenos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_duenos_dueno ON public.usuarios_duenos(dueno_id);


-- ============================================================================
-- PARTE 4: TABLAS FINANCIERAS
-- ============================================================================

-- 4.1 COMPRAS A PROVEEDORES
CREATE TABLE IF NOT EXISTS public.compras_proveedores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dueno_id uuid REFERENCES public.duenos(id) ON DELETE RESTRICT NOT NULL,
    proveedor_id uuid REFERENCES public.proveedores(id) ON DELETE RESTRICT NOT NULL,
    codigo_compra text UNIQUE NOT NULL,
    fecha_compra date NOT NULL DEFAULT current_date,
    fecha_vencimiento date,
    monto_total numeric NOT NULL CHECK (monto_total >= 0),
    monto_pagado numeric DEFAULT 0 CHECK (monto_pagado >= 0),
    monto_pendiente numeric GENERATED ALWAYS AS (monto_total - monto_pagado) STORED,
    estado_pago estado_pago_tipo DEFAULT 'pendiente',
    metodo_pago text,
    descripcion text,
    items jsonb,
    notas text,
    comprobante_url text,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now(),
    creado_por uuid REFERENCES public.usuarios_internos(id),

    CONSTRAINT monto_pagado_no_excede_total CHECK (monto_pagado <= monto_total),
    CONSTRAINT fecha_vencimiento_posterior CHECK (fecha_vencimiento IS NULL OR fecha_vencimiento >= fecha_compra)
);

CREATE INDEX IF NOT EXISTS idx_compras_dueno ON public.compras_proveedores(dueno_id);
CREATE INDEX IF NOT EXISTS idx_compras_proveedor ON public.compras_proveedores(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_compras_estado ON public.compras_proveedores(estado_pago);
CREATE INDEX IF NOT EXISTS idx_compras_fecha ON public.compras_proveedores(fecha_compra DESC);

-- 4.2 PAGOS A PROVEEDORES
CREATE TABLE IF NOT EXISTS public.pagos_proveedores (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    compra_id uuid REFERENCES public.compras_proveedores(id) ON DELETE RESTRICT NOT NULL,
    dueno_id uuid REFERENCES public.duenos(id) ON DELETE RESTRICT NOT NULL,
    fecha_pago date NOT NULL DEFAULT current_date,
    monto numeric NOT NULL CHECK (monto > 0),
    metodo_pago text NOT NULL,
    numero_comprobante text,
    notas text,
    comprobante_url text,
    creado_en timestamptz DEFAULT now(),
    creado_por uuid REFERENCES public.usuarios_internos(id)
);

CREATE INDEX IF NOT EXISTS idx_pagos_compra ON public.pagos_proveedores(compra_id);
CREATE INDEX IF NOT EXISTS idx_pagos_dueno ON public.pagos_proveedores(dueno_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha ON public.pagos_proveedores(fecha_pago DESC);

-- 4.3 GASTOS OPERATIVOS
CREATE TABLE IF NOT EXISTS public.gastos_operativos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dueno_id uuid REFERENCES public.duenos(id) ON DELETE RESTRICT NOT NULL,
    categoria categoria_gasto_tipo NOT NULL,
    concepto text NOT NULL,
    fecha_gasto date NOT NULL DEFAULT current_date,
    monto numeric NOT NULL CHECK (monto > 0),
    metodo_pago text,
    descripcion text,
    notas text,
    comprobante_url text,
    es_recurrente boolean DEFAULT false,
    creado_en timestamptz DEFAULT now(),
    actualizado_en timestamptz DEFAULT now(),
    creado_por uuid REFERENCES public.usuarios_internos(id)
);

CREATE INDEX IF NOT EXISTS idx_gastos_dueno ON public.gastos_operativos(dueno_id);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON public.gastos_operativos(categoria);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos_operativos(fecha_gasto DESC);
CREATE INDEX IF NOT EXISTS idx_gastos_recurrente ON public.gastos_operativos(es_recurrente) WHERE es_recurrente = true;

-- 4.4 APORTES DE CAPITAL
CREATE TABLE IF NOT EXISTS public.aportes_capital (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dueno_id uuid REFERENCES public.duenos(id) ON DELETE RESTRICT NOT NULL,
    fecha_aporte date NOT NULL DEFAULT current_date,
    monto numeric NOT NULL CHECK (monto > 0),
    tipo_aporte tipo_aporte_enum NOT NULL,
    metodo text,
    concepto text,
    notas text,
    comprobante_url text,
    creado_en timestamptz DEFAULT now(),
    creado_por uuid REFERENCES public.usuarios_internos(id)
);

CREATE INDEX IF NOT EXISTS idx_aportes_dueno ON public.aportes_capital(dueno_id);
CREATE INDEX IF NOT EXISTS idx_aportes_fecha ON public.aportes_capital(fecha_aporte DESC);
CREATE INDEX IF NOT EXISTS idx_aportes_tipo ON public.aportes_capital(tipo_aporte);

-- 4.5 RETIROS DE CAPITAL
CREATE TABLE IF NOT EXISTS public.retiros_capital (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    dueno_id uuid REFERENCES public.duenos(id) ON DELETE RESTRICT NOT NULL,
    fecha_retiro date NOT NULL DEFAULT current_date,
    monto numeric NOT NULL CHECK (monto > 0),
    concepto text NOT NULL,
    metodo text,
    notas text,
    comprobante_url text,
    aprobado_por uuid REFERENCES public.usuarios_internos(id),
    fecha_aprobacion timestamptz,
    creado_en timestamptz DEFAULT now(),
    creado_por uuid REFERENCES public.usuarios_internos(id)
);

CREATE INDEX IF NOT EXISTS idx_retiros_dueno ON public.retiros_capital(dueno_id);
CREATE INDEX IF NOT EXISTS idx_retiros_fecha ON public.retiros_capital(fecha_retiro DESC);


-- ============================================================================
-- PARTE 5: TABLAS DE E-COMMERCE (PEDIDOS)
-- ============================================================================

-- 5.1 PEDIDOS
CREATE TABLE IF NOT EXISTS public.pedidos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    codigo_pedido text UNIQUE NOT NULL,
    cliente_id uuid REFERENCES public.clientes(id),
    cliente_nombre text NOT NULL,
    cliente_email text,
    cliente_telefono text NOT NULL,
    tipo_cliente_pedido text DEFAULT 'minorista',
    razon_social text,
    cuit text,
    tipo_factura text DEFAULT 'consumidor_final',
    direccion_envio text NOT NULL,
    ciudad_envio text NOT NULL,
    codigo_postal_envio text,
    subtotal_minorista numeric DEFAULT 0,
    subtotal_mayorista numeric DEFAULT 0,
    total numeric NOT NULL,
    estado text DEFAULT 'pendiente',
    metodo_pago text,
    estado_pago text DEFAULT 'pendiente',
    notas text,
    -- Pagos parciales / MercadoPago
    pago_tipo text DEFAULT 'total',
    monto_pagado numeric DEFAULT 0,
    monto_pendiente numeric DEFAULT 0,
    mercadopago_preference_id text,
    mercadopago_status text,
    creado_en timestamptz DEFAULT now()
);

-- 5.2 ITEMS MINORISTA
CREATE TABLE IF NOT EXISTS public.pedido_items_minorista (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
    producto_id uuid REFERENCES public.productos(id) NOT NULL,
    talle_id uuid REFERENCES public.producto_talles(id),
    cantidad integer NOT NULL,
    precio_unitario numeric NOT NULL,
    subtotal numeric NOT NULL,
    color_nombre text,
    color_hex text
);

-- 5.3 ITEMS MAYORISTA
CREATE TABLE IF NOT EXISTS public.pedido_items_mayorista (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_id uuid REFERENCES public.pedidos(id) ON DELETE CASCADE NOT NULL,
    producto_id uuid REFERENCES public.productos(id) NOT NULL,
    nombre_curva text NOT NULL,
    talles_incluidos jsonb NOT NULL,
    cantidad_curvas integer NOT NULL,
    precio_curva numeric NOT NULL,
    subtotal numeric NOT NULL,
    variaciones jsonb DEFAULT '[]'::jsonb
);


-- ============================================================================
-- PARTE 6: TABLAS AUXILIARES
-- ============================================================================

-- 6.1 RESERVAS DE STOCK
CREATE TABLE IF NOT EXISTS public.stock_reservas (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    producto_id uuid REFERENCES public.productos(id) NOT NULL,
    talle_id uuid REFERENCES public.producto_talles(id) NOT NULL,
    cantidad_reservada_minorista integer DEFAULT 0,
    cantidad_reservada_mayorista integer DEFAULT 0,
    ultimo_ajuste timestamptz DEFAULT now(),
    UNIQUE(producto_id, talle_id)
);

-- 6.2 CUPONES DE DESCUENTO
CREATE TABLE IF NOT EXISTS public.cupones_descuento (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo varchar(50) UNIQUE NOT NULL,
    descuento_porcentaje numeric(5,2) NOT NULL CHECK (descuento_porcentaje > 0 AND descuento_porcentaje <= 100),
    fecha_expiracion timestamptz NOT NULL,
    activo boolean DEFAULT true,
    creado_en timestamptz DEFAULT now()
);

-- 6.3 HISTORIAL DE MOVIMIENTOS DE STOCK
CREATE TABLE IF NOT EXISTS public.movimientos_stock_productos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha timestamptz DEFAULT now(),
    tipo_movimiento varchar(20) NOT NULL CHECK (tipo_movimiento IN ('entrada_produccion', 'salida_venta', 'ajuste')),
    producto_id uuid NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
    talle_id uuid NOT NULL REFERENCES public.producto_talles(id) ON DELETE CASCADE,
    talle varchar(50) NOT NULL,
    color varchar(100) NOT NULL,
    cantidad integer NOT NULL,
    referencia_tipo varchar(50) NOT NULL CHECK (referencia_tipo IN ('pedido', 'lote_produccion', 'manual')),
    referencia_id uuid,
    usuario_id uuid REFERENCES public.usuarios_internos(id) ON DELETE SET NULL,
    creado_en timestamptz DEFAULT now()
);

-- 6.4 CALCULOS DE COSTOS POR LOTE
CREATE TABLE IF NOT EXISTS public.calculos_costos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lote_id uuid REFERENCES public.lotes_produccion(id) ON DELETE CASCADE,
    producto_id uuid REFERENCES public.productos(id),
    fecha date DEFAULT current_date,
    fabric_unit text CHECK (fabric_unit IN ('metros', 'kilos')),
    fabric_qty numeric DEFAULT 0,
    fabric_price numeric DEFAULT 0,
    costo_tela_total numeric DEFAULT 0,
    costo_costura_total numeric DEFAULT 0,
    costo_insumos_total numeric DEFAULT 0,
    costo_total numeric DEFAULT 0,
    costo_unitario numeric DEFAULT 0,
    margen_ganancia numeric DEFAULT 30,
    precio_venta numeric DEFAULT 0,
    detalle_insumos jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6.5 CONFIGURACION DEL SISTEMA
CREATE TABLE IF NOT EXISTS public.configuracion_sistema (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    minimo_curvas_mayorista integer DEFAULT 1,
    descuento_mayorista_porcentaje numeric DEFAULT 15.00,
    requiere_cuit_mayorista boolean DEFAULT true,
    whatsapp_pedidos text DEFAULT '',
    actualizado_en timestamptz DEFAULT now()
);


-- ============================================================================
-- PARTE 7: FUNCIONES Y TRIGGERS
-- ============================================================================

-- 7.1 INCREMENTAR STOCK (RPC)
CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id uuid, p_talle_id uuid, quantity integer)
RETURNS void AS $$
BEGIN
    UPDATE public.producto_talles
    SET stock = stock + quantity
    WHERE producto_id = p_product_id AND id = p_talle_id;

    UPDATE public.productos
    SET stock_total = (SELECT COALESCE(SUM(stock), 0) FROM public.producto_talles WHERE producto_id = p_product_id)
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.2 GENERAR CODIGO DE COMPRA
CREATE OR REPLACE FUNCTION generar_codigo_compra()
RETURNS text AS $$
DECLARE
    nuevo_codigo text;
    existe boolean;
BEGIN
    LOOP
        nuevo_codigo := 'COMP-' || to_char(current_date, 'YYYYMMDD') || '-' ||
                       lpad(floor(random() * 9999)::text, 4, '0');
        SELECT EXISTS(SELECT 1 FROM public.compras_proveedores WHERE codigo_compra = nuevo_codigo) INTO existe;
        EXIT WHEN NOT existe;
    END LOOP;
    RETURN nuevo_codigo;
END;
$$ LANGUAGE plpgsql;

-- 7.3 TRIGGER: Auto-generar codigo de compra
CREATE OR REPLACE FUNCTION set_codigo_compra()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.codigo_compra IS NULL OR NEW.codigo_compra = '' THEN
        NEW.codigo_compra := generar_codigo_compra();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_codigo_compra ON public.compras_proveedores;
CREATE TRIGGER trigger_set_codigo_compra
    BEFORE INSERT ON public.compras_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION set_codigo_compra();

-- 7.4 TRIGGER: Timestamp de compras
CREATE OR REPLACE FUNCTION update_compras_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_compras_timestamp ON public.compras_proveedores;
CREATE TRIGGER trigger_update_compras_timestamp
    BEFORE UPDATE ON public.compras_proveedores
    FOR EACH ROW
    EXECUTE FUNCTION update_compras_timestamp();

-- 7.5 TRIGGER: Timestamp de duenos
CREATE OR REPLACE FUNCTION update_duenos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_duenos_timestamp ON public.duenos;
CREATE TRIGGER trigger_update_duenos_timestamp
    BEFORE UPDATE ON public.duenos
    FOR EACH ROW
    EXECUTE FUNCTION update_duenos_timestamp();

-- 7.6 TRIGGER: Timestamp de gastos
CREATE OR REPLACE FUNCTION update_gastos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_gastos_timestamp ON public.gastos_operativos;
CREATE TRIGGER trigger_update_gastos_timestamp
    BEFORE UPDATE ON public.gastos_operativos
    FOR EACH ROW
    EXECUTE FUNCTION update_gastos_timestamp();

-- 7.7 TRIGGER: Actualizar monto pagado en compra al registrar pago
CREATE OR REPLACE FUNCTION actualizar_monto_pagado_compra()
RETURNS TRIGGER AS $$
DECLARE
    total_pagado numeric;
    compra_total numeric;
BEGIN
    SELECT COALESCE(SUM(monto), 0)
    INTO total_pagado
    FROM public.pagos_proveedores
    WHERE compra_id = COALESCE(NEW.compra_id, OLD.compra_id);

    SELECT monto_total
    INTO compra_total
    FROM public.compras_proveedores
    WHERE id = COALESCE(NEW.compra_id, OLD.compra_id);

    UPDATE public.compras_proveedores
    SET
        monto_pagado = total_pagado,
        estado_pago = CASE
            WHEN total_pagado = 0 THEN 'pendiente'::estado_pago_tipo
            WHEN total_pagado < compra_total THEN 'parcial'::estado_pago_tipo
            WHEN total_pagado >= compra_total THEN 'pagado'::estado_pago_tipo
        END,
        actualizado_en = now()
    WHERE id = COALESCE(NEW.compra_id, OLD.compra_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_monto_pagado_insert ON public.pagos_proveedores;
CREATE TRIGGER trigger_actualizar_monto_pagado_insert
    AFTER INSERT ON public.pagos_proveedores
    FOR EACH ROW EXECUTE FUNCTION actualizar_monto_pagado_compra();

DROP TRIGGER IF EXISTS trigger_actualizar_monto_pagado_update ON public.pagos_proveedores;
CREATE TRIGGER trigger_actualizar_monto_pagado_update
    AFTER UPDATE ON public.pagos_proveedores
    FOR EACH ROW EXECUTE FUNCTION actualizar_monto_pagado_compra();

DROP TRIGGER IF EXISTS trigger_actualizar_monto_pagado_delete ON public.pagos_proveedores;
CREATE TRIGGER trigger_actualizar_monto_pagado_delete
    AFTER DELETE ON public.pagos_proveedores
    FOR EACH ROW EXECUTE FUNCTION actualizar_monto_pagado_compra();

-- 7.8 VALIDACION: Pago no excede monto pendiente
CREATE OR REPLACE FUNCTION validar_monto_pago()
RETURNS TRIGGER AS $$
DECLARE
    monto_pendiente_actual numeric;
BEGIN
    SELECT (monto_total - monto_pagado)
    INTO monto_pendiente_actual
    FROM public.compras_proveedores
    WHERE id = NEW.compra_id;

    IF NEW.monto > monto_pendiente_actual THEN
        RAISE EXCEPTION 'El monto del pago (%) excede el monto pendiente (%)',
            NEW.monto, monto_pendiente_actual;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validar_monto_pago ON public.pagos_proveedores;
CREATE TRIGGER trigger_validar_monto_pago
    BEFORE INSERT OR UPDATE ON public.pagos_proveedores
    FOR EACH ROW EXECUTE FUNCTION validar_monto_pago();

-- 7.9 DESCONTAR STOCK AL ENTREGAR PEDIDO (con historial)
CREATE OR REPLACE FUNCTION public.descontar_stock_al_entregar()
RETURNS TRIGGER AS $$
DECLARE
    item_minorista RECORD;
    item_mayorista RECORD;
    v_variacion jsonb;
    v_color_nombre text;
    v_talle_codigo text;
    v_cantidad numeric;
    v_talle_id uuid;
    v_talle_nombre text;
    v_usuario_id uuid;
BEGIN
    IF (NEW.estado = 'entregado' AND OLD.estado != 'entregado') THEN

        v_usuario_id := auth.uid();

        -- ITEMS MINORISTAS
        FOR item_minorista IN SELECT * FROM pedido_items_minorista WHERE pedido_id = NEW.id LOOP
            UPDATE productos
            SET stock_total = GREATEST(0, stock_total - item_minorista.cantidad)
            WHERE id = item_minorista.producto_id;

            UPDATE producto_talles
            SET stock = GREATEST(0, stock - item_minorista.cantidad)
            WHERE id = item_minorista.talle_id
            RETURNING talla_codigo INTO v_talle_nombre;

            IF item_minorista.color_nombre IS NOT NULL THEN
                UPDATE producto_talles
                SET stock_por_color =
                    CASE
                        WHEN stock_por_color ? item_minorista.color_nombre THEN
                            jsonb_set(
                                stock_por_color,
                                array[item_minorista.color_nombre],
                                to_jsonb(GREATEST(0, (stock_por_color->>item_minorista.color_nombre)::int - item_minorista.cantidad))
                            )
                        ELSE stock_por_color
                    END
                WHERE id = item_minorista.talle_id;

                INSERT INTO public.movimientos_stock_productos (
                    fecha, tipo_movimiento, producto_id, talle_id, talle, color, cantidad, referencia_tipo, referencia_id, usuario_id
                ) VALUES (
                    now(), 'salida_venta', item_minorista.producto_id, item_minorista.talle_id,
                    v_talle_nombre, item_minorista.color_nombre, item_minorista.cantidad, 'pedido', NEW.id, v_usuario_id
                );
            END IF;
        END LOOP;

        -- ITEMS MAYORISTAS
        FOR item_mayorista IN SELECT * FROM pedido_items_mayorista WHERE pedido_id = NEW.id LOOP
            IF item_mayorista.variaciones IS NOT NULL AND jsonb_typeof(item_mayorista.variaciones) = 'array' THEN
                FOR v_variacion IN SELECT * FROM jsonb_array_elements(item_mayorista.variaciones) LOOP
                    v_talle_codigo := v_variacion->>'talle';
                    v_color_nombre := v_variacion->'color'->>'nombre';
                    v_cantidad := (v_variacion->>'cantidad')::numeric;

                    SELECT id INTO v_talle_id
                    FROM producto_talles
                    WHERE producto_id = item_mayorista.producto_id AND talla_codigo = v_talle_codigo;

                    IF v_talle_id IS NOT NULL THEN
                        UPDATE producto_talles SET stock = GREATEST(0, stock - v_cantidad) WHERE id = v_talle_id;

                        UPDATE producto_talles
                        SET stock_por_color =
                            CASE
                                WHEN stock_por_color ? v_color_nombre THEN
                                    jsonb_set(
                                        stock_por_color,
                                        array[v_color_nombre],
                                        to_jsonb(GREATEST(0, (stock_por_color->>v_color_nombre)::int - v_cantidad))
                                    )
                                ELSE stock_por_color
                            END
                        WHERE id = v_talle_id;

                        UPDATE productos SET stock_total = GREATEST(0, stock_total - v_cantidad) WHERE id = item_mayorista.producto_id;

                        INSERT INTO public.movimientos_stock_productos (
                            fecha, tipo_movimiento, producto_id, talle_id, talle, color, cantidad, referencia_tipo, referencia_id, usuario_id
                        ) VALUES (
                            now(), 'salida_venta', item_mayorista.producto_id, v_talle_id,
                            v_talle_codigo, v_color_nombre, v_cantidad, 'pedido', NEW.id, v_usuario_id
                        );
                    END IF;
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_descontar_stock_entregado ON public.pedidos;
CREATE TRIGGER trigger_descontar_stock_entregado
    AFTER UPDATE ON public.pedidos
    FOR EACH ROW
    EXECUTE FUNCTION public.descontar_stock_al_entregar();

-- 7.10 CONSUMIR ROLLOS POR LOTE (kg)
CREATE OR REPLACE FUNCTION public.consume_rolls_for_batch(p_batch_id uuid, p_rolls jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    r_record jsonb;
    r_id uuid;
    kg_to_consume numeric;
    new_peso_restante numeric;
BEGIN
    IF p_rolls IS NULL OR jsonb_array_length(p_rolls) = 0 THEN
        RETURN;
    END IF;

    FOR r_record IN SELECT * FROM jsonb_array_elements(p_rolls)
    LOOP
        r_id := (r_record->>'rollo_id')::uuid;
        kg_to_consume := (r_record->>'kg_consumido')::numeric;

        IF r_id IS NOT NULL AND kg_to_consume > 0 THEN
            SELECT GREATEST(0, peso_restante - kg_to_consume)
            INTO new_peso_restante
            FROM public.rollos_tela
            WHERE id = r_id;

            UPDATE public.rollos_tela
            SET
                peso_restante = new_peso_restante,
                updated_at = now(),
                estado = CASE
                    WHEN new_peso_restante <= 0.1 THEN 'agotado'
                    ELSE 'usado'
                END
            WHERE id = r_id;
        END IF;
    END LOOP;
END;
$$;

-- 7.11 AJUSTAR CONSUMO DE ROLLO (edicion de lote)
CREATE OR REPLACE FUNCTION public.adjust_roll_consumption(
    p_rollo_id uuid,
    p_kg_anterior numeric,
    p_kg_nuevo numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    delta numeric;
    current_peso_restante numeric;
    new_peso_restante numeric;
BEGIN
    delta := p_kg_nuevo - p_kg_anterior;

    IF delta = 0 THEN RETURN; END IF;

    SELECT peso_restante INTO current_peso_restante
    FROM public.rollos_tela WHERE id = p_rollo_id;

    IF NOT FOUND THEN RETURN; END IF;

    new_peso_restante := GREATEST(0, current_peso_restante - delta);

    UPDATE public.rollos_tela
    SET
        peso_restante = new_peso_restante,
        updated_at = now(),
        estado = CASE
            WHEN new_peso_restante <= 0.1 THEN 'agotado'
            WHEN new_peso_restante >= (SELECT peso_inicial FROM public.rollos_tela WHERE id = p_rollo_id) * 0.98 THEN 'disponible'
            ELSE 'usado'
        END
    WHERE id = p_rollo_id;
END;
$$;

-- 7.12 FUNCIONES FINANCIERAS

-- Calcular saldo de un dueno
CREATE OR REPLACE FUNCTION calcular_saldo_dueno(p_dueno_id uuid)
RETURNS numeric AS $$
DECLARE
    total_aportes numeric;
    total_retiros numeric;
    total_compras numeric;
    total_gastos numeric;
BEGIN
    SELECT COALESCE(SUM(monto), 0) INTO total_aportes
    FROM public.aportes_capital WHERE dueno_id = p_dueno_id;

    SELECT COALESCE(SUM(monto), 0) INTO total_retiros
    FROM public.retiros_capital WHERE dueno_id = p_dueno_id;

    SELECT COALESCE(SUM(monto_pendiente), 0) INTO total_compras
    FROM public.compras_proveedores WHERE dueno_id = p_dueno_id;

    SELECT COALESCE(SUM(monto), 0) INTO total_gastos
    FROM public.gastos_operativos WHERE dueno_id = p_dueno_id;

    RETURN total_aportes - total_retiros - total_compras - total_gastos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resumen financiero de un dueno (por periodo)
CREATE OR REPLACE FUNCTION get_resumen_financiero_dueno(
    p_dueno_id uuid,
    p_fecha_desde date DEFAULT NULL,
    p_fecha_hasta date DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    resultado json;
    fecha_desde_final date;
    fecha_hasta_final date;
BEGIN
    fecha_desde_final := COALESCE(p_fecha_desde, '2000-01-01'::date);
    fecha_hasta_final := COALESCE(p_fecha_hasta, current_date);

    SELECT json_build_object(
        'dueno_id', p_dueno_id,
        'periodo', json_build_object('desde', fecha_desde_final, 'hasta', fecha_hasta_final),
        'aportes', json_build_object(
            'total', COALESCE((SELECT SUM(monto) FROM public.aportes_capital WHERE dueno_id = p_dueno_id AND fecha_aporte BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'cantidad', COALESCE((SELECT COUNT(*) FROM public.aportes_capital WHERE dueno_id = p_dueno_id AND fecha_aporte BETWEEN fecha_desde_final AND fecha_hasta_final), 0)
        ),
        'retiros', json_build_object(
            'total', COALESCE((SELECT SUM(monto) FROM public.retiros_capital WHERE dueno_id = p_dueno_id AND fecha_retiro BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'cantidad', COALESCE((SELECT COUNT(*) FROM public.retiros_capital WHERE dueno_id = p_dueno_id AND fecha_retiro BETWEEN fecha_desde_final AND fecha_hasta_final), 0)
        ),
        'compras', json_build_object(
            'total', COALESCE((SELECT SUM(monto_total) FROM public.compras_proveedores WHERE dueno_id = p_dueno_id AND fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'pagado', COALESCE((SELECT SUM(monto_pagado) FROM public.compras_proveedores WHERE dueno_id = p_dueno_id AND fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'pendiente', COALESCE((SELECT SUM(monto_pendiente) FROM public.compras_proveedores WHERE dueno_id = p_dueno_id AND fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'cantidad', COALESCE((SELECT COUNT(*) FROM public.compras_proveedores WHERE dueno_id = p_dueno_id AND fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final), 0)
        ),
        'pagos', json_build_object(
            'total', COALESCE((SELECT SUM(monto) FROM public.pagos_proveedores WHERE dueno_id = p_dueno_id AND fecha_pago BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'cantidad', COALESCE((SELECT COUNT(*) FROM public.pagos_proveedores WHERE dueno_id = p_dueno_id AND fecha_pago BETWEEN fecha_desde_final AND fecha_hasta_final), 0)
        ),
        'gastos', json_build_object(
            'total', COALESCE((SELECT SUM(monto) FROM public.gastos_operativos WHERE dueno_id = p_dueno_id AND fecha_gasto BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'cantidad', COALESCE((SELECT COUNT(*) FROM public.gastos_operativos WHERE dueno_id = p_dueno_id AND fecha_gasto BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'por_categoria', COALESCE((
                SELECT json_object_agg(categoria, total)
                FROM (SELECT categoria, SUM(monto) as total FROM public.gastos_operativos WHERE dueno_id = p_dueno_id AND fecha_gasto BETWEEN fecha_desde_final AND fecha_hasta_final GROUP BY categoria) sub
            ), '{}'::json)
        ),
        'saldo_actual', calcular_saldo_dueno(p_dueno_id)
    ) INTO resultado;

    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Resumen consolidado de todos los duenos
CREATE OR REPLACE FUNCTION get_resumen_consolidado(
    p_fecha_desde date DEFAULT NULL,
    p_fecha_hasta date DEFAULT NULL
)
RETURNS json AS $$
DECLARE
    resultado json;
    fecha_desde_final date;
    fecha_hasta_final date;
BEGIN
    fecha_desde_final := COALESCE(p_fecha_desde, '2000-01-01'::date);
    fecha_hasta_final := COALESCE(p_fecha_hasta, current_date);

    SELECT json_build_object(
        'periodo', json_build_object('desde', fecha_desde_final, 'hasta', fecha_hasta_final),
        'por_dueno', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'dueno', json_build_object('id', d.id, 'nombre', d.nombre || ' ' || d.apellido, 'color', d.color_identificador),
                    'resumen', get_resumen_financiero_dueno(d.id, fecha_desde_final, fecha_hasta_final)
                )
            )
            FROM public.duenos d WHERE d.activo = true ORDER BY d.nombre
        ), '[]'::json),
        'totales', json_build_object(
            'aportes', COALESCE((SELECT SUM(monto) FROM public.aportes_capital WHERE fecha_aporte BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'retiros', COALESCE((SELECT SUM(monto) FROM public.retiros_capital WHERE fecha_retiro BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'compras', COALESCE((SELECT SUM(monto_total) FROM public.compras_proveedores WHERE fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'pendiente', COALESCE((SELECT SUM(monto_pendiente) FROM public.compras_proveedores WHERE fecha_compra BETWEEN fecha_desde_final AND fecha_hasta_final), 0),
            'gastos', COALESCE((SELECT SUM(monto) FROM public.gastos_operativos WHERE fecha_gasto BETWEEN fecha_desde_final AND fecha_hasta_final), 0)
        )
    ) INTO resultado;

    RETURN resultado;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deudas pendientes por proveedor
CREATE OR REPLACE FUNCTION get_deudas_por_proveedor(p_dueno_id uuid DEFAULT NULL)
RETURNS TABLE (
    proveedor_id uuid,
    proveedor_nombre text,
    total_compras numeric,
    total_pagado numeric,
    total_pendiente numeric,
    cantidad_compras bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        prov.id as proveedor_id,
        prov.nombre as proveedor_nombre,
        COALESCE(SUM(cp.monto_total), 0) as total_compras,
        COALESCE(SUM(cp.monto_pagado), 0) as total_pagado,
        COALESCE(SUM(cp.monto_pendiente), 0) as total_pendiente,
        COUNT(cp.id) as cantidad_compras
    FROM public.proveedores prov
    LEFT JOIN public.compras_proveedores cp ON cp.proveedor_id = prov.id
    WHERE
        (p_dueno_id IS NULL OR cp.dueno_id = p_dueno_id)
        AND cp.monto_pendiente > 0
    GROUP BY prov.id, prov.nombre
    HAVING SUM(cp.monto_pendiente) > 0
    ORDER BY total_pendiente DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7.13 HELPER: Obtener dueno del usuario actual
CREATE OR REPLACE FUNCTION get_dueno_id_from_user()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT dueno_id
    FROM public.usuarios_duenos
    WHERE usuario_id = auth.uid()
    LIMIT 1;
$$;


-- ============================================================================
-- PARTE 8: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- PRODUCTOS
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read products" ON public.productos;
CREATE POLICY "Public read products" ON public.productos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access products" ON public.productos;
CREATE POLICY "Admin full access products" ON public.productos FOR ALL USING (true);

-- CATEGORIAS
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.categorias;
CREATE POLICY "Public read categories" ON public.categorias FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access categories" ON public.categorias;
CREATE POLICY "Admin full access categories" ON public.categorias FOR ALL USING (true);

-- PRODUCTO TALLES
ALTER TABLE public.producto_talles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read sizes" ON public.producto_talles;
CREATE POLICY "Public read sizes" ON public.producto_talles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full access sizes" ON public.producto_talles;
CREATE POLICY "Admin full access sizes" ON public.producto_talles FOR ALL USING (true);

-- PEDIDOS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public insert orders" ON public.pedidos;
CREATE POLICY "Public insert orders" ON public.pedidos FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin view orders" ON public.pedidos;
CREATE POLICY "Admin view orders" ON public.pedidos FOR SELECT USING (true);
DROP POLICY IF EXISTS "public_can_insert_pedidos" ON public.pedidos;
CREATE POLICY "public_can_insert_pedidos" ON public.pedidos FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "public_can_select_own_pedido" ON public.pedidos;
CREATE POLICY "public_can_select_own_pedido" ON public.pedidos FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "public_can_update_pedido_mp" ON public.pedidos;
CREATE POLICY "public_can_update_pedido_mp" ON public.pedidos FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- PEDIDO ITEMS MINORISTA
ALTER TABLE public.pedido_items_minorista ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_can_insert_items_minorista" ON public.pedido_items_minorista;
CREATE POLICY "public_can_insert_items_minorista" ON public.pedido_items_minorista FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Admin full access items_min" ON public.pedido_items_minorista;
CREATE POLICY "Admin full access items_min" ON public.pedido_items_minorista FOR ALL USING (true);

-- PEDIDO ITEMS MAYORISTA
ALTER TABLE public.pedido_items_mayorista ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_can_insert_items_mayorista" ON public.pedido_items_mayorista;
CREATE POLICY "public_can_insert_items_mayorista" ON public.pedido_items_mayorista FOR INSERT TO anon WITH CHECK (true);
DROP POLICY IF EXISTS "Admin full access items_may" ON public.pedido_items_mayorista;
CREATE POLICY "Admin full access items_may" ON public.pedido_items_mayorista FOR ALL USING (true);

-- DUENOS
ALTER TABLE public.duenos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access duenos" ON public.duenos;
CREATE POLICY "Admin full access duenos" ON public.duenos FOR ALL
    USING (EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND rol = 'admin'));
DROP POLICY IF EXISTS "Authenticated read duenos" ON public.duenos;
CREATE POLICY "Authenticated read duenos" ON public.duenos FOR SELECT
    USING (auth.role() = 'authenticated');

-- COMPRAS PROVEEDORES
ALTER TABLE public.compras_proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access compras" ON public.compras_proveedores;
CREATE POLICY "Admin full access compras" ON public.compras_proveedores FOR ALL
    USING (EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND rol = 'admin'));
DROP POLICY IF EXISTS "Dueno read own compras" ON public.compras_proveedores;
CREATE POLICY "Dueno read own compras" ON public.compras_proveedores FOR SELECT
    USING (dueno_id IN (SELECT d.id FROM public.duenos d WHERE auth.role() = 'authenticated'));

-- PAGOS PROVEEDORES
ALTER TABLE public.pagos_proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access pagos" ON public.pagos_proveedores;
CREATE POLICY "Admin full access pagos" ON public.pagos_proveedores FOR ALL
    USING (EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND rol = 'admin'));
DROP POLICY IF EXISTS "Dueno read own pagos" ON public.pagos_proveedores;
CREATE POLICY "Dueno read own pagos" ON public.pagos_proveedores FOR SELECT
    USING (dueno_id IN (SELECT d.id FROM public.duenos d WHERE auth.role() = 'authenticated'));

-- GASTOS OPERATIVOS
ALTER TABLE public.gastos_operativos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access gastos" ON public.gastos_operativos;
CREATE POLICY "Admin full access gastos" ON public.gastos_operativos FOR ALL
    USING (EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND rol = 'admin'));
DROP POLICY IF EXISTS "Dueno read own gastos" ON public.gastos_operativos;
CREATE POLICY "Dueno read own gastos" ON public.gastos_operativos FOR SELECT
    USING (dueno_id IN (SELECT d.id FROM public.duenos d WHERE auth.role() = 'authenticated'));

-- APORTES CAPITAL
ALTER TABLE public.aportes_capital ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access aportes" ON public.aportes_capital;
CREATE POLICY "Admin full access aportes" ON public.aportes_capital FOR ALL
    USING (EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND rol = 'admin'));
DROP POLICY IF EXISTS "Dueno read own aportes" ON public.aportes_capital;
CREATE POLICY "Dueno read own aportes" ON public.aportes_capital FOR SELECT
    USING (dueno_id IN (SELECT d.id FROM public.duenos d WHERE auth.role() = 'authenticated'));

-- RETIROS CAPITAL
ALTER TABLE public.retiros_capital ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access retiros" ON public.retiros_capital;
CREATE POLICY "Admin full access retiros" ON public.retiros_capital FOR ALL
    USING (EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND rol = 'admin'));
DROP POLICY IF EXISTS "Dueno read own retiros" ON public.retiros_capital;
CREATE POLICY "Dueno read own retiros" ON public.retiros_capital FOR SELECT
    USING (dueno_id IN (SELECT d.id FROM public.duenos d WHERE auth.role() = 'authenticated'));

-- USUARIOS DUENOS
ALTER TABLE public.usuarios_duenos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access usuarios_duenos" ON public.usuarios_duenos;
CREATE POLICY "Admin full access usuarios_duenos" ON public.usuarios_duenos FOR ALL
    USING (EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND 'admin' = ANY(roles)));
DROP POLICY IF EXISTS "Users read own dueno relation" ON public.usuarios_duenos;
CREATE POLICY "Users read own dueno relation" ON public.usuarios_duenos FOR SELECT
    USING (usuario_id = auth.uid());

-- CUPONES
ALTER TABLE public.cupones_descuento ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Cupones visibles para todos" ON public.cupones_descuento;
CREATE POLICY "Cupones visibles para todos" ON public.cupones_descuento FOR SELECT USING (activo = true);
DROP POLICY IF EXISTS "Admins gestionan cupones" ON public.cupones_descuento;
CREATE POLICY "Admins gestionan cupones" ON public.cupones_descuento FOR ALL USING (true) WITH CHECK (true);

-- MOVIMIENTOS STOCK
ALTER TABLE public.movimientos_stock_productos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access for dev" ON public.movimientos_stock_productos;
CREATE POLICY "Allow public access for dev" ON public.movimientos_stock_productos FOR ALL USING (true);

-- CALCULOS COSTOS
ALTER TABLE public.calculos_costos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for public" ON public.calculos_costos;
CREATE POLICY "Allow all for public" ON public.calculos_costos FOR ALL TO public USING (true) WITH CHECK (true);

-- CONFIGURACION SISTEMA
ALTER TABLE public.configuracion_sistema ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read configuracion" ON public.configuracion_sistema;
CREATE POLICY "Public read configuracion" ON public.configuracion_sistema FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Admin full access configuracion" ON public.configuracion_sistema;
CREATE POLICY "Admin full access configuracion" ON public.configuracion_sistema FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ROLLOS, INSUMOS, TIPOS TELA, LOTES, STOCK_RESERVAS (acceso abierto para dev)
ALTER TABLE public.rollos_tela ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all rollos" ON public.rollos_tela;
CREATE POLICY "Allow all rollos" ON public.rollos_tela FOR ALL USING (true);

ALTER TABLE public.tipos_tela ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all tipos_tela" ON public.tipos_tela;
CREATE POLICY "Allow all tipos_tela" ON public.tipos_tela FOR ALL USING (true);

ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all insumos" ON public.insumos;
CREATE POLICY "Allow all insumos" ON public.insumos FOR ALL USING (true);

ALTER TABLE public.lotes_produccion ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all lotes" ON public.lotes_produccion;
CREATE POLICY "Allow all lotes" ON public.lotes_produccion FOR ALL USING (true);

ALTER TABLE public.stock_reservas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all stock_reservas" ON public.stock_reservas;
CREATE POLICY "Allow all stock_reservas" ON public.stock_reservas FOR ALL USING (true);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all clientes" ON public.clientes;
CREATE POLICY "Allow all clientes" ON public.clientes FOR ALL USING (true);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all proveedores" ON public.proveedores;
CREATE POLICY "Allow all proveedores" ON public.proveedores FOR ALL USING (true);


-- ============================================================================
-- PARTE 9: GRANTS DE PERMISOS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.productos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.categorias TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.producto_talles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pedidos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pedido_items_minorista TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pedido_items_mayorista TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.clientes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.proveedores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.rollos_tela TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tipos_tela TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.insumos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lotes_produccion TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stock_reservas TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.cupones_descuento TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.movimientos_stock_productos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.calculos_costos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.configuracion_sistema TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.duenos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.compras_proveedores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.pagos_proveedores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.gastos_operativos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.aportes_capital TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.retiros_capital TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.usuarios_duenos TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.usuarios_internos TO anon, authenticated, service_role;

GRANT UPDATE ON public.pedidos TO anon;


-- ============================================================================
-- PARTE 10: STORAGE (BUCKETS)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes', 'comprobantes', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Public read comprobantes" ON storage.objects;
CREATE POLICY "Public read comprobantes" ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "Admin upload comprobantes" ON storage.objects;
CREATE POLICY "Admin upload comprobantes" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'comprobantes' AND EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND 'admin' = ANY(roles)));

DROP POLICY IF EXISTS "Admin delete comprobantes" ON storage.objects;
CREATE POLICY "Admin delete comprobantes" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'comprobantes' AND EXISTS (SELECT 1 FROM public.usuarios_internos WHERE id = auth.uid() AND 'admin' = ANY(roles)));

DROP POLICY IF EXISTS "Public read product-photos" ON storage.objects;
CREATE POLICY "Public read product-photos" ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "Upload product-photos" ON storage.objects;
CREATE POLICY "Upload product-photos" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'product-photos');

DROP POLICY IF EXISTS "Delete product-photos" ON storage.objects;
CREATE POLICY "Delete product-photos" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'product-photos');


-- ============================================================================
-- PARTE 11: DATOS INICIALES (SEED)
-- ============================================================================

-- Configuracion por defecto
INSERT INTO public.configuracion_sistema (minimo_curvas_mayorista, descuento_mayorista_porcentaje, requiere_cuit_mayorista, whatsapp_pedidos)
SELECT 1, 15.00, true, ''
WHERE NOT EXISTS (SELECT 1 FROM public.configuracion_sistema);

-- Categorias
INSERT INTO public.categorias (id, nombre, codigo, orden, descripcion) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Beba', 'BEBA', 1, 'Ropa para bebas de 0 a 36 meses'),
    ('22222222-2222-2222-2222-222222222222', 'Bebe', 'BEBE', 2, 'Ropa para bebes de 0 a 36 meses'),
    ('33333333-3333-3333-3333-333333333333', 'Nena', 'NENA', 3, 'Indumentaria para ninas'),
    ('44444444-4444-4444-4444-444444444444', 'Nene', 'NENE', 4, 'Indumentaria para ninos')
ON CONFLICT DO NOTHING;

-- Proveedores
INSERT INTO public.proveedores (id, codigo, nombre, tipo, contacto, email) VALUES
    ('55555555-5555-5555-5555-555555555551', 'PROV-01', 'Textil La Nueva', 'tela', 'Juan Perez', 'ventas@lanueva.com'),
    ('55555555-5555-5555-5555-555555555552', 'PROV-02', 'Avios y Cia', 'insumo', 'Maria Gomez', 'info@avios.com')
ON CONFLICT DO NOTHING;

-- Rollos de tela
INSERT INTO public.rollos_tela (codigo, tipo_tela, color, metros_iniciales, metros_restantes, costo_por_metro, proveedor_id) VALUES
    ('R-JEAN-01', 'Jean Rigido', 'Azul Clasico', 100, 85, 4500, '55555555-5555-5555-5555-555555555551'),
    ('R-GAB-01', 'Gabardina', 'Beige', 80, 80, 3800, '55555555-5555-5555-5555-555555555551'),
    ('R-JER-01', 'Jersey Algodon', 'Rosa Pastel', 120, 110, 2500, '55555555-5555-5555-5555-555555555551'),
    ('R-FRI-01', 'Frisa Invisible', 'Gris Melange', 90, 45, 4200, '55555555-5555-5555-5555-555555555551')
ON CONFLICT DO NOTHING;

-- Productos de ejemplo (8)
INSERT INTO public.productos (id, codigo, nombre, descripcion_publica, categoria_id, tipo_prenda, genero, tela_principal, precio_minorista, precio_mayorista_curva, visible_publico, destacado) VALUES
    ('a1111111-1111-1111-1111-111111111111', 'BEB-001', 'Vestido Lino Floral', 'Hermoso vestido de lino con estampa floral, ideal para verano.', '11111111-1111-1111-1111-111111111111', 'Vestido', 'Femenino', 'Lino', 18500, 120000, true, true),
    ('b2222222-2222-2222-2222-222222222222', 'BEB-002', 'Pack Body Basico', 'Body de algodon peinado super suave, pack x2.', '22222222-2222-2222-2222-222222222222', 'Body', 'Unisex', 'Algodon', 12000, 85000, true, false),
    ('c3333333-3333-3333-3333-333333333333', 'NEN-001', 'Jean Cargo Kids', 'Pantalon de jean con bolsillos cargo, resistente y canchero.', '44444444-4444-4444-4444-444444444444', 'Pantalon', 'Masculino', 'Jean', 22900, 145000, true, true),
    ('d4444444-4444-4444-4444-444444444444', 'NEN-002', 'Campera Parka', 'Parka de gabardina forrada, ideal media estacion.', '44444444-4444-4444-4444-444444444444', 'Campera', 'Masculino', 'Gabardina', 35000, 210000, true, false),
    ('e5555555-5555-5555-5555-555555555555', 'NENA-001', 'Vestido Tul Princesa', 'Vestido con falda de tul y detalles bordados.', '33333333-3333-3333-3333-333333333333', 'Vestido', 'Femenino', 'Tul', 28000, 180000, true, true),
    ('f6666666-6666-6666-6666-666666666666', 'NENA-002', 'Calza Unicornios', 'Calza de algodon con lycra estampa full print.', '33333333-3333-3333-3333-333333333333', 'Calza', 'Femenino', 'Algodon Lycra', 9500, 65000, true, false),
    ('77777777-7777-7777-7777-777777777777', 'UNI-001', 'Buzo Canguro Rustico', 'Buzo basico rustico ideal para el colegio.', '44444444-4444-4444-4444-444444444444', 'Buzo', 'Unisex', 'Rustico', 16000, 110000, true, false),
    ('88888888-8888-8888-8888-888888888888', 'BEB-003', 'Set Ajuar 3 Piezas', 'Incluye batita, ranita y gorrito de algodon.', '22222222-2222-2222-2222-222222222222', 'Ajuar', 'Unisex', 'Algodon', 14500, 95000, true, true)
ON CONFLICT DO NOTHING;

-- Talles de los productos
INSERT INTO public.producto_talles (producto_id, talla_codigo, talla_nombre, orden, stock) VALUES
    -- Vestido Lino Floral
    ('a1111111-1111-1111-1111-111111111111', '1', '1 Mes', 1, 20),
    ('a1111111-1111-1111-1111-111111111111', '2', '2 Meses', 2, 15),
    ('a1111111-1111-1111-1111-111111111111', '3', '3 Meses', 3, 10),
    ('a1111111-1111-1111-1111-111111111111', '4', '6 Meses', 4, 10),
    ('a1111111-1111-1111-1111-111111111111', '5', '9 Meses', 5, 8),
    ('a1111111-1111-1111-1111-111111111111', '6', '12 Meses', 6, 5),
    -- Pack Body Basico
    ('b2222222-2222-2222-2222-222222222222', 'RN', 'Recien Nacido', 1, 50),
    ('b2222222-2222-2222-2222-222222222222', '3M', '3 Meses', 2, 40),
    ('b2222222-2222-2222-2222-222222222222', '6M', '6 Meses', 3, 30),
    -- Jean Cargo Kids
    ('c3333333-3333-3333-3333-333333333333', '4', 'Talle 4', 1, 10),
    ('c3333333-3333-3333-3333-333333333333', '6', 'Talle 6', 2, 10),
    ('c3333333-3333-3333-3333-333333333333', '8', 'Talle 8', 3, 10),
    ('c3333333-3333-3333-3333-333333333333', '10', 'Talle 10', 4, 10),
    ('c3333333-3333-3333-3333-333333333333', '12', 'Talle 12', 5, 8),
    -- Campera Parka
    ('d4444444-4444-4444-4444-444444444444', '4', 'Talle 4', 1, 5),
    ('d4444444-4444-4444-4444-444444444444', '6', 'Talle 6', 2, 5),
    ('d4444444-4444-4444-4444-444444444444', '8', 'Talle 8', 3, 5),
    ('d4444444-4444-4444-4444-444444444444', '10', 'Talle 10', 4, 3),
    -- Vestido Tul Princesa
    ('e5555555-5555-5555-5555-555555555555', '2', 'Talle 2', 1, 8),
    ('e5555555-5555-5555-5555-555555555555', '4', 'Talle 4', 2, 8),
    ('e5555555-5555-5555-5555-555555555555', '6', 'Talle 6', 3, 8),
    ('e5555555-5555-5555-5555-555555555555', '8', 'Talle 8', 4, 5),
    -- Calza Unicornios
    ('f6666666-6666-6666-6666-666666666666', '4', 'Talle 4', 1, 20),
    ('f6666666-6666-6666-6666-666666666666', '6', 'Talle 6', 2, 20),
    ('f6666666-6666-6666-6666-666666666666', '8', 'Talle 8', 3, 20),
    ('f6666666-6666-6666-6666-666666666666', '10', 'Talle 10', 4, 15),
    -- Buzo Canguro Rustico
    ('77777777-7777-7777-7777-777777777777', '6', 'Talle 6', 1, 15),
    ('77777777-7777-7777-7777-777777777777', '8', 'Talle 8', 2, 15),
    ('77777777-7777-7777-7777-777777777777', '10', 'Talle 10', 3, 15),
    ('77777777-7777-7777-7777-777777777777', '12', 'Talle 12', 4, 15),
    ('77777777-7777-7777-7777-777777777777', '14', 'Talle 14', 5, 12),
    -- Set Ajuar 3 Piezas
    ('88888888-8888-8888-8888-888888888888', '00', 'Prematuro', 1, 5),
    ('88888888-8888-8888-8888-888888888888', '0', 'Recien Nacido', 2, 10)
ON CONFLICT DO NOTHING;

-- Actualizar stock_total de productos
UPDATE public.productos p
SET stock_total = (SELECT COALESCE(SUM(stock), 0) FROM public.producto_talles pt WHERE pt.producto_id = p.id);

-- Clientes de prueba
INSERT INTO public.clientes (nombre, apellido, email, telefono, tipo_cliente) VALUES
    ('Maria', 'Lopez', 'maria@test.com', '1122334455', 'minorista'),
    ('Local', 'Modas', 'ventas@localmodas.com', '1155667788', 'mayorista')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- FIN DEL SCHEMA COMPLETO
-- ============================================================================
-- Para configurar en otro proyecto Supabase:
--   1. Crear un proyecto nuevo en supabase.com
--   2. Ir a SQL Editor
--   3. Pegar y ejecutar este archivo completo
--   4. Configurar las variables de entorno en el frontend:
--        VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
--        VITE_SUPABASE_ANON_KEY=tu-anon-key
--   5. Configurar las variables de entorno en el backend:
--        SUPABASE_URL=https://tu-proyecto.supabase.co
--        SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
-- ============================================================================
