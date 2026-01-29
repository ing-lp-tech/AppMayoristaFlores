import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Producto, ProductoTalla } from '../types';

export type CartMode = 'minorista' | 'mayorista';

export interface CartItemMinorista {
    id: string; // SKU or dynamic ID
    producto: Producto;
    talle: ProductoTalla;
    color?: { nombre: string; hex: string }; // Added color
    cantidad: number;
    precio_unitario: number;
}

export interface CartItemMayorista {
    id: string; // product_id
    producto: Producto;
    variaciones: {
        talle: string;
        color: { nombre: string; hex: string };
        cantidad: number;
    }[];
    cantidad_total: number;
    precio_total: number;
}


interface CartDualState {
    mode: CartMode;
    itemsMinorista: CartItemMinorista[];
    itemsMayorista: CartItemMayorista[];

    // Actions
    setMode: (mode: CartMode) => void;

    // Minorista Actions
    addMinoristaItem: (producto: Producto, talle: ProductoTalla, cantidad?: number, color?: { nombre: string; hex: string }) => void;
    updateMinoristaItem: (id: string, cantidad: number) => void;
    removeMinoristaItem: (id: string) => void;

    // Mayorista Actions (Flexible)
    addMayoristaItem: (producto: Producto, variaciones: { talle: string; color: { nombre: string; hex: string }; cantidad: number }[]) => void;
    removeMayoristaItem: (id: string) => void;

    // Helpers
    clearCart: () => void;
    getTotals: () => { subtotalMinorista: number; subtotalMayorista: number; total: number; count: number };
}

export const useCartDualStore = create<CartDualState>()(
    persist(
        (set, get) => ({
            mode: 'minorista',
            itemsMinorista: [],
            itemsMayorista: [],

            setMode: (mode) => set({ mode }),

            addMinoristaItem: (producto, talle, cantidad = 1, color) => {
                const items = get().itemsMinorista;
                const colorSuffix = color ? `-${color.nombre}` : '';
                const itemId = `${producto.id}-${talle.id}${colorSuffix}`;
                const existing = items.find(i => i.id === itemId);

                if (existing) {
                    set({
                        itemsMinorista: items.map(i =>
                            i.id === itemId ? { ...i, cantidad: i.cantidad + cantidad } : i
                        )
                    });
                } else {
                    set({
                        itemsMinorista: [...items, {
                            id: itemId,
                            producto,
                            talle,
                            color, // Save color
                            cantidad,
                            precio_unitario: producto.precio_minorista
                        }]
                    });
                }
            },

            updateMinoristaItem: (id, cantidad) => {
                set({
                    itemsMinorista: get().itemsMinorista.map(i =>
                        i.id === id ? { ...i, cantidad: Math.max(1, cantidad) } : i
                    )
                });
            },

            removeMinoristaItem: (id) => {
                set({
                    itemsMinorista: get().itemsMinorista.filter(i => i.id !== id)
                });
            },

            addMayoristaItem: (producto, variaciones) => {
                const items = get().itemsMayorista;
                const itemId = producto.id;
                const existing = items.find(i => i.id === itemId);

                // Calculate base unit price (Derived from Curve Price if needed, or maintain curve logic)
                // Calculate base unit price (Now using the curve price as unit price directly per user request)
                const unitPrice = producto.precio_mayorista_curva;

                // Consolidate Variations
                const consolidate = (vars: typeof variaciones) => {
                    const map = new Map<string, typeof variaciones[0]>();
                    vars.forEach(v => {
                        const key = `${v.color.nombre}-${v.talle}`;
                        const curr = map.get(key);
                        if (curr) {
                            curr.cantidad += v.cantidad;
                        } else {
                            map.set(key, { ...v });
                        }
                    });
                    return Array.from(map.values());
                };

                const newVariations = existing
                    ? consolidate([...existing.variaciones, ...variaciones])
                    : consolidate(variaciones);

                const totalUnits = newVariations.reduce((acc, v) => acc + v.cantidad, 0);
                const totalPrice = totalUnits * unitPrice; // Pricing based on units

                if (existing) {
                    set({
                        itemsMayorista: items.map(i =>
                            i.id === itemId ? {
                                ...i,
                                variaciones: newVariations,
                                cantidad_total: totalUnits,
                                precio_total: totalPrice
                            } : i
                        )
                    });
                } else {
                    set({
                        itemsMayorista: [...items, {
                            id: itemId,
                            producto,
                            variaciones: newVariations,
                            cantidad_total: totalUnits,
                            precio_total: totalPrice
                        }]
                    });
                }
            },

            removeMayoristaItem: (id) => {
                set({
                    itemsMayorista: get().itemsMayorista.filter(i => i.id !== id)
                });
            },

            clearCart: () => set({ itemsMinorista: [], itemsMayorista: [] }),

            getTotals: () => {
                const { itemsMinorista, itemsMayorista } = get();
                const subtotalMinorista = itemsMinorista.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);
                const subtotalMayorista = itemsMayorista.reduce((sum, i) => sum + i.precio_total, 0);
                const total = subtotalMinorista + subtotalMayorista;
                const count = itemsMinorista.length + itemsMayorista.length;

                return { subtotalMinorista, subtotalMayorista, total, count };
            }
        }),
        {
            name: 'textil-cart-storage',
        }
    )
);
