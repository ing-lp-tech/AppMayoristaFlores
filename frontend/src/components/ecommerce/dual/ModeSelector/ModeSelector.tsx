import React from 'react';
import { ShoppingBag, Package } from 'lucide-react';
import { useCartDualStore, type CartMode } from '../../../../store/cartDualStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const ModeSelector = () => {
    const { mode, setMode } = useCartDualStore();

    const handleModeChange = (newMode: CartMode) => {
        if (mode !== newMode) {
            setMode(newMode);
            // Optional: Show a toast notification
        }
    };

    return (
        <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200 shadow-inner">
            <button
                onClick={() => handleModeChange('minorista')}
                className={twMerge(
                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300",
                    mode === 'minorista'
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                )}
            >
                <ShoppingBag className={clsx("h-4 w-4", mode === 'minorista' ? "fill-blue-50" : "")} />
                <span>Minorista</span>
            </button>
            <button
                onClick={() => handleModeChange('mayorista')}
                className={twMerge(
                    "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-300",
                    mode === 'mayorista'
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-200"
                )}
            >
                <Package className={clsx("h-4 w-4", mode === 'mayorista' ? "fill-blue-50" : "")} />
                <span>Mayorista</span>
            </button>
        </div>
    );
};
