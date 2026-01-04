import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Producto, ProductoTalla } from '../types';

export type CartMode = 'minorista' | 'mayorista';

export interface CartItemMinorista {
    id: string; // SKU or dynamic ID
    producto: Producto;
    talle: ProductoTalla;
    cantidad: number;
    precio_unitario: number;
}

export interface CartItemMayorista {
    id: string; // product_id
    producto: Producto;
    nombre_curva: string;
    talles_incluidos: string[];
    cantidad_curvas: number;
    precio_curva: number; // total price of the curve
}

interface CartDualState {
    mode: CartMode;
    itemsMinorista: CartItemMinorista[];
    itemsMayorista: CartItemMayorista[];

    // Actions
    setMode: (mode: CartMode) => void;

    // Minorista Actions
    addMinoristaItem: (producto: Producto, talle: ProductoTalla, cantidad?: number) => void;
    updateMinoristaItem: (id: string, cantidad: number) => void;
    removeMinoristaItem: (id: string) => void;

    // Mayorista Actions
    addCurvaItem: (producto: Producto, talles: ProductoTalla[], cantidad_curvas?: number) => void;
    updateCurvaItem: (id: string, cantidad_curvas: number) => void;
    removeCurvaItem: (id: string) => void;

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

            addMinoristaItem: (producto, talle, cantidad = 1) => {
                const items = get().itemsMinorista;
                const itemId = `${producto.id}-${talle.id}`;
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

            addCurvaItem: (producto, talles, cantidad_curvas = 1) => {
                const items = get().itemsMayorista;
                const itemId = producto.id;
                const existing = items.find(i => i.id === itemId);

                // Validation: A curve must include all sizes marked 'incluido_curva'
                const tallesCodigos = talles.map(t => t.talla_codigo);

                if (existing) {
                    set({
                        itemsMayorista: items.map(i =>
                            i.id === itemId ? { ...i, cantidad_curvas: i.cantidad_curvas + cantidad_curvas } : i
                        )
                    });
                } else {
                    set({
                        itemsMayorista: [...items, {
                            id: itemId,
                            producto,
                            nombre_curva: 'Curva Completa',
                            talles_incluidos: tallesCodigos,
                            cantidad_curvas,
                            precio_curva: producto.precio_mayorista_curva
                        }]
                    });
                }
            },

            updateCurvaItem: (id, cantidad_curvas) => {
                set({
                    itemsMayorista: get().itemsMayorista.map(i =>
                        i.id === id ? { ...i, cantidad_curvas: Math.max(1, cantidad_curvas) } : i
                    )
                });
            },

            removeCurvaItem: (id) => {
                set({
                    itemsMayorista: get().itemsMayorista.filter(i => i.id !== id)
                });
            },

            clearCart: () => set({ itemsMinorista: [], itemsMayorista: [] }),

            getTotals: () => {
                const { itemsMinorista, itemsMayorista } = get();
                const subtotalMinorista = itemsMinorista.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);
                const subtotalMayorista = itemsMayorista.reduce((sum, i) => sum + (i.precio_curva * i.cantidad_curvas), 0);
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
