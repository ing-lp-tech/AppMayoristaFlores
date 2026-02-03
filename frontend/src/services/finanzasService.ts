import { supabase } from '../lib/supabase';
import type { Dueno } from './duenoService';

// ==========================================
// TYPES - COMPRAS
// ==========================================

export type EstadoPago = 'pendiente' | 'parcial' | 'pagado';

export interface Compra {
    id: string;
    dueno_id: string;
    dueno?: Dueno;
    proveedor_id: string;
    proveedor?: any; // Tipo del proveedor existente
    codigo_compra: string;
    fecha_compra: string;
    fecha_vencimiento?: string;
    monto_total: number;
    monto_pagado: number;
    monto_pendiente: number;
    estado_pago: EstadoPago;
    metodo_pago?: string;
    descripcion?: string;
    items?: any;
    notas?: string;
    comprobante_url?: string;
    creado_en: string;
    actualizado_en: string;
    creado_por?: string;
}

export interface CreateCompraInput {
    dueno_id: string;
    proveedor_id: string;
    fecha_compra: string;
    fecha_vencimiento?: string;
    monto_total: number;
    metodo_pago?: string;
    descripcion?: string;
    items?: any;
    notas?: string;
    comprobante_url?: string;
}

// ==========================================
// TYPES - PAGOS
// ==========================================

export interface Pago {
    id: string;
    compra_id: string;
    compra?: Compra;
    dueno_id: string;
    dueno?: Dueno;
    fecha_pago: string;
    monto: number;
    metodo_pago: string;
    numero_comprobante?: string;
    notas?: string;
    comprobante_url?: string;
    creado_en: string;
    creado_por?: string;
}

export interface CreatePagoInput {
    compra_id: string;
    dueno_id: string;
    fecha_pago: string;
    monto: number;
    metodo_pago: string;
    numero_comprobante?: string;
    notas?: string;
    comprobante_url?: string;
}

// ==========================================
// TYPES - GASTOS
// ==========================================

export type CategoriaGasto =
    | 'alquiler'
    | 'servicios'
    | 'sueldos'
    | 'impuestos'
    | 'mantenimiento'
    | 'transporte'
    | 'marketing'
    | 'otros';

export interface Gasto {
    id: string;
    dueno_id: string;
    dueno?: Dueno;
    categoria: CategoriaGasto;
    concepto: string;
    fecha_gasto: string;
    monto: number;
    metodo_pago?: string;
    descripcion?: string;
    notas?: string;
    comprobante_url?: string;
    es_recurrente: boolean;
    creado_en: string;
    actualizado_en: string;
    creado_por?: string;
}

export interface CreateGastoInput {
    dueno_id: string;
    categoria: CategoriaGasto;
    concepto: string;
    fecha_gasto: string;
    monto: number;
    metodo_pago?: string;
    descripcion?: string;
    notas?: string;
    comprobante_url?: string;
    es_recurrente?: boolean;
}

// ==========================================
// TYPES - APORTES Y RETIROS
// ==========================================

export type TipoAporte = 'inicial' | 'adicional' | 'extraordinario';

export interface Aporte {
    id: string;
    dueno_id: string;
    dueno?: Dueno;
    fecha_aporte: string;
    monto: number;
    tipo_aporte: TipoAporte;
    metodo?: string;
    concepto?: string;
    notas?: string;
    comprobante_url?: string;
    creado_en: string;
    creado_por?: string;
}

export interface Retiro {
    id: string;
    dueno_id: string;
    dueno?: Dueno;
    fecha_retiro: string;
    monto: number;
    concepto: string;
    metodo?: string;
    notas?: string;
    comprobante_url?: string;
    aprobado_por?: string;
    fecha_aprobacion?: string;
    creado_en: string;
    creado_por?: string;
}

export interface CreateAporteInput {
    dueno_id: string;
    fecha_aporte: string;
    monto: number;
    tipo_aporte: TipoAporte;
    metodo?: string;
    concepto?: string;
    notas?: string;
    comprobante_url?: string;
}

export interface CreateRetiroInput {
    dueno_id: string;
    fecha_retiro: string;
    monto: number;
    concepto: string;
    metodo?: string;
    notas?: string;
    comprobante_url?: string;
}

