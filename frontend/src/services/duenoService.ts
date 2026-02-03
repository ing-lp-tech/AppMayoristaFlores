import { supabase } from '../lib/supabase';

// ==========================================
// TYPES
// ==========================================

export interface Dueno {
    id: string;
    nombre: string;
    apellido: string;
    dni: string;
    telefono_whatsapp: string;
    email?: string;
    porcentaje_participacion?: number;
    activo: boolean;
    color_identificador: string;
    fecha_incorporacion?: string;
    notas?: string;
    creado_en: string;
    actualizado_en: string;
}

export interface CreateDuenoInput {
    nombre: string;
    apellido: string;
    dni: string;
    telefono_whatsapp: string;
    email?: string;
    porcentaje_participacion?: number;
    color_identificador?: string;
    fecha_incorporacion?: string;
    notas?: string;
}

export interface UpdateDuenoInput {
    nombre?: string;
    apellido?: string;
    dni?: string;
    telefono_whatsapp?: string;
    email?: string;
    porcentaje_participacion?: number;
    color_identificador?: string;
    fecha_incorporacion?: string;
    notas?: string;
    activo?: boolean;
}

// ==========================================
// SERVICE
// ==========================================

export const duenoService = {
    /**
     * Obtener todos los dueños
     */
    async getAll(includeInactive = false): Promise<Dueno[]> {
        let query = supabase
            .from('duenos')
            .select('*')
            .order('nombre', { ascending: true });

        if (!includeInactive) {
            query = query.eq('activo', true);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching duenos:', error);
            throw new Error(`Error al obtener dueños: ${error.message}`);
        }

        return data || [];
    },

    /**
     * Obtener un dueño por ID
     */
    async getById(id: string): Promise<Dueno | null> {
        const { data, error } = await supabase
            .from('duenos')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // No encontrado
            }
            console.error('Error fetching dueno:', error);
            throw new Error(`Error al obtener dueño: ${error.message}`);
        }

        return data;
    },

    /**
     * Crear un nuevo dueño
     */
    async create(input: CreateDuenoInput): Promise<Dueno> {
        // Generar color aleatorio si no se proporciona
        const color = input.color_identificador || generateRandomColor();

        const { data, error } = await supabase
            .from('duenos')
            .insert({
                ...input,
                color_identificador: color,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating dueno:', error);

            // Manejar error de DNI duplicado
            if (error.code === '23505' && error.message.includes('dni')) {
                throw new Error('Ya existe un dueño con este DNI');
            }

            throw new Error(`Error al crear dueño: ${error.message}`);
        }

        return data;
    },

    /**
     * Actualizar un dueño
     */
    async update(id: string, input: UpdateDuenoInput): Promise<Dueno> {
        const { data, error } = await supabase
            .from('duenos')
            .update(input)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating dueno:', error);

            if (error.code === '23505' && error.message.includes('dni')) {
                throw new Error('Ya existe un dueño con este DNI');
            }

            throw new Error(`Error al actualizar dueño: ${error.message}`);
        }

        return data;
    },

    /**
     * Activar/Desactivar un dueño
     */
    async toggleActive(id: string, activo: boolean): Promise<Dueno> {
        return this.update(id, { activo });
    },

    /**
     * Eliminar un dueño (soft delete - desactivar)
     */
    async delete(id: string): Promise<void> {
        await this.toggleActive(id, false);
    },

    /**
     * Obtener saldo financiero de un dueño
     */
    async getSaldoFinanciero(id: string): Promise<number> {
        const { data, error } = await supabase
            .rpc('calcular_saldo_dueno', { p_dueno_id: id });

        if (error) {
            console.error('Error calculating saldo:', error);
            throw new Error(`Error al calcular saldo: ${error.message}`);
        }

        return data || 0;
    },

    /**
     * Buscar dueños por término
     */
    async search(searchTerm: string): Promise<Dueno[]> {
        const { data, error } = await supabase
            .from('duenos')
            .select('*')
            .or(`nombre.ilike.%${searchTerm}%,apellido.ilike.%${searchTerm}%,dni.ilike.%${searchTerm}%`)
            .eq('activo', true)
            .order('nombre', { ascending: true });

        if (error) {
            console.error('Error searching duenos:', error);
            throw new Error(`Error al buscar dueños: ${error.message}`);
        }

        return data || [];
    },
};

// ==========================================
// HELPERS
// ==========================================

/**
 * Genera un color hexadecimal aleatorio para identificación visual
 */
function generateRandomColor(): string {
    const colors = [
        '#3B82F6', // Blue
        '#8B5CF6', // Purple
        '#EC4899', // Pink
        '#10B981', // Green
        '#F59E0B', // Amber
        '#EF4444', // Red
        '#06B6D4', // Cyan
        '#6366F1', // Indigo
        '#14B8A6', // Teal
        '#F97316', // Orange
    ];

    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Obtener nombre completo de un dueño
 */
export function getDuenoNombreCompleto(dueno: Dueno | null): string {
    if (!dueno) return 'N/A';
    return `${dueno.nombre} ${dueno.apellido}`.trim();
}

/**
 * Formatear DNI
 */
export function formatDNI(dni: string): string {
    return dni.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Formatear teléfono
 */
export function formatTelefono(telefono: string): string {
    // Formato: +54 9 11 1234-5678
    if (!telefono) return '';
    return telefono;
}
