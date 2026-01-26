import { useState, useEffect } from 'react';
import { X, ShoppingCart, Check, Package, Info, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCartDualStore } from '../../../store/cartDualStore';
import type { Producto, ProductoTalla } from '../../../types';

interface ProductModalProps {
    product: Producto & { producto_talles: ProductoTalla[] };
    isOpen: boolean;
    onClose: () => void;
}

export const ProductModal = ({ product, isOpen, onClose }: ProductModalProps) => {
    const { mode, addMinoristaItem, addCurvaItem } = useCartDualStore();
    const [selectedSizeId, setSelectedSizeId] = useState<string>('');
    const [added, setAdded] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Carousel Logic
    useEffect(() => {
        if (!isOpen) {
            setCurrentImageIndex(0); // Reset on close
            return;
        }

        // Auto-play only if multiple images
        if (product.imagenes && product.imagenes.length > 1) {
            const interval = setInterval(() => {
                setCurrentImageIndex(prev => (prev + 1) % product.imagenes!.length);
            }, 4000); // 4 seconds
            return () => clearInterval(interval);
        }
    }, [isOpen, product.imagenes]);

    const nextImage = () => {
        if (product.imagenes && product.imagenes.length > 0) {
            setCurrentImageIndex(prev => (prev + 1) % product.imagenes!.length);
        }
    };

    const prevImage = () => {
        if (product.imagenes && product.imagenes.length > 0) {
            setCurrentImageIndex(prev => (prev - 1 + product.imagenes!.length) % product.imagenes!.length);
        }
    };

    // Derived values
    const isWholesale = mode === 'mayorista';
    const tallesDisponibles = product.producto_talles;
    const tallesCurva = tallesDisponibles.filter(t => t.incluido_curva);
    const selectedSize = tallesDisponibles.find(t => t.id === selectedSizeId);

    if (!isOpen) return null;

    const handleAddToCart = () => {
        if (isWholesale) {
            // Add Curve
            // In a real system, we'd check if all sizes in the curve have at least 1 unit of stock
            addCurvaItem(product, tallesCurva, 1);
            setAdded(true);
            setTimeout(() => { setAdded(false); onClose(); }, 1500);
        } else {
            // Add Retail Unit
            if (!selectedSizeId) {
                alert('Por favor selecciona un talle');
                return;
            }
            if (selectedSize && selectedSize.stock <= 0) {
                alert('Lo sentimos, este talle no tiene stock');
                return;
            }

            const fullTalle = tallesDisponibles.find(t => t.id === selectedSizeId);
            if (fullTalle) {
                addMinoristaItem(product, fullTalle, 1);
                setAdded(true);
                setTimeout(() => { setAdded(false); onClose(); }, 1500);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-3xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full border border-gray-100">

                    <button
                        type="button"
                        className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-full p-2 text-gray-400 hover:text-gray-900 z-50 shadow-sm border border-gray-100 transition-all hover:rotate-90"
                        onClick={onClose}
                    >
                        <X className="h-6 w-6" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2">
                        {/* LEFT: Image Gallery / Carousel */}
                        <div className="aspect-[4/5] bg-gray-50 relative group">
                            {/* Carousel Content */}
                            <div className="absolute inset-0 w-full h-full">
                                {product.imagenes && product.imagenes.length > 0 ? (
                                    <>
                                        <img
                                            src={product.imagenes[currentImageIndex] || product.imagenes[0]}
                                            alt={`${product.nombre} - ${currentImageIndex + 1}`}
                                            className="w-full h-full object-cover transition-all duration-500"
                                        />

                                        {/* Navigation Arrows - Only if > 1 image */}
                                        {product.imagenes.length > 1 && (
                                            <>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white text-gray-800"
                                                >
                                                    <ChevronLeft className="h-6 w-6" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white text-gray-800"
                                                >
                                                    <ChevronRight className="h-6 w-6" />
                                                </button>

                                                {/* Dots Indicator */}
                                                <div className="absolute bottom-24 left-0 right-0 flex justify-center gap-2 z-10">
                                                    {product.imagenes.map((_, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                                                            className={`w-2 h-2 rounded-full transition-all shadow-md ${currentImageIndex === idx
                                                                ? 'bg-white w-6'
                                                                : 'bg-white/50 hover:bg-white/80'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </>
                                ) : (
                                    // Fallback for NO images
                                    <img
                                        src={product.imagen_principal || 'https://via.placeholder.com/600x800'}
                                        alt={product.nombre}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>

                            {/* Overlay for price comparison */}
                            <div className="absolute bottom-6 left-6 right-6 z-20">
                                <div className="bg-white/90 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-white/50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código</span>
                                            <span className="font-bold text-gray-900">{product.codigo}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</span>
                                            <span className="font-bold text-blue-600">ID: {product.categoria_id?.slice(0, 5) || 'TEXTIL'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Product Detail & Selection */}
                        <div className="p-8 md:p-12 flex flex-col justify-between bg-white">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 mb-2 leading-none" id="modal-title">
                                    {product.nombre}
                                </h3>

                                <div className="flex items-center gap-4 mt-6">
                                    <div className={`p-4 rounded-2xl border-2 transition-all ${!isWholesale ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 bg-gray-50 opacity-40'}`}>
                                        <span className="block text-[10px] font-black text-gray-400 uppercase mb-1">Minorista</span>
                                        <span className="text-2xl font-black text-gray-900">${product.precio_minorista.toLocaleString()}</span>
                                    </div>
                                    <div className={`p-4 rounded-2xl border-2 transition-all ${isWholesale ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 bg-gray-50 opacity-40'}`}>
                                        <span className="block text-[10px] font-black text-blue-400 uppercase mb-1">Mayorista (Curva)</span>
                                        <span className="text-2xl font-black text-blue-900">${product.precio_mayorista_curva.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="mt-8 space-y-2">
                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Descripción</h4>
                                    <p className="text-gray-500 text-sm leading-relaxed">
                                        {product.descripcion_publica || 'Un clásico indispensable en tu colección. Calidad premium garantizada.'}
                                    </p>
                                </div>

                                {/* Dynamic Section: Selection */}
                                <div className="mt-10 pt-10 border-t border-gray-100">
                                    {isWholesale ? (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-blue-600" />
                                                    Composición de la Curva
                                                </h4>
                                                <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-lg uppercase">
                                                    Pack de {tallesCurva.length} Unidades
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                {tallesCurva.map(t => (
                                                    <div key={t.id} className="aspect-square flex flex-col items-center justify-center border-2 border-blue-100 rounded-xl bg-blue-50/30">
                                                        <span className="text-xs font-black text-blue-700">{t.talla_codigo}</span>
                                                        <span className="text-[10px] text-blue-400 font-bold">1u.</span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="p-4 bg-gray-50 rounded-2xl flex items-start gap-4">
                                                <Info className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-gray-500 leading-tight">
                                                    La curva mayorista incluye una unidad de cada talle especificado arriba.
                                                    El precio especial se aplica por el pack completo.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Seleccionar Talle</h4>
                                                {selectedSize && (
                                                    <span className={`text-[10px] font-bold uppercase transition-colors ${selectedSize.stock > 10 ? 'text-green-500' : 'text-amber-500'}`}>
                                                        {selectedSize.stock} disponibles
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {tallesDisponibles.map(t => (
                                                    <button
                                                        key={t.id}
                                                        onClick={() => setSelectedSizeId(t.id)}
                                                        disabled={t.stock <= 0}
                                                        className={`min-w-[50px] h-12 flex flex-col items-center justify-center rounded-xl font-bold transition-all border-2 relative ${selectedSizeId === t.id
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                                                            : t.stock <= 0
                                                                ? 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed opacity-50'
                                                                : 'bg-white border-gray-100 text-gray-900 hover:border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        <span className="text-sm">{t.talla_codigo}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {selectedSize && selectedSize.stock <= 3 && selectedSize.stock > 0 && (
                                                <div className="flex items-center gap-2 text-amber-600 animate-pulse">
                                                    <AlertCircle className="h-4 w-4" />
                                                    <span className="text-xs font-bold">¡Últimas unidades disponibles!</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* MAIN ACTION */}
                            <div className="mt-12 space-y-4">
                                <button
                                    onClick={handleAddToCart}
                                    disabled={added || (!isWholesale && !selectedSizeId)}
                                    className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-xl ${added
                                        ? 'bg-green-500 text-white cursor-default'
                                        : !isWholesale && !selectedSizeId
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-2xl hover:-translate-y-1'
                                        }`}
                                >
                                    {added ? (
                                        <>
                                            <Check className="h-6 w-6 stroke-[3]" />
                                            ¡PRODUCTO AGREGADO!
                                        </>
                                    ) : (
                                        <>
                                            <ShoppingCart className="h-6 w-6" />
                                            {isWholesale ? 'COMPRAR CURVA COMPLETA' : 'AGREGAR AL CARRITO'}
                                        </>
                                    )}
                                </button>

                                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Pago seguro con Tarjeta o Transferencia
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
