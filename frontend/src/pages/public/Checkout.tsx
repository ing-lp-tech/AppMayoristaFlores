import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, CreditCard, Truck, ChevronLeft, CheckCircle2, Loader2, AlertCircle, ShoppingCart } from 'lucide-react';
import { useCartDualStore } from '../../store/cartDualStore';
import { supabase } from '../../lib/supabase';

export const Checkout = () => {
    const navigate = useNavigate();
    const { mode, itemsMinorista, itemsMayorista, getTotals, clearCart } = useCartDualStore();
    const [loading, setLoading] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

    const isWholesale = mode === 'mayorista';
    const totals = getTotals();
    const subtotal = isWholesale ? totals.subtotalMayorista : totals.subtotalMinorista;
    const finalTotal = totals.total;

    const currentItems = isWholesale ? itemsMayorista : itemsMinorista;

    // Form State
    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        email: '',
        whatsapp: '',
        direccion: '',
        ciudad: '',
        nota: '',
        // Wholesale specific
        razonSocial: '',
        cuit: '',
        tipoEnvio: 'transporte' // transporte, expreso, retiro
    });

    if (currentItems.length === 0 && !orderSuccess) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 max-w-lg mx-auto">
                    <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-6" />
                    <h2 className="text-3xl font-black text-gray-900 mb-4">Tu carrito está vacío</h2>
                    <p className="text-gray-500 mb-10 font-medium">No hay productos en tu sesión {mode}. Explorá nuestro catálogo para comenzar.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-xl shadow-blue-100 transition-all hover:-translate-y-1"
                    >
                        Volver a la Tienda
                    </button>
                </div>
            </div>
        );
    }

    if (orderSuccess) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-gray-100 max-w-2xl mx-auto animate-in fade-in zoom-in duration-500">
                    <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-inner">
                        <CheckCircle2 className="h-12 w-12 text-green-600 stroke-[3]" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">¡Pedido Recibido!</h2>
                    <p className="text-gray-500 mb-2 font-bold text-lg">Número de Orden: <span className="text-blue-600">#{orderSuccess.slice(0, 8).toUpperCase()}</span></p>
                    <p className="text-gray-400 mb-10">Te enviamos una confirmación por WhatsApp. Procesaremos tu envío a la brevedad.</p>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:bg-black"
                        >
                            Ir al Inicio
                        </button>
                        <button
                            className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:bg-blue-700 shadow-lg shadow-blue-100"
                        >
                            Ver mi Pedido
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Create Pedido Header
            const pedidoData = {
                tipo: mode,
                cliente_nombre: `${form.nombre} ${form.apellido}`,
                cliente_email: form.email,
                cliente_whatsapp: form.whatsapp,
                direccion_envio: `${form.direccion}, ${form.ciudad}`,
                total: finalTotal,
                subtotal: subtotal,
                impuestos: 0,
                estado: 'pendiente'
            };

            const { data: pedido, error: pedidoError } = await supabase
                .from('pedidos')
                .insert(pedidoData)
                .select()
                .single();

            if (pedidoError) throw pedidoError;

            // 2. Create Order Items and Reserve Stock
            if (isWholesale) {
                // Mayorista
                const mayoristaItems = itemsMayorista.map(item => ({
                    pedido_id: pedido.id,
                    producto_id: item.producto.id,
                    curva_nombre: item.nombre_curva,
                    cantidad: item.cantidad_curvas,
                    precio_unitario_curva: item.precio_curva,
                    subtotal: item.precio_curva * item.cantidad_curvas,
                    composicion_curva: item.talles_incluidos
                }));

                const { error: itemsError } = await supabase
                    .from('pedido_items_mayorista')
                    .insert(mayoristaItems);

                if (itemsError) throw itemsError;

                // Simple Stock Update (ideally this should be an RPC or Trigger)
                for (const item of itemsMayorista) {
                    // Logic to decrement stock for each talle in the curve
                    // This is complex for a raw SQL loop, usually done via RPC
                }

            } else {
                // Minorista
                const minoristaItems = itemsMinorista.map(item => ({
                    pedido_id: pedido.id,
                    producto_id: item.producto.id,
                    talla_id: item.talle.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    subtotal: item.precio_unitario * item.cantidad
                }));

                const { error: itemsError } = await supabase
                    .from('pedido_items_minorista')
                    .insert(minoristaItems);

                if (itemsError) throw itemsError;
            }

            setOrderSuccess(pedido.id);
            clearCart();
        } catch (error: any) {
            console.error("Checkout error:", error);
            alert(`Error al procesar pedido: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-20">
            {/* Nav Mini */}
            <div className="bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold transition-all group"
                    >
                        <ChevronLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                        Volver a la tienda
                    </button>
                    <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Finalizar Compra</span>
                        <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${isWholesale ? 'bg-blue-600 text-white' : 'bg-gray-900 text-white'}`}>
                                Modo {mode}
                            </span>
                        </div>
                    </div>
                    <div className="w-20" />
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    <div className="lg:col-span-7 space-y-10">
                        <section>
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg border border-gray-100">
                                    <Truck className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Información de Envío</h2>
                                    <p className="text-gray-400 text-sm font-medium">¿A dónde enviamos tu pedido?</p>
                                </div>
                            </div>

                            <form id="checkout-form" onSubmit={handleSubmitOrder} className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                                {isWholesale && (
                                    <>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Razón Social</label>
                                            <input required name="razonSocial" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">CUIT</label>
                                            <input required name="cuit" onChange={handleFormChange} placeholder="00-00000000-0" className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Transportista / Expreso</label>
                                            <select name="tipoEnvio" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600">
                                                <option value="transporte">Transporte Propio</option>
                                                <option value="expreso">Expreso Externo</option>
                                                <option value="retiro">Retiro por Fábrica</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nombre</label>
                                    <input required name="nombre" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Apellido</label>
                                    <input required name="apellido" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email de contacto</label>
                                    <input required type="email" name="email" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">WhatsApp</label>
                                    <input required type="tel" name="whatsapp" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Dirección Completa</label>
                                    <input required name="direccion" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ciudad / Localidad</label>
                                    <input required name="ciudad" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Provincia</label>
                                    <input required name="provincia" value="Buenos Aires" onChange={handleFormChange} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-bold focus:bg-white focus:ring-blue-600" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Notas del pedido (Opcional)</label>
                                    <textarea name="nota" onChange={handleFormChange} rows={3} className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-4 font-medium focus:bg-white focus:ring-blue-600" />
                                </div>
                            </form>
                        </section>

                        <section className="bg-blue-600 p-10 rounded-[2.5rem] shadow-xl shadow-blue-100 text-white relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <CreditCard className="h-8 w-8" />
                                    <h3 className="text-2xl font-black tracking-tight">Método de Pago</h3>
                                </div>
                                <p className="text-blue-100 font-medium leading-relaxed mb-6">
                                    Al hacer click en "Finalizar Compra", generaremos un link de pago o datos de transferencia
                                    para que puedas concretar la operación. Nuestro equipo se pondrá en contacto por WhatsApp.
                                </p>
                                <div className="flex gap-4">
                                    <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Mercado Pago</div>
                                    <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Transferencia</div>
                                    <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Efectivo</div>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        </section>
                    </div>

                    <div className="lg:col-span-5">
                        <div className="sticky top-12 space-y-8">
                            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                                <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-widest">Resumen de Compra</h3>

                                <div className="space-y-6 mb-10 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                    {currentItems.map((item: any, idx) => (
                                        <div key={idx} className="flex gap-4 items-center">
                                            <div className="w-16 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100 italic">
                                                {item.producto.imagen_principal ? (
                                                    <img src={item.producto.imagen_principal} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                        <ShoppingCart className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="text-sm font-black text-gray-900 line-clamp-1">{item.producto.nombre}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {isWholesale ? (
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">CURVA {item.talles_incluidos?.length || 0}u.</span>
                                                    ) : (
                                                        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">TALLE {item.talle.talla_codigo}</span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-gray-400">Cant: {isWholesale ? item.cantidad_curvas : item.cantidad}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-gray-900">
                                                    ${(isWholesale ? (item.precio_curva * item.cantidad_curvas) : (item.precio_unitario * item.cantidad)).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-8 border-t border-gray-100">
                                    <div className="flex justify-between text-gray-500 font-bold">
                                        <span>Subtotal</span>
                                        <span>${subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 font-bold">
                                        <span>Envío</span>
                                        <span className="text-green-500 uppercase text-xs tracking-widest">A convenir</span>
                                    </div>
                                    <div className="flex justify-between pt-6">
                                        <span className="text-lg font-black text-gray-900">Total a pagar</span>
                                        <div className="text-right">
                                            <div className="text-3xl font-black text-blue-600">${finalTotal.toLocaleString()}</div>
                                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-1">ARS - Pesos Argentinos</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    form="checkout-form"
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-5 rounded-2xl font-black text-lg mt-10 flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-2xl relative overflow-hidden ${loading
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                        }`}
                                >
                                    {loading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : (
                                        <>
                                            FINALIZAR COMPRA
                                            <CheckCircle2 className="h-5 w-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