// ==========================================
// TYPES - REPORTES
// ==========================================

export interface ResumenFinanciero {
    dueno_id: string;
    periodo: {
        desde: string;
        hasta: string;
    };
    aportes: {
        total: number;
        cantidad: number;
    };
    retiros: {
        total: number;
        cantidad: number;
    };
    compras: {
        total: number;
        pagado: number;
        pendiente: number;
        cantidad: number;
    };
    pagos: {
        total: number;
        cantidad: number;
    };
    gastos: {
        total: number;
        cantidad: number;
        por_categoria: Record<CategoriaGasto, number>;
    };
    saldo_actual: number;
}

// ==========================================
// SERVICE - COMPRAS
// ==========================================

export const comprasService = {
    async getAll(duenoId?: string, filters?: { estado?: EstadoPago; proveedor?: string }): Promise<Compra[]> {
        let query = supabase
            .from('compras_proveedores')
            .select(`
        *,
        dueno:duenos(*),
        proveedor:proveedores(*)
      `)
            .order('fecha_compra', { ascending: false });

        if (duenoId) {
            query = query.eq('dueno_id', duenoId);
        }

        if (filters?.estado) {
            query = query.eq('estado_pago', filters.estado);
        }

        if (filters?.proveedor) {
            query = query.eq('proveedor_id', filters.proveedor);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching compras:', error);
            throw new Error(`Error al obtener compras: ${error.message}`);
        }

        return data || [];
    },

    async getById(id: string): Promise<Compra | null> {
        const { data, error } = await supabase
            .from('compras_proveedores')
            .select(`*, dueno:duenos(*), proveedor:proveedores(*)`)
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(`Error al obtener compra: ${error.message}`);
        }

        return data;
    },

    async create(input: CreateCompraInput): Promise<Compra> {
        const { data, error } = await supabase
            .from('compras_proveedores')
            .insert(input)
            .select(`*, dueno:duenos(*), proveedor:proveedores(*)`)
            .single();

        if (error) {
            console.error('Error creating compra:', error);
            throw new Error(`Error al crear compra: ${error.message}`);
        }

        return data;
    },

    async update(id: string, input: Partial<CreateCompraInput>): Promise<Compra> {
        const { data, error } = await supabase
            .from('compras_proveedores')
            .update(input)
            .eq('id', id)
            .select(`*, dueno:duenos(*), proveedor:proveedores(*)`)
            .single();

        if (error) {
            throw new Error(`Error al actualizar compra: ${error.message}`);
        }

        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('compras_proveedores')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error al eliminar compra: ${error.message}`);
        }
    },
};

// ==========================================
// SERVICE - PAGOS
// ==========================================

export const pagosService = {
    async getAll(duenoId?: string, compraId?: string): Promise<Pago[]> {
        let query = supabase
            .from('pagos_proveedores')
            .select(`
        *,
        dueno:duenos(*),
        compra:compras_proveedores(*)
      `)
            .order('fecha_pago', { ascending: false });

        if (duenoId) {
            query = query.eq('dueno_id', duenoId);
        }

        if (compraId) {
            query = query.eq('compra_id', compraId);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching pagos:', error);
            throw new Error(`Error al obtener pagos: ${error.message}`);
        }

        return data || [];
    },

    async create(input: CreatePagoInput): Promise<Pago> {
        const { data, error } = await supabase
            .from('pagos_proveedores')
            .insert(input)
            .select(`*, dueno:duenos(*), compra:compras_proveedores(*)`)
            .single();

        if (error) {
            console.error('Error creating pago:', error);
            throw new Error(`Error al registrar pago: ${error.message}`);
        }

        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('pagos_proveedores')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error al eliminar pago: ${error.message}`);
        }
    },
};

// ==========================================
// SERVICE - GASTOS
// ==========================================

