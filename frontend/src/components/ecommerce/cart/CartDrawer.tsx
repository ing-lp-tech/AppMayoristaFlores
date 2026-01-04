import { useNavigate } from 'react-router-dom';
import { X, Minus, Plus, Trash2, ShoppingBag, Package } from 'lucide-react';
import { useCartDualStore } from '../../../store/cartDualStore';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const {
        itemsMinorista,
        itemsMayorista,
        updateMinoristaItem,
        removeMinoristaItem,
        updateCurvaItem,
        removeCurvaItem,
        getTotals
    } = useCartDualStore();

    const { subtotalMinorista, subtotalMayorista, total, count } = getTotals();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] overflow-hidden" aria-labelledby="slide-over-title" role="dialog" aria-modal="true">
            <div className="absolute inset-0 overflow-hidden">
                {/* Overlay */}
                <div
                    className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity backdrop-blur-sm"
                    onClick={onClose}
                ></div>

                <div className="fixed inset-y-0 right-0 max-w-full flex">
                    <div className="w-screen max-w-md pointer-events-auto">
                        <div className="h-full flex flex-col bg-white shadow-xl">
                            {/* Header */}
                            <div className="flex-shrink-0 px-4 py-6 sm:px-6 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-start justify-between">
                                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2" id="slide-over-title">
                                        <ShoppingBag className="h-5 w-5 text-blue-600" />
                                        Tu Carrito Dual
                                    </h2>
                                    <div className="ml-3 h-7 flex items-center">
                                        <button
                                            type="button"
                                            className="bg-white rounded-full p-1 text-gray-400 hover:text-gray-500 focus:outline-none ring-1 ring-gray-200"
                                            onClick={onClose}
                                        >
                                            <span className="sr-only">Cerrar</span>
                                            <X className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Cart Items */}
                            <div className="flex-1 py-6 overflow-y-auto px-4 sm:px-6">
                                {count === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center">
                                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                                            <ShoppingBag className="h-8 w-8 text-blue-300" />
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900">Tu carrito está vacío</h3>
                                        <p className="mt-2 text-gray-500">¿Minorista o Mayorista? ¡Tú eliges!</p>
                                        <button
                                            onClick={onClose}
                                            className="mt-6 text-blue-600 font-medium hover:text-blue-800"
                                        >
                                            Volver a la tienda &rarr;
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flow-root space-y-8">
                                        {/* Minorista Section */}
                                        {itemsMinorista.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <ShoppingBag className="h-3 w-3" /> Prendas por Unidad
                                                </h3>
                                                <ul role="list" className="divide-y divide-gray-100">
                                                    {itemsMinorista.map((item) => (
                                                        <li key={item.id} className="py-4 flex">
                                                            <div className="flex-shrink-0 w-16 h-16 border border-gray-200 rounded-md overflow-hidden bg-gray-100">
                                                                <img
                                                                    src={item.producto.imagen_principal || 'https://via.placeholder.com/150'}
                                                                    className="w-full h-full object-center object-cover"
                                                                />
                                                            </div>

                                                            <div className="ml-4 flex-1 flex flex-col">
                                                                <div className="flex justify-between text-base font-medium text-gray-900">
                                                                    <h4 className="text-sm font-bold">{item.producto.nombre}</h4>
                                                                    <p className="text-sm">${(item.precio_unitario * item.cantidad).toLocaleString()}</p>
                                                                </div>
                                                                <p className="text-xs text-gray-500">Talle: {item.talle.talla_codigo}</p>

                                                                <div className="flex-1 flex items-end justify-between text-sm mt-2">
                                                                    <div className="flex items-center border border-gray-200 rounded-lg">
                                                                        <button
                                                                            onClick={() => updateMinoristaItem(item.id, item.cantidad - 1)}
                                                                            className="p-1 hover:bg-gray-100"
                                                                        >
                                                                            <Minus className="h-3 w-3" />
                                                                        </button>
                                                                        <span className="px-2 font-medium w-6 text-center">{item.cantidad}</span>
                                                                        <button
                                                                            onClick={() => updateMinoristaItem(item.id, item.cantidad + 1)}
                                                                            className="p-1 hover:bg-gray-100"
                                                                        >
                                                                            <Plus className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                    <button onClick={() => removeMinoristaItem(item.id)} className="text-red-400 hover:text-red-600">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Mayorista Section */}
                                        {itemsMayorista.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Package className="h-3 w-3" /> Curvas Completas
                                                </h3>
                                                <ul role="list" className="divide-y divide-gray-100">
                                                    {itemsMayorista.map((curva) => (
                                                        <li key={curva.id} className="py-4 flex">
                                                            <div className="flex-shrink-0 w-16 h-16 border border-blue-100 rounded-md overflow-hidden bg-blue-50 flex items-center justify-center">
                                                                <Package className="h-8 w-8 text-blue-200" />
                                                            </div>

                                                            <div className="ml-4 flex-1 flex flex-col">
                                                                <div className="flex justify-between text-base font-medium text-gray-900">
                                                                    <h4 className="text-sm font-bold">{curva.producto.nombre}</h4>
                                                                    <p className="text-sm text-blue-600 font-bold">${(curva.precio_curva * curva.cantidad_curvas).toLocaleString()}</p>
                                                                </div>
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {curva.talles_incluidos.map(t => (
                                                                        <span key={t} className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded border border-blue-100">{t}</span>
                                                                    ))}
                                                                </div>

                                                                <div className="flex-1 flex items-end justify-between text-sm mt-3">
                                                                    <div className="flex items-center border border-blue-200 rounded-lg">
                                                                        <button
                                                                            onClick={() => updateCurvaItem(curva.id, curva.cantidad_curvas - 1)}
                                                                            className="p-1 hover:bg-blue-50 text-blue-600"
                                                                        >
                                                                            <Minus className="h-3 w-3" />
                                                                        </button>
                                                                        <span className="px-2 font-bold text-blue-700 w-8 text-center">{curva.cantidad_curvas}</span>
                                                                        <button
                                                                            onClick={() => updateCurvaItem(curva.id, curva.cantidad_curvas + 1)}
                                                                            className="p-1 hover:bg-blue-50 text-blue-600"
                                                                        >
                                                                            <Plus className="h-3 w-3" />
                                                                        </button>
                                                                    </div>
                                                                    <button onClick={() => removeCurvaItem(curva.id)} className="text-red-400 hover:text-red-600">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer / Total */}
                            {count > 0 && (
                                <div className="border-t border-gray-200 py-6 px-4 sm:px-6 bg-gray-50">
                                    <div className="space-y-2 mb-6">
                                        {itemsMinorista.length > 0 && (
                                            <div className="flex justify-between text-sm text-gray-600">
                                                <span>Subtotal Minorista</span>
                                                <span>${subtotalMinorista.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {itemsMayorista.length > 0 && (
                                            <div className="flex justify-between text-sm text-blue-600 font-medium">
                                                <span>Subtotal Mayorista</span>
                                                <span>${subtotalMayorista.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between text-xl font-black text-gray-900 pt-2 border-t">
                                            <p>Total</p>
                                            <p>${total.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            onClose();
                                            navigate('/checkout');
                                        }}
                                        className="w-full flex justify-center items-center px-6 py-4 border border-transparent rounded-full shadow-lg text-lg font-black text-white bg-blue-600 hover:bg-blue-700 transition-all hover:scale-[1.02]"
                                    >
                                        Ir al Checkout
                                    </button>

                                    <div className="mt-4 text-center">
                                        <button onClick={onClose} className="text-sm font-bold text-gray-500 hover:text-gray-700">
                                            Continuar navegando
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
