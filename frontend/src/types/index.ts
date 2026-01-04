// ==========================================
// DUAL SYSTEM TYPES (Retail & Wholesale Curve)
// ==========================================

export type UserRole = 'owner' | 'admin' | 'produccion' | 'ventas' | 'inventario' | 'contador' | 'repositor' | 'cortador' | 'doblador' | 'cliente';

export interface UsuarioInterno {
    id: string;
    email: string;
    nombre: string;
    apellido?: string;
    roles: UserRole[];
    rol?: UserRole; // Added to support legacy/single-role usage
    telefono?: string;
    departamento?: string;
    activo: boolean;
    creado_en: string;
    ultimo_login?: string;
}

export interface Cliente {
    id: string;
    email?: string;
    nombre: string;
    apellido?: string;
    telefono: string;
    tipo_cliente: 'minorista' | 'mayorista' | 'ambos';
    razon_social?: string;
    cuit?: string;
    rubro?: string;
    limite_credito: number;
    direccion?: string;
    ciudad?: string;
    codigo_postal?: string;
    total_pedidos: number;
    total_gastado: number;
    pedidos_como_mayorista: number;
    creado_en: string;
}

export interface Categoria {
    id: string;
    nombre: string;
    codigo: string;
    descripcion?: string;
    imagen_url?: string;
    orden: number;
    visible_publico: boolean;
    permite_mayorista: boolean;
}

export interface Producto {
    id: string;
    codigo: string;
    nombre: string;
    descripcion_publica?: string;
    descripcion_interna?: string;
    categoria_id?: string;
    tipo_prenda?: string;
    genero?: string;
    tela_principal?: string;
    color_base?: string;
    composicion?: string;
    cuidados?: string;
    imagenes: string[];
    imagen_principal?: string;

    // Precios Duales
    precio_minorista: number;
    precio_mayorista_curva: number;
    precio_costo_base?: number;
    margen_minorista: number;
    margen_mayorista: number;

    // Configuración Curva
    curva_minima: boolean;
    talles_por_curva?: number;
    descripcion_curva?: string;

    stock_total: number;
    stock_minimo: number;
    visible_publico: boolean;
    destacado: boolean;
    disponible_minorista: boolean;
    disponible_mayorista: boolean;
    slug?: string;
    especificaciones?: {
        consumo_tela?: number;
        insumos?: { id: string; cantidad: number }[];
    };
    creado_en: string;
    actualizado_en: string;
}

export interface ProductoTalla {
    id: string;
    producto_id: string;
    talla_codigo: string;
    talla_nombre: string;
    orden: number;
    incluido_curva: boolean;
    stock: number;
    stock_minimo: number;
    disponible_publico: boolean;
}

// ==========================================
// E-COMMERCE & ORDERS
// ==========================================

export interface Pedido {
    id: string;
    codigo_pedido: string;
    cliente_id?: string;
    cliente_nombre: string;
    cliente_email?: string;
    cliente_telefono: string;
    tipo_cliente_pedido: 'minorista' | 'mayorista';
    razon_social?: string;
    cuit?: string;
    tipo_factura: 'consumidor_final' | 'responsable_inscripto' | 'monotributista';
    direccion_envio: string;
    ciudad_envio: string;
    codigo_postal_envio?: string;
    subtotal_minorista: number;
    subtotal_mayorista: number;
    total: number;
    estado: 'pendiente' | 'confirmado' | 'en_preparacion' | 'enviado' | 'entregado' | 'cancelado';
    metodo_pago?: string;
    estado_pago: 'pendiente' | 'pagado';
    creado_en: string;

    // Virtual fields for UI
    items_minorista?: PedidoItemMinorista[];
    items_mayorista?: PedidoItemMayorista[];
}

export interface PedidoItemMinorista {
    id: string;
    pedido_id: string;
    producto_id: string;
    talle_id: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
    // UI Helpers
    producto?: Producto;
    talla?: ProductoTalla;
}

export interface PedidoItemMayorista {
    id: string;
    pedido_id: string;
    producto_id: string;
    nombre_curva: string;
    talles_incluidos: string[];
    cantidad_curvas: number;
    precio_curva: number;
    subtotal: number;
    // UI Helpers
    producto?: Producto;
}

// ==========================================
// INVENTORY & PRODUCTION (Legacy Support)
// ==========================================

export interface Proveedor {
    id: string;
    codigo: string;
    nombre: string;
    tipo: 'tela' | 'insumo' | 'taller';
    contacto?: string;
    telefono?: string;
    email?: string;
    saldo_actual: number;
    creado_en: string;
}

export interface RolloTela {
    id: string;
    codigo: string;
    tipo_tela: string;
    color?: string;
    metros_iniciales: number;
    metros_restantes: number;
    costo_por_metro: number;
    proveedor_id?: string;
    estado: 'disponible' | 'agotado';
    creado_en: string;
}


export interface Insumo {
    id: string;
    codigo: string;
    nombre: string;
    stock_actual: number;
    stock_minimo: number;
    unidad_medida: string;
    costo_unitario: number;
    proveedor_id?: string;
    creado_en: string;
}

export interface LoteProduccion {
    id: string;
    codigo: string;
    producto_id: string;
    detalle_rollos?: { rollo_id?: string; color: string; metros: number }[];
    modelo_corte?: string;
    cantidad_total: number;
    cantidad_real?: number;
    estado: 'planificado' | 'corte' | 'taller' | 'terminado';
    progreso_porcentaje: number;
    fecha_inicio?: string;
    fecha_fin?: string;
    creado_en: string;
    // Joined fields
    producto?: {
        nombre: string;
        codigo: string;
    };
}

export interface ConfiguracionSistema {
    id: string;
    minimo_curvas_mayorista: number;
    descuento_mayorista_porcentaje: number;
    requiere_cuit_mayorista: boolean;
    actualizado_en: string;
}

export type User = UsuarioInterno;

export interface Venta {
    id: string;
    codigo: string;
    cliente_info?: {
        nombre: string;
        email?: string;
    };
    items: any[];
    total: number;
    estado: string;
    estado_pago: string;
    fecha_venta: string;
}