export const gastosService = {
    async getAll(duenoId?: string, categoria?: CategoriaGasto): Promise<Gasto[]> {
        let query = supabase
            .from('gastos_operativos')
            .select(`*, dueno:duenos(*)`)
            .order('fecha_gasto', { ascending: false });

        if (duenoId) {
            query = query.eq('dueno_id', duenoId);
        }

        if (categoria) {
            query = query.eq('categoria', categoria);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching gastos:', error);
            throw new Error(`Error al obtener gastos: ${error.message}`);
        }

        return data || [];
    },

    async create(input: CreateGastoInput): Promise<Gasto> {
        const { data, error } = await supabase
            .from('gastos_operativos')
            .insert(input)
            .select(`*, dueno:duenos(*)`)
            .single();

        if (error) {
            console.error('Error creating gasto:', error);
            throw new Error(`Error al crear gasto: ${error.message}`);
        }

        return data;
    },

    async update(id: string, input: Partial<CreateGastoInput>): Promise<Gasto> {
        const { data, error } = await supabase
            .from('gastos_operativos')
            .update(input)
            .eq('id', id)
            .select(`*, dueno:duenos(*)`)
            .single();

        if (error) {
            throw new Error(`Error al actualizar gasto: ${error.message}`);
        }

        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('gastos_operativos')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error al eliminar gasto: ${error.message}`);
        }
    },
};

// ==========================================
// SERVICE - APORTES Y RETIROS
// ==========================================

export const aportesService = {
    async getAll(duenoId?: string): Promise<Aporte[]> {
        let query = supabase
            .from('aportes_capital')
            .select(`*, dueno:duenos(*)`)
            .order('fecha_aporte', { ascending: false });

        if (duenoId) {
            query = query.eq('dueno_id', duenoId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Error al obtener aportes: ${error.message}`);
        }

        return data || [];
    },

    async create(input: CreateAporteInput): Promise<Aporte> {
        const { data, error } = await supabase
            .from('aportes_capital')
            .insert(input)
            .select(`*, dueno:duenos(*)`)
            .single();

        if (error) {
            throw new Error(`Error al registrar aporte: ${error.message}`);
        }

        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('aportes_capital')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error al eliminar aporte: ${error.message}`);
        }
    },
};

export const retirosService = {
    async getAll(duenoId?: string): Promise<Retiro[]> {
        let query = supabase
            .from('retiros_capital')
            .select(`*, dueno:duenos(*)`)
            .order('fecha_retiro', { ascending: false });

        if (duenoId) {
            query = query.eq('dueno_id', duenoId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Error al obtener retiros: ${error.message}`);
        }

        return data || [];
    },

    async create(input: CreateRetiroInput): Promise<Retiro> {
        const { data, error } = await supabase
            .from('retiros_capital')
            .insert(input)
            .select(`*, dueno:duenos(*)`)
            .single();

        if (error) {
            throw new Error(`Error al registrar retiro: ${error.message}`);
        }

        return data;
    },

    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('retiros_capital')
            .delete()
            .eq('id', id);

        if (error) {
            throw new Error(`Error al eliminar retiro: ${error.message}`);
        }
    },
};

// ==========================================
// SERVICE - REPORTES
// ==========================================

export const reportesService = {
    async getResumenDueno(
        duenoId: string,
        fechaDesde?: string,
        fechaHasta?: string
    ): Promise<ResumenFinanciero> {
        const { data, error } = await supabase.rpc('get_resumen_financiero_dueno', {
            p_dueno_id: duenoId,
            p_fecha_desde: fechaDesde || null,
            p_fecha_hasta: fechaHasta || null,
        });

        if (error) {
            throw new Error(`Error al obtener resumen: ${error.message}`);
        }

        return data;
    },

    async getResumenConsolidado(fechaDesde?: string, fechaHasta?: string): Promise<any> {
        const { data, error } = await supabase.rpc('get_resumen_consolidado', {
            p_fecha_desde: fechaDesde || null,
            p_fecha_hasta: fechaHasta || null,
        });

        if (error) {
            throw new Error(`Error al obtener resumen consolidado: ${error.message}`);
        }

        return data;
    },

    async getDeudasPorProveedor(duenoId?: string): Promise<any[]> {
        const { data, error } = await supabase.rpc('get_deudas_por_proveedor', {
            p_dueno_id: duenoId || null,
        });

        if (error) {
            throw new Error(`Error al obtener deudas: ${error.message}`);
        }

        return data || [];
    },
};
