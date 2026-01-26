import { useState, useEffect } from 'react';
import { X, ShoppingCart, Check, Package, Info, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCartDualStore } from '../../../store/cartDualStore';
import { categoryService } from '../../../services/productService';
import type { Producto, ProductoTalla } from '../../../types';

interface ProductModalProps {
    product: Producto & { producto_talles: ProductoTalla[] };
    isOpen: boolean;
    onClose: () => void;
}

export const ProductModal = ({ product, isOpen, onClose }: ProductModalProps) => {
    const { mode, addMinoristaItem, addMayoristaItem } = useCartDualStore();
    const [selectedSizeId, setSelectedSizeId] = useState<string>('');
    const [selectedColor, setSelectedColor] = useState<{ nombre: string; hex: string } | undefined>(undefined);
    const [categoryName, setCategoryName] = useState('');
    const [added, setAdded] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    const prevImage = () => {
        setCurrentImageIndex(prev => prev === 0 ? (product.imagenes.length - 1) : prev - 1);
    };

    const nextImage = () => {
        setCurrentImageIndex(prev => prev === (product.imagenes.length - 1) ? 0 : prev + 1);
    };

    // Matrix State for Wholesale: Map "colorName-talleId" -> quantity
    const [matrixQuantities, setMatrixQuantities] = useState<Record<string, number>>({});

    // ... (keep useEffects)

    // Helper to update matrix
    const handleQuantityChange = (colorName: string, talleId: string, delta: number) => {
        const key = `${colorName}::${talleId}`;
        setMatrixQuantities(prev => {
            const current = prev[key] || 0;
            const newVal = Math.max(0, current + delta);
            if (newVal === 0) {
                const { [key]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [key]: newVal };
        });
    };

    // Derived values
    const isWholesale = mode === 'mayorista';
    const tallesDisponibles = product.producto_talles;
    // For matrix, we show ALL talles, typically sorted
    const sortedTalles = [...tallesDisponibles].sort((a, b) => a.orden - b.orden);

    // Default color if none
    const effectiveColors = product.colores && product.colores.length > 0
        ? product.colores
        : [{ nombre: 'Único', hex: '#000000' }];

    // Wholesale Totals
    const totalMatrixUnits = Object.values(matrixQuantities).reduce((a, b) => a + b, 0);
    // Unit price derivation
    const curveSize = tallesDisponibles.filter(t => t.incluido_curva).length || 1;
    const unitPriceMayorista = product.precio_mayorista_curva / curveSize;

    if (!isOpen) return null;

    const handleAddToCart = () => {
        if (isWholesale) {
            // Build variations list
            const variations: { talle: string; color: { nombre: string; hex: string }; cantidad: number }[] = [];

            Object.entries(matrixQuantities).forEach(([key, qty]) => {
                const [colorName, talleId] = key.split('::');
                const talle = tallesDisponibles.find(t => t.id === talleId);
                const color = effectiveColors.find(c => c.nombre === colorName);

                if (talle && color && qty > 0) {
                    variations.push({
                        talle: talle.talla_codigo,
                        color: { nombre: color.nombre, hex: color.hex },
                        cantidad: qty
                    });
                }
            });

            if (variations.length === 0) {
                alert('Por favor selecciona al menos una unidad');
                return;
            }

            addMayoristaItem(product, variations);
            setAdded(true);
            setTimeout(() => {
                setAdded(false);
                onClose();
                setMatrixQuantities({}); // Reset
            }, 1000);
        } else {
            // ... (keep existing retail logic)
            // Add Retail Unit
            if (!selectedSizeId) {
                alert('Por favor selecciona un talle');
                return;
            }
            if (product.colores && product.colores.length > 0 && !selectedColor) {
                alert('Por favor selecciona un color');
                return;
            }

            const selectedSize = tallesDisponibles.find(t => t.id === selectedSizeId);
            if (selectedSize && selectedSize.stock <= 0) {
                alert('Lo sentimos, este talle no tiene stock');
                return;
            }

            const fullTalle = tallesDisponibles.find(t => t.id === selectedSizeId);
            if (fullTalle) {
                addMinoristaItem(product, fullTalle, 1, selectedColor);
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
                            {/* ... (keep image rendering logic) ... */}
                            <div className="absolute inset-0 w-full h-full">
                                {product.imagenes && product.imagenes.length > 0 ? (
                                    <>
                                        <img
                                            src={product.imagenes[currentImageIndex] || product.imagenes[0]}
                                            alt={`${product.nombre} - ${currentImageIndex + 1}`}
                                            className="w-full h-full object-cover transition-all duration-500"
                                        />

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
                                    <img
                                        src={product.imagen_principal || 'https://via.placeholder.com/600x800'}
                                        alt={product.nombre}
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>

                            <div className="absolute bottom-6 left-6 right-6 z-20">
                                <div className="bg-white/90 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-white/50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Código</span>
                                            <span className="font-bold text-gray-900">{product.codigo}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</span>
                                            <span className="font-bold text-blue-600">{categoryName || product.categoria_id?.slice(0, 5) || 'TEXTIL'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Product Detail & Selection */}
                        <div className="p-8 md:p-12 flex flex-col justify-between bg-white h-full overflow-y-auto custom-scrollbar">
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
                                        <span className="block text-[10px] font-black text-blue-400 uppercase mb-1">Mayorista (Unitario)</span>
                                        <span className="text-2xl font-black text-blue-900">${unitPriceMayorista.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                                        <div className="space-y-6 animate-in slide-in-from-right duration-500">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-blue-600" />
                                                    Armá tu pedido (Matriz)
                                                </h4>
                                                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg uppercase">
                                                    Total: {totalMatrixUnits} un.
                                                </span>
                                            </div>

                                            <div className="bg-gray-50 rounded-2xl p-4 space-y-4 max-h-[300px] overflow-y-auto border border-gray-100">
                                                {effectiveColors.map((color, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                                        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-50">
                                                            <div className="w-4 h-4 rounded-full border border-gray-200 shadow-sm" style={{ backgroundColor: color.hex }} />
                                                            <span className="text-xs font-bold text-gray-800">{color.nombre}</span>
                                                        </div>
                                                        <div className="grid grid-cols-4 gap-2">
                                                            {sortedTalles.map(talle => {
                                                                const qty = matrixQuantities[`${color.nombre}::${talle.id}`] || 0;
                                                                return (
                                                                    <div key={talle.id} className="flex flex-col gap-1">
                                                                        <span className="text-[10px] text-center text-gray-400 font-bold uppercase">{talle.talla_codigo}</span>
                                                                        <div className="flex items-center justify-center bg-gray-50 rounded-lg p-1 border border-gray-200">
                                                                            <button
                                                                                onClick={() => handleQuantityChange(color.nombre, talle.id, -1)}
                                                                                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                            >-</button>
                                                                            <span className={`w-6 text-center text-xs font-bold ${qty > 0 ? 'text-blue-600' : 'text-gray-300'}`}>{qty}</span>
                                                                            <button
                                                                                onClick={() => handleQuantityChange(color.nombre, talle.id, 1)}
                                                                                className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                            >+</button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="flex justify-between items-center text-sm font-bold text-gray-600">
                                                <span>Total Estimado:</span>
                                                <span className="text-xl font-black text-blue-600">${(totalMatrixUnits * unitPriceMayorista).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Seleccionar Talle</h4>
                                                {selectedSizeId && (
                                                    <span className={`text-[10px] font-bold uppercase transition-colors ${sortedTalles.find(t => t.id === selectedSizeId)?.stock! > 10 ? 'text-green-500' : 'text-amber-500'}`}>
                                                        {sortedTalles.find(t => t.id === selectedSizeId)?.stock} disponibles
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

                                            {/* Color Selection - Only if product has colors and retail mode */}
                                            {product.colores && product.colores.length > 0 && (
                                                <div className="mt-4">
                                                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-3">Seleccionar Color</h4>
                                                    <div className="flex flex-wrap gap-3">
                                                        {product.colores.map((c, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => setSelectedColor(c)}
                                                                className={`group relative flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border-2 transition-all ${selectedColor?.nombre === c.nombre
                                                                    ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-100'
                                                                    : 'border-transparent hover:border-gray-200 bg-gray-50'
                                                                    }`}
                                                            >
                                                                <span
                                                                    className="w-6 h-6 rounded-full border border-gray-200 shadow-sm"
                                                                    style={{ backgroundColor: c.hex }}
                                                                />
                                                                <span className={`text-xs font-bold ${selectedColor?.nombre === c.nombre ? 'text-blue-700' : 'text-gray-600'}`}>
                                                                    {c.nombre}
                                                                </span>
                                                                {selectedColor?.nombre === c.nombre && (
                                                                    <div className="absolute -top-1 -right-1 bg-blue-600 text-white rounded-full p-0.5">
                                                                        <Check className="h-2 w-2" />
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedSizeId && tallesDisponibles.find(t => t.id === selectedSizeId)?.stock! <= 3 && tallesDisponibles.find(t => t.id === selectedSizeId)?.stock! > 0 && (
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
                                            {isWholesale ? 'AGREGAR SELECCIÓN' : 'AGREGAR AL CARRITO'}
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
