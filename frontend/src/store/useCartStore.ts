import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Producto } from '../types';

interface CartItem extends Producto {
    quantity: number;
    selectedSize?: string;
    selectedColor?: string;
}

interface CartState {
    items: CartItem[];
    isOpen: boolean;
    addItem: (product: Producto, quantity: number, size?: string, color?: string) => void;
    removeItem: (productId: string, size?: string, color?: string) => void;
    updateQuantity: (productId: string, quantity: number, size?: string, color?: string) => void;
    clearCart: () => void;
    toggleCart: () => void;
    total: number;
}

export const useCartStore = create<CartState>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            total: 0,

            addItem: (product, quantity, size, color) => {
                const currentItems = get().items;
                const existingItemIndex = currentItems.findIndex(
                    item => item.id === product.id && item.selectedSize === size && item.selectedColor === color
                );

                if (existingItemIndex > -1) {
                    const newItems = [...currentItems];
                    newItems[existingItemIndex].quantity += quantity;
                    set({
                        items: newItems,
                        total: calculateTotal(newItems)
                    });
                } else {
                    const newItems = [...currentItems, { ...product, quantity, selectedSize: size, selectedColor: color }];
                    set({
                        items: newItems,
                        total: calculateTotal(newItems)
                    });
                }

                // Open cart when adding item
                set({ isOpen: true });
            },

            removeItem: (productId, size, color) => {
                const newItems = get().items.filter(
                    item => !(item.id === productId && item.selectedSize === size && item.selectedColor === color)
                );
                set({
                    items: newItems,
                    total: calculateTotal(newItems)
                });
            },

            updateQuantity: (productId, quantity, size, color) => {
                if (quantity <= 0) {
                    get().removeItem(productId, size, color);
                    return;
                }

                const newItems = get().items.map(item => {
                    if (item.id === productId && item.selectedSize === size && item.selectedColor === color) {
                        return { ...item, quantity };
                    }
                    return item;
                });

                set({
                    items: newItems,
                    total: calculateTotal(newItems)
                });
            },

            clearCart: () => set({ items: [], total: 0 }),

            toggleCart: () => set(state => ({ isOpen: !state.isOpen })),
        }),
        {
            name: 'cart-storage',
        }
    )
);

const calculateTotal = (items: CartItem[]) => {
    return items.reduce((acc, item) => acc + (item.precio_minorista * item.quantity), 0);
};
