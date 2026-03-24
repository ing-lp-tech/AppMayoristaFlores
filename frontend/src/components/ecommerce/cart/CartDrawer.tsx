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
        removeMayoristaItem,
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
                                                    {Object.values(itemsMinorista.reduce((acc, item) => {
                                                        if (!acc[item.producto.id]) {
                                                            acc[item.producto.id] = { producto: item.producto, items: [] };
                                                        }
                                                        acc[item.producto.id].items.push(item);
                                                        return acc;
                                                    }, {} as Record<string, { producto: any, items: typeof itemsMinorista }>)).map((group) => {
                                                        const colors = Array.from(new Set(group.items.map(i => i.color?.nombre || 'Sin Color')));
                                                        const talles = Array.from(new Set(group.items.map(i => i.talle.talla_codigo))).sort();
                                                        const totalProdPrice = group.items.reduce((sum, i) => sum + (i.precio_unitario * i.cantidad), 0);
                                                        const totalProdQty = group.items.reduce((sum, i) => sum + i.cantidad, 0);

                                                        const getItem = (c: string, t: string) => group.items.find(i => (i.color?.nombre || 'Sin Color') === c && i.talle.talla_codigo === t);

                                                        return (
                                                            <li key={group.producto.id} className="py-4 flex flex-col gap-3">
                                                                <div className="flex items-start gap-4">
                                                                    <div className="flex-shrink-0 w-16 h-16 border border-gray-200 rounded-md overflow-hidden bg-gray-100">
                                                                        <img
                                                                            src={group.producto.imagen_principal || 'https://placehold.co/150x150/e2e8f0/64748b?text=Sin+Imagen'}
                                                                            className="w-full h-full object-center object-cover"
                                                                        />
                                                                    </div>

                                                                    <div className="flex-1 flex flex-col">
                                                                        <div className="flex justify-between text-base font-medium text-gray-900">
                                                                            <h4 className="text-sm font-bold">{group.producto.nombre}</h4>
                                                                            <p className="text-sm text-gray-900 font-bold">${totalProdPrice.toLocaleString()}</p>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 mt-1">{totalProdQty} unidades en total</p>
                                                                    </div>
                                                                    <button onClick={() => group.items.forEach(i => removeMinoristaItem(i.id))} className="text-red-400 hover:text-red-600 p-1 title='Vaciar artículo'">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>

                                                                {/* Variations Summary in Matrix Form */}
                                                                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mt-2">
                                                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                                        <thead className="bg-gray-50">
                                                                            <tr>
                                                                                <th className="px-2 py-2 text-left font-black text-gray-500 uppercase">Color \\ Talle</th>
                                                                                {talles.map(t => (
                                                                                    <th key={t} className="px-1 py-2 text-center font-bold text-gray-700 min-w-[50px]">{t}</th>
                                                                                ))}
                                                                                <th className="px-2 py-2 text-right font-black text-gray-500 uppercase">Total</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-200 bg-white">
                                                                            {colors.map(colorName => {
                                                                                const sampleItem = group.items.find(i => (i.color?.nombre || 'Sin Color') === colorName);
                                                                                const hex = sampleItem?.color?.hex;
                                                                                const rowTotal = talles.reduce((sum, t) => sum + (getItem(colorName, t)?.cantidad || 0), 0);
                                                                                return (
                                                                                    <tr key={colorName} className="hover:bg-gray-50/50">
                                                                                        <td className="px-2 py-1.5 font-bold text-gray-900 break-words max-w-[90px]">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                {hex && <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: hex }}></div>}
                                                                                                <span className="truncate" title={colorName}>{colorName}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        {talles.map(t => {
                                                                                            const currentItem = getItem(colorName, t);
                                                                                            return (
                                                                                                <td key={t} className="px-1 py-1 text-center">
                                                                                                    {currentItem ? (
                                                                                                        <div className="flex items-center justify-center border border-gray-200 rounded-lg bg-gray-50 overflow-hidden w-full max-w-[65px] mx-auto">
                                                                                                            <button
                                                                                                                onClick={() => {
                                                                                                                    if (currentItem.cantidad <= 1) removeMinoristaItem(currentItem.id);
                                                                                                                    else updateMinoristaItem(currentItem.id, currentItem.cantidad - 1);
                                                                                                                }}
                                                                                                                className="px-1.5 py-1 hover:bg-gray-200 text-gray-600 transition-colors"
                                                                                                            >
                                                                                                                <Minus className="h-3 w-3" />
                                                                                                            </button>
                                                                                                            <span className="font-bold flex-1 text-center text-[10px]">{currentItem.cantidad}</span>
                                                                                                            <button
                                                                                                                onClick={() => updateMinoristaItem(currentItem.id, currentItem.cantidad + 1)}
                                                                                                                className="px-1.5 py-1 hover:bg-gray-200 text-gray-600 transition-colors"
                                                                                                            >
                                                                                                                <Plus className="h-3 w-3" />
                                                                                                            </button>
                                                                                                        </div>
                                                                                                    ) : (
                                                                                                        <span className="text-gray-300">-</span>
                                                                                                    )}
                                                                                                </td>
                                                                                            )
                                                                                        })}
                                                                                        <td className="px-2 py-1.5 text-right font-black text-gray-700">{rowTotal}</td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Mayorista Section */}
                                        {itemsMayorista.length > 0 && (
                                            <div>
                                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                                    <Package className="h-3 w-3" /> Pedidos Mayoristas
                                                </h3>
                                                <ul role="list" className="divide-y divide-gray-100">
                                                    {itemsMayorista.map((item) => {
                                                        const colors = Array.from(new Set((item.variaciones || []).map(v => v.color.nombre)));
                                                        const talles = Array.from(new Set((item.variaciones || []).map(v => v.talle)));

                                                        const cellValue = (c: string, t: string) => {
                                                            const v = item.variaciones?.find(v => v.color.nombre === c && v.talle === t);
                                                            return v ? v.cantidad : null;
                                                        };

                                                        return (
                                                            <li key={item.id} className="py-4 flex flex-col gap-3">
                                                                <div className="flex items-start gap-4">
                                                                    <div className="flex-shrink-0 w-16 h-16 border border-blue-100 rounded-md overflow-hidden bg-blue-50 flex items-center justify-center">
                                                                        {item.producto.imagen_principal ? (
                                                                            <img src={item.producto.imagen_principal} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <Package className="h-8 w-8 text-blue-200" />
                                                                        )}
                                                                    </div>

                                                                    <div className="flex-1 flex flex-col">
                                                                        <div className="flex justify-between text-base font-medium text-gray-900">
                                                                            <h4 className="text-sm font-bold">{item.producto.nombre}</h4>
                                                                            <p className="text-sm text-blue-600 font-bold">${(item.precio_total || 0).toLocaleString()}</p>
                                                                        </div>
                                                                        <p className="text-xs text-gray-500 mt-1">{item.cantidad_total || 0} unidades en total</p>
                                                                    </div>

                                                                    <button onClick={() => removeMayoristaItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>

                                                                {/* Variations Summary in Matrix Form */}
                                                                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm mt-2">
                                                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                                        <thead className="bg-gray-50">
                                                                            <tr>
                                                                                <th className="px-2 py-2 text-left font-black text-gray-500 uppercase">Color \\ Talle</th>
                                                                                {talles.map(t => (
                                                                                    <th key={t} className="px-2 py-2 text-center font-bold text-gray-700 min-w-[30px]">{t}</th>
                                                                                ))}
                                                                                <th className="px-2 py-2 text-right font-black text-gray-500 uppercase">Total</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody className="divide-y divide-gray-200 bg-white">
                                                                            {colors.map(colorName => {
                                                                                const hex = item.variaciones?.find(v => v.color.nombre === colorName)?.color.hex;
                                                                                const rowTotal = talles.reduce((sum, t) => sum + (cellValue(colorName, t) || 0), 0);
                                                                                return (
                                                                                    <tr key={colorName} className="hover:bg-gray-50/50">
                                                                                        <td className="px-2 py-1.5 font-bold text-gray-900 break-words max-w-[100px]">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                {hex && <div className="w-2.5 h-2.5 rounded-full border border-gray-200 shrink-0" style={{ backgroundColor: hex }}></div>}
                                                                                                <span className="truncate" title={colorName}>{colorName}</span>
                                                                                            </div>
                                                                                        </td>
                                                                                        {talles.map(t => (
                                                                                            <td key={t} className="px-2 py-1.5 text-center text-gray-600 font-medium">
                                                                                                {cellValue(colorName, t) || '-'}
                                                                                            </td>
                                                                                        ))}
                                                                                        <td className="px-2 py-1.5 text-right font-black text-blue-600">{rowTotal}</td>
                                                                                    </tr>
                                                                                );
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            </li>
                                                        )
                                                    })}
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
