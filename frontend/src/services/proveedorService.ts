import { supabase } from '../lib/supabase';
import type { Proveedor } from '../types';

export const proveedorService = {
    async getAll() {
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .order('nombre', { ascending: true });

        if (error) throw error;
        return data as Proveedor[];
    },

    async getById(id: string) {
        const { data, error } = await supabase
            .from('proveedores')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Proveedor;
    },

    async create(proveedor: Partial<Proveedor>) {
        if (!proveedor.codigo) {
            proveedor.codigo = `PROV-${Date.now().toString().slice(-6)}`;
        }

        const { data, error } = await supabase
            .from('proveedores')
            .insert([proveedor])
            .select()
            .single();

        if (error) throw error;
        return data as Proveedor;
    },

    async update(id: string, updates: Partial<Proveedor>) {
        const { data, error } = await supabase
            .from('proveedores')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Proveedor;
    },

    async delete(id: string) {
        const { error } = await supabase
            .from('proveedores')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
