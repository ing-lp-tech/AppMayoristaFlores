import { useState } from 'react';
import { ShoppingCart, Eye, Package } from 'lucide-react';
import { ProductModal } from '../../shared/ProductModal';
import type { Producto, ProductoTalla } from '../../../../types';
import { useCartDualStore } from '../../../../store/cartDualStore';

interface ProductCardProps {
    product: Producto & { producto_talles: ProductoTalla[] };
}

export const ProductCard = ({ product }: ProductCardProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { mode } = useCartDualStore();

    // Verification: if product is not available for current mode, we might want to grey it out or hide it.
    // For now, let's just show it but highlight the relevant price.
    const isWholesale = mode === 'mayorista';

    // In wholesale mode, we show the unit price equivalent inside the curve for comparison


    return (
        <>
            <div
                className="group relative bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col h-full"
                onClick={() => setIsModalOpen(true)}
            >
                {/* Image Container */}
                <div className="aspect-[3/4] bg-gray-50 overflow-hidden relative">
                    <img
                        src={product.imagen_principal || 'https://via.placeholder.com/400x600?text=Sin+Imagen'}
                        alt={product.nombre}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/95 text-gray-900 px-6 py-2.5 rounded-full font-bold shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all flex items-center gap-2">
                            <Eye className="h-4 w-4 text-blue-600" />
                            Ver Detalle
                        </div>
                    </div>

                    {/* Badge Mode */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                        {product.disponible_mayorista && (
                            <div className="bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-tighter flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Mayorista
                            </div>
                        )}
                        {product.destacado && (
                            <div className="bg-amber-400 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-lg uppercase tracking-tighter">
                                Nuevo
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col">
                    <div className="mb-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            Cat ID: {product.codigo}
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {product.nombre}
                    </h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">
                        {product.descripcion_publica}
                    </p>

                    <div className="pt-4 border-t border-gray-50 flex items-end justify-between">
                        <div>
                            {isWholesale ? (
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-tight">Precio Mayorista (C/U)</span>
                                    <span className="text-2xl font-black text-blue-900 animate-in fade-in zoom-in duration-300">
                                        ${product.precio_mayorista_curva.toLocaleString()}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Precio por Unidad</span>
                                    <span className="text-2xl font-black text-gray-900">
                                        ${product.precio_minorista.toLocaleString()}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-12 shadow-sm">
                            <ShoppingCart className="h-5 w-5" />
                        </div>
                    </div>
                </div>
            </div>

            <ProductModal
                product={product}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </>
    );
};
