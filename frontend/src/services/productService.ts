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
        // 1. Get User
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Acceso denegado: Usuario no autenticado.");

        // 2. Get Tenant ID from Profile (or fallback to user.id)
        let tenantId = user.id;

        const { data: profile } = await supabase
            .from('usuarios_internos')
            .select('tenant_id')
            .eq('id', user.id)
            .single();

        if (profile?.tenant_id) {
            tenantId = profile.tenant_id;
        }

        // 3. Try Insert Product (Optimistic)
        let productData: Producto | null = null;

        try {
            // Attempt insert
            const { data, error } = await supabase
                .from('productos')
                .insert({
                    ...product,
                    tenant_id: tenantId
                })
                .select()
                .single();

            if (error) throw error;
            productData = data;

        } catch (error: any) {
            // 4. Handle Foreign Key Violation (Tenant missing)
            if (error.code === '23503') { // ForeignKeyViolation
                console.log("Tenant missing, creating...");

                // Create tenant (Minimal fields to avoid schema issues)
                const { error: tenantError } = await supabase
                    .from('tenants')
                    .insert({
                        id: tenantId,
                        // Removed 'nombre' as it caused errors. 
                        // Assuming 'created_at' is auto current_timestamp or we configure it? 
                        // Safest is to specific ID only if possible, or created_at.
                        created_at: new Date().toISOString()
                    });

                if (tenantError) {
                    console.error("Failed to create tenant:", tenantError);
                    throw error; // Throw original product error if we can't fix it
                }

                // Retry Product Insert
                const { data: retryData, error: retryError } = await supabase
                    .from('productos')
                    .insert({
                        ...product,
                        tenant_id: tenantId
                    })
                    .select()
                    .single();

                if (retryError) throw retryError;
                productData = retryData;

            } else {
                throw error; // Rethrow other errors
            }
        }

        if (!productData) throw new Error("Error creating product");

        // 5. Insert Talles
        if (talles.length > 0) {
            const tallesWithId = talles.map(t => ({ ...t, producto_id: productData!.id }));
            const { error: tallesError } = await supabase
                .from('producto_talles')
                .insert(tallesWithId);

            if (tallesError) throw tallesError;
        }

        return productData as Producto;
    },

    async updateProduct(id: string, updates: Partial<Producto>) {
        // Sanitize: remove relationship fields that can't be updated directly
        const { producto_talles, id: _, created_at, ...cleanUpdates } = updates as any;

        const { data, error } = await supabase
            .from('productos')
            .update({ ...cleanUpdates, actualizado_en: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data as Producto;
    },

    async updateTalles(talles: any[]) {
        if (!talles || talles.length === 0) return;

        const { error } = await supabase
            .from('producto_talles')
            .upsert(talles);

        if (error) throw error;
    },

    async addStockFromBatch(productId: string, distribution: Record<string, Record<string, number>>) {
        if (!distribution || Object.keys(distribution).length === 0) return;

        // 1. Calculate totals per Talle ID
        const totalsPerTalle: Record<string, number> = {};

        Object.values(distribution).forEach(colorDist => {
            Object.entries(colorDist).forEach(([talleId, qty]) => {
                totalsPerTalle[talleId] = (totalsPerTalle[talleId] || 0) + qty;
            });
        });

        // 2. Fetch current talles to get current stock
        const { data: currentTalles, error: fetchError } = await supabase
            .from('producto_talles')
            .select('*')
            .eq('producto_id', productId);

        if (fetchError) throw fetchError;
        if (!currentTalles) return;

        // 3. Prepare updates
        const updates = currentTalles.map(t => {
            const addedQty = totalsPerTalle[t.id] || 0;
            if (addedQty > 0) {
                return {
                    ...t,
                    stock: (t.stock || 0) + addedQty
                };
            }
            return null;
        }).filter(Boolean);

        // 4. Update Talles
        if (updates.length > 0) {
            await this.updateTalles(updates);

            // 5. Update Total Stock in Product

            await this.syncProductTotalStock(productId);
        }
    },

    async syncProductTotalStock(productId: string) {
        const { data: talles, error: talleError } = await supabase
            .from('producto_talles')
            .select('stock')
            .eq('producto_id', productId);

        if (talleError) {
            console.error('Error fetching talles for sync:', talleError);
            return;
        }

        const realTotal = talles.reduce((sum, t) => sum + (t.stock || 0), 0);
        console.log(`Syncing Total Stock for ${productId}: ${realTotal}`);

        const { error: updateError } = await supabase
            .from('productos')
            .update({ stock_total: realTotal })
            .eq('id', productId);

        if (updateError) {
            console.error('Error updating stock_total:', updateError);
        }
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
            .from('product-photos') // Should verify this bucket exists and policy allows upload
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuario no autenticado para crear categoría");

        let tenantId = user.id;
        const { data: profile } = await supabase.from('usuarios_internos').select('tenant_id').eq('id', user.id).single();
        if (profile?.tenant_id) tenantId = profile.tenant_id;

        try {
            const { data, error } = await supabase
                .from('categorias')
                .insert({ ...category, tenant_id: tenantId })
                .select()
                .single();

            if (error) throw error;
            return data as Categoria;

        } catch (error: any) {
            if (error.code === '23503') { // Tenant missing
                await supabase.from('tenants').insert({ id: tenantId, created_at: new Date().toISOString() });

                // Retry
                const { data, error: retryError } = await supabase
                    .from('categorias')
                    .insert({ ...category, tenant_id: tenantId })
                    .select()
                    .single();

                if (retryError) throw retryError;
                return data as Categoria;
            }
            throw error;
        }
    }
};
