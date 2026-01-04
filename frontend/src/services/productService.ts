import { supabase } from '../lib/supabase';
import type { Producto, ProductoTalla, Categoria } from '../types';

export const productService = {
    async getProducts(activeOnly = true) {
        let query = supabase
            .from('productos')
            .select('*, producto_talles(*)');

        if (activeOnly) {
            query = query.eq('visible_publico', true);
        }

        const { data, error } = await query.order('creado_en', { ascending: false });

        if (error) throw error;
        return data as (Producto & { producto_talles: ProductoTalla[] })[];
    },

    async getProductById(id: string) {
        const { data, error } = await supabase
            .from('productos')
            .select('*, producto_talles(*)')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as (Producto & { producto_talles: ProductoTalla[] });
    },

    async createProduct(product: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>, talles: Omit<ProductoTalla, 'id' | 'producto_id'>[]) {
        // Debug Auth
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current User attempting create:', user?.id);

        // 1. Inserción del producto
        const { data: productData, error: productError } = await supabase
            .from('productos')
            .insert(product)
            .select()
            .single();

        if (productError) throw productError;

        // 2. Inserción de los talles
        if (talles.length > 0) {
            const tallesWithId = talles.map(t => ({ ...t, producto_id: productData.id }));
            const { error: tallesError } = await supabase
                .from('producto_talles')
                .insert(tallesWithId);

            if (tallesError) throw tallesError;
        }

        return productData as Producto;
    },

    async updateProduct(id: string, updates: Partial<Producto>) {
        const { data, error } = await supabase
            .from('productos')
            .update({ ...updates, actualizado_en: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Producto;
    },

    async deleteProduct(id: string) {
        const { error } = await supabase
            .from('productos')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    async uploadProductImage(file: File): Promise<string> {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('product-photos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('product-photos')
            .getPublicUrl(filePath);

        return data.publicUrl;
    }
};

export const categoryService = {
    async getCategories() {
        const { data, error } = await supabase
            .from('categorias')
            .select('*')
            .order('orden', { ascending: true });

        if (error) throw error;
        return data as Categoria[];
    },

    async createCategory(category: Omit<Categoria, 'id'>) {
        const { data, error } = await supabase
            .from('categorias')
            .insert(category)
            .select()
            .single();

        if (error) throw error;
        return data as Categoria;
    }
};
