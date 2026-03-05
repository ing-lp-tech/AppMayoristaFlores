import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingBag, CreditCard, Truck, ChevronLeft, CheckCircle2,
    Loader2, ShoppingCart, MessageCircle
} from 'lucide-react';
import { useCartDualStore } from '../../store/cartDualStore';
import { paymentService } from '../../services/paymentService';
import { supabase } from '../../lib/supabase';
import { getMPInstance } from '../../lib/mercadopago';

// ─── Número de WhatsApp del negocio ──────────────────────────────────────────
const WHATSAPP_NUMBER = '5491126879409';

// ─── Genera el mensaje para WhatsApp ─────────────────────────────────────────
const buildWhatsAppMessage = (
    codigoPedido: string,
    form: {
        nombre: string; apellido: string; email: string; whatsapp: string;
        direccion: string; ciudad: string; nota: string;
        razonSocial: string; cuit: string; tipoEnvio: string;
    },
    items: any[],
    total: number
): string => {
    const tipoEnvioLabel: Record<string, string> = {
        transporte: 'Transporte propio',
        expreso: 'Expreso externo',
        retiro: 'Retiro por fábrica',
    };

    const lineas: string[] = [
        `🛍️ *NUEVO PEDIDO MAYORISTA*`,
        `📋 Código: *${codigoPedido}*`,
        ``,
        `👤 *DATOS DEL COMPRADOR*`,
        `• Nombre: ${form.nombre} ${form.apellido}`,
        ...(form.razonSocial ? [`• Razón Social: ${form.razonSocial}`] : []),
        ...(form.cuit ? [`• CUIT: ${form.cuit}`] : []),
        `• WhatsApp: ${form.whatsapp}`,
        ...(form.email ? [`• Email: ${form.email}`] : []),
        `• Ciudad: ${form.ciudad}`,
        ...(form.direccion ? [`• Dirección: ${form.direccion}`] : []),
        `• Envío: ${tipoEnvioLabel[form.tipoEnvio] || form.tipoEnvio}`,
        ``,
        `📦 *DETALLE DEL PEDIDO*`,
    ];

    items.forEach((item: any, i: number) => {
        lineas.push(``);
        lineas.push(`${i + 1}. *${item.producto.nombre}*`);
        lineas.push(`   Total: ${item.cantidad_total} u. | $${item.precio_total.toLocaleString('es-AR')}`);
        lineas.push(`   Variaciones:`);

        // Agrupar variaciones por color
        const byColor: Record<string, { talle: string; cantidad: number }[]> = {};
        item.variaciones.forEach((v: any) => {
            const c = v.color?.nombre || 'Sin color';
            if (!byColor[c]) byColor[c] = [];
            byColor[c].push({ talle: v.talle, cantidad: v.cantidad });
        });

        Object.entries(byColor).forEach(([color, talles]) => {
            const detalle = talles.map(t => `${t.talle}×${t.cantidad}`).join(', ');
            lineas.push(`   • *${color}*: ${detalle}`);
        });
    });

    lineas.push(``);
    lineas.push(`💰 *TOTAL: $${total.toLocaleString('es-AR')}*`);
    lineas.push(`📌 Envío a convenir.`);

    if (form.nota) {
        lineas.push(``);
        lineas.push(`📝 Nota: ${form.nota}`);
    }

    return lineas.join('\n');
};

export const Checkout = () => {
    const navigate = useNavigate();
    const { mode, itemsMinorista, itemsMayorista, getTotals, clearCart } = useCartDualStore();
    const [loading, setLoading] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<{ id: string; codigo: string } | null>(null);
    // Para Checkout Pro: el preference_id que activa el Wallet Brick de MP
    const [mpPreferenceId, setMpPreferenceId] = useState<string | null>(null);
    const [mpBrickReady, setMpBrickReady] = useState(false);

    const isWholesale = mode === 'mayorista';
    const totals = getTotals();
    const subtotal = isWholesale ? totals.subtotalMayorista : totals.subtotalMinorista;
    const finalTotal = totals.total;
    const currentItems = isWholesale ? itemsMayorista : itemsMinorista;

    const [form, setForm] = useState({
        nombre: '',
        apellido: '',
        email: '',
        whatsapp: '',
        direccion: '',
        ciudad: '',
        nota: '',
        razonSocial: '',
        cuit: '',
        tipoEnvio: 'transporte',
    });

    const [paymentType, setPaymentType] = useState<'total' | 'sena'>('total');
    const [depositAmount, setDepositAmount] = useState<number>(0);

    // ── Checkout Pro: montar Wallet Brick cuando tengamos preference_id ──────
    useEffect(() => {
        if (!mpPreferenceId) return;

        const mp = getMPInstance();
        if (!mp) return;

        // Limpiar el contenedor antes de montar
        const container = document.getElementById('mp-wallet-container');
        if (container) container.innerHTML = '';

        const bricksBuilder = mp.bricks();
        bricksBuilder.create('wallet', 'mp-wallet-container', {
            initialization: { preferenceId: mpPreferenceId },
            customization: {
                texts: { action: 'pay', valueProp: 'smart_option' },
            },
            callbacks: {
                onReady: () => setMpBrickReady(true),
                onError: (err: any) => console.error('[MP Brick]', err),
            },
        });
    }, [mpPreferenceId]);

    if (currentItems.length === 0 && !orderSuccess) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center">
                <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-gray-100 max-w-lg mx-auto">
                    <ShoppingBag className="h-16 w-16 text-gray-200 mx-auto mb-6" />
                    <h2 className="text-3xl font-black text-gray-900 mb-4">Tu carrito está vacío</h2>
                    <p className="text-gray-500 mb-10 font-medium">
                        No hay productos en tu sesión {mode}. Explorá nuestro catálogo para comenzar.
                    </p>
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
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 border-4 border-white shadow-inner ${isWholesale ? 'bg-green-100' : 'bg-blue-100'}`}>
                        {isWholesale
                            ? <MessageCircle className="h-12 w-12 text-green-600 stroke-[2]" />
                            : <CheckCircle2 className="h-12 w-12 text-blue-600 stroke-[3]" />
                        }
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tight">¡Pedido Registrado!</h2>
                    <p className="text-gray-500 mb-2 font-bold text-lg">
                        Código: <span className={isWholesale ? 'text-green-600' : 'text-blue-600'}>#{orderSuccess.codigo}</span>
                    </p>
                    {isWholesale ? (
                        <p className="text-gray-400 mb-10">
                            Tu pedido fue guardado. Ahora abrí WhatsApp para coordinar el pago y envío con nuestro equipo.
                        </p>
                    ) : (
                        <p className="text-gray-400 mb-10">
                            Fuiste redirigido a MercadoPago para completar el pago. Si no fue así, volvé al inicio.
                        </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="py-4 bg-gray-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:bg-black"
                        >
                            Ir al Inicio
                        </button>
                        {isWholesale && (
                            <a
                                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-4 bg-[#25D366] text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all hover:bg-green-600 flex items-center justify-center gap-2 shadow-lg shadow-green-100"
                            >
                                <MessageCircle className="h-5 w-5" />
                                Abrir WhatsApp
                            </a>
                        )}
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
            // ── Validación de seña (solo minorista) ──────────────────────
            if (!isWholesale && paymentType === 'sena' && (depositAmount <= 0 || depositAmount >= finalTotal)) {
                alert('El monto de la seña debe ser mayor a 0 y menor al total.');
                setLoading(false);
                return;
            }

            const codigoPedido = `PED-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

            // ── 1. Crear pedido en Supabase ──────────────────────────────
            // Construir datos del pedido (solo campos que existen en la tabla)
            const notaInterna = isWholesale
                ? [
                    form.nota,
                    form.razonSocial ? `RS: ${form.razonSocial}` : '',
                    form.cuit ? `CUIT: ${form.cuit}` : '',
                    `Envío: ${form.tipoEnvio}`,
                ].filter(Boolean).join(' | ')
                : (form.nota || null);

            const pedidoData: Record<string, any> = {
                codigo_pedido: codigoPedido,
                tipo_cliente_pedido: mode,
                cliente_nombre: `${form.nombre} ${form.apellido}`.trim(),
                cliente_email: form.email || null,
                cliente_telefono: form.whatsapp,
                tipo_factura: 'consumidor_final',
                direccion_envio: form.direccion || '',
                ciudad_envio: form.ciudad,
                subtotal_minorista: isWholesale ? 0 : subtotal,
                subtotal_mayorista: isWholesale ? subtotal : 0,
                total: finalTotal,
                estado: 'pendiente',
                estado_pago: 'pendiente',
                monto_pagado: 0,
                monto_pendiente: finalTotal,
            };

            // Agregar campos opcionales solo si la columna podría existir
            if (notaInterna) pedidoData.notas = notaInterna;
            if (isWholesale) pedidoData.pago_tipo = 'whatsapp';
            else pedidoData.pago_tipo = paymentType;

            const { data: pedido, error: pedidoError } = await supabase
                .from('pedidos')
                .insert(pedidoData)
                .select()
                .single();

            if (pedidoError) throw pedidoError;

            // ── 2. Insertar ítems ────────────────────────────────────────
            if (isWholesale) {
                const mayoristaItems = itemsMayorista.map(item => ({
                    pedido_id: pedido.id,
                    producto_id: item.producto.id,
                    nombre_curva: 'Surtido Personalizado',
                    talles_incluidos: Array.from(new Set(item.variaciones.map(v => v.talle))),
                    cantidad_curvas: item.cantidad_total,
                    precio_curva: item.precio_total,
                    subtotal: item.precio_total,
                }));
                const { error } = await supabase.from('pedido_items_mayorista').insert(mayoristaItems);
                if (error) throw error;

            } else {
                const minoristaItems = itemsMinorista.map(item => ({
                    pedido_id: pedido.id,
                    producto_id: item.producto.id,
                    talle_id: item.talle.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio_unitario,
                    subtotal: item.precio_unitario * item.cantidad,
                }));
                const { error } = await supabase.from('pedido_items_minorista').insert(minoristaItems);
                if (error) throw error;
            }

            // ── 3a. MAYORISTA → WhatsApp ─────────────────────────────────
            if (isWholesale) {
                const msg = buildWhatsAppMessage(codigoPedido, form, itemsMayorista, finalTotal);
                const encodedMsg = encodeURIComponent(msg);
                clearCart();
                setOrderSuccess({ id: pedido.id, codigo: codigoPedido });
                // Abre WhatsApp en nueva pestaña con el mensaje del pedido
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMsg}`, '_blank');
                return;
            }

            // ── 3b. MINORISTA → MercadoPago ──────────────────────────────
            const montoPagado = paymentType === 'total' ? finalTotal : depositAmount;

            const preference = await paymentService.createPaymentPreference(
                currentItems,
                {
                    name: form.nombre,
                    surname: form.apellido,
                    email: form.email,
                    phone: { area_code: '', number: form.whatsapp },
                    identification: { type: 'DNI', number: '' },
                    address: { street_name: form.direccion, street_number: 0, zip_code: '' },
                },
                pedido.codigo_pedido,
                montoPagado,
                paymentType === 'sena'
            );

            if (preference?.id) {
                // Guardar preference_id en el pedido
                await supabase
                    .from('pedidos')
                    .update({ mercadopago_preference_id: preference.id })
                    .eq('id', pedido.id);

                // Intentar inicializar Wallet Brick (Checkout Pro)
                const mp = getMPInstance();
                if (mp) {
                    // El brick se monta en el div 'mp-wallet-container'
                    // Guardamos el preference_id para que useEffect lo procese
                    setMpPreferenceId(preference.id);
                    clearCart();
                } else {
                    // Fallback: redirigir al init_point si el SDK no está disponible
                    window.location.href = preference.init_point;
                }
            } else if (preference?.init_point) {
                window.location.href = preference.init_point;
            } else {
                clearCart();
                setOrderSuccess({ id: pedido.id, codigo: codigoPedido });
            }

        } catch (error: any) {
            console.error('Checkout error:', error);
            alert(`Error al procesar pedido: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // ── JSX ──────────────────────────────────────────────────────────────────
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
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${isWholesale ? 'bg-green-600 text-white' : 'bg-gray-900 text-white'}`}>
                            Modo {mode}
                        </span>
                    </div>
                    <div className="w-20" />
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

                    {/* ── Formulario ─────────────────────────────────────── */}
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

                                {/* Campos exclusivos mayorista */}
                                {isWholesale && (
                                    <>
                                        <div className="sm:col-span-2">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Razón Social</label>
                                            <input required name="razonSocial" onChange={handleFormChange} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-green-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">CUIT</label>
                                            <input name="cuit" onChange={handleFormChange} placeholder="00-00000000-0" className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-green-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Tipo de Envío</label>
                                            <select name="tipoEnvio" onChange={handleFormChange} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-green-500">
                                                <option value="transporte">Transporte Propio</option>
                                                <option value="expreso">Expreso Externo</option>
                                                <option value="retiro">Retiro por Fábrica</option>
                                            </select>
                                        </div>
                                    </>
                                )}

                                {/* Campos comunes */}
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nombre</label>
                                    <input required name="nombre" onChange={handleFormChange} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Apellido</label>
                                    <input required name="apellido" onChange={handleFormChange} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Email</label>
                                    <input type="email" name="email" onChange={handleFormChange} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">WhatsApp *</label>
                                    <input required type="tel" name="whatsapp" onChange={handleFormChange} placeholder="+54 9 11 1234 5678" className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Dirección</label>
                                    <input name="direccion" onChange={handleFormChange} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ciudad / Localidad *</label>
                                    <input required name="ciudad" onChange={handleFormChange} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Provincia</label>
                                    <input name="provincia" defaultValue="Buenos Aires" onChange={handleFormChange} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Notas del pedido (Opcional)</label>
                                    <textarea name="nota" onChange={handleFormChange} rows={3} className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-4 px-4 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                </div>
                            </form>
                        </section>

                        {/* ── Panel de pago según modo ──────────────────── */}
                        {isWholesale ? (
                            /* MAYORISTA: WhatsApp */
                            <section className="bg-[#25D366] p-10 rounded-[2.5rem] shadow-xl shadow-green-100 text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <MessageCircle className="h-8 w-8" />
                                        <h3 className="text-2xl font-black tracking-tight">Cierre por WhatsApp</h3>
                                    </div>
                                    <p className="text-green-100 font-medium leading-relaxed mb-6">
                                        Tu pedido se guarda automáticamente. Al confirmar, te abriremos un chat de WhatsApp
                                        con el detalle completo para coordinar el <strong>pago y envío</strong> con nuestro equipo.
                                        Así podemos acordar la cuenta de destino que más te convenga.
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Transferencia</div>
                                        <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Depósito</div>
                                        <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Efectivo</div>
                                        <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">MercadoPago</div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                            </section>
                        ) : (
                            /* MINORISTA: MercadoPago */
                            <section className="bg-blue-600 p-10 rounded-[2.5rem] shadow-xl shadow-blue-100 text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <CreditCard className="h-8 w-8" />
                                        <h3 className="text-2xl font-black tracking-tight">Método de Pago</h3>
                                    </div>
                                    <p className="text-blue-100 font-medium leading-relaxed mb-6">
                                        Al hacer click en "Finalizar Compra", generaremos un link de pago seguro con MercadoPago.
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Mercado Pago</div>
                                        <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Tarjeta de Crédito</div>
                                        <div className="bg-white/20 px-4 py-2 rounded-xl text-xs font-black uppercase">Tarjeta de Débito</div>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                            </section>
                        )}
                    </div>

                    {/* ── Panel lateral: resumen ─────────────────────────── */}
                    <div className="lg:col-span-5">
                        <div className="sticky top-12 space-y-8">
                            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100">
                                <h3 className="text-xl font-black text-gray-900 mb-8 uppercase tracking-widest">Resumen de Compra</h3>

                                <div className="space-y-6 mb-10 max-h-[400px] overflow-y-auto pr-2">
                                    {currentItems.map((item: any, idx) => (
                                        <div key={idx} className="flex gap-4 items-start">
                                            <div className="w-16 h-20 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                                                {item.producto.imagen_principal ? (
                                                    <img src={item.producto.imagen_principal} className="w-full h-full object-cover" alt={item.producto.nombre} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                                        <ShoppingCart className="h-6 w-6" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-black text-gray-900 line-clamp-1">{item.producto.nombre}</h4>
                                                {isWholesale ? (
                                                    <div className="mt-1 space-y-0.5">
                                                        <span className="text-[10px] font-black text-green-700 bg-green-50 px-2 py-0.5 rounded uppercase">
                                                            Surtido {item.cantidad_total}u.
                                                        </span>
                                                        <div className="mt-1 space-y-0.5">
                                                            {item.variaciones.slice(0, 4).map((v: any, i: number) => (
                                                                <div key={i} className="flex items-center justify-between text-[10px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                                                                    <span className="flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: v.color?.hex }} />
                                                                        <b>{v.color?.nombre}</b>
                                                                    </span>
                                                                    <span>{v.cantidad}× <b>{v.talle}</b></span>
                                                                </div>
                                                            ))}
                                                            {item.variaciones.length > 4 && (
                                                                <span className="text-[9px] text-gray-400 pl-1">+{item.variaciones.length - 4} más…</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2 mt-1 flex-wrap">
                                                        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                                                            TALLE {item.talle?.talla_codigo}
                                                        </span>
                                                        {item.color && (
                                                            <span className="text-[10px] font-black text-gray-700 bg-gray-50 px-2 py-0.5 rounded flex items-center gap-1">
                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color?.hex }} />
                                                                {item.color?.nombre}
                                                            </span>
                                                        )}
                                                        <span className="text-[10px] text-gray-400">×{item.cantidad}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-sm font-black text-gray-900 shrink-0">
                                                ${(isWholesale ? item.precio_total : (item.precio_unitario * item.cantidad)).toLocaleString('es-AR')}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4 pt-8 border-t border-gray-100">
                                    <div className="flex justify-between text-gray-500 font-bold">
                                        <span>Subtotal</span>
                                        <span>${subtotal.toLocaleString('es-AR')}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500 font-bold">
                                        <span>Envío</span>
                                        <span className="text-green-500 uppercase text-xs tracking-widest">A convenir</span>
                                    </div>
                                    <div className="flex justify-between pt-6">
                                        <span className="text-lg font-black text-gray-900">Total</span>
                                        <div className="text-right">
                                            <div className={`text-3xl font-black ${isWholesale ? 'text-green-600' : 'text-blue-600'}`}>
                                                ${finalTotal.toLocaleString('es-AR')}
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-1">ARS - Pesos Argentinos</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Opciones de pago: solo para minorista */}
                            {!isWholesale && (
                                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
                                    <h4 className="font-black text-gray-900">Opciones de Pago</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setPaymentType('total')}
                                            className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${paymentType === 'total'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            PAGO TOTAL
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentType('sena')}
                                            className={`py-3 px-4 rounded-xl border-2 font-bold text-sm transition-all ${paymentType === 'sena'
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-gray-200 bg-white text-gray-400 hover:border-gray-300'
                                                }`}
                                        >
                                            SEÑAR
                                        </button>
                                    </div>

                                    {paymentType === 'sena' && (
                                        <div className="bg-blue-50 p-6 rounded-2xl">
                                            <label className="block text-xs font-black text-blue-600 uppercase tracking-widest mb-2">Monto a Señar</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-bold">$</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max={finalTotal - 1}
                                                    value={depositAmount || ''}
                                                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                                                    placeholder="Ingrese monto..."
                                                    className="w-full pl-8 pr-4 py-3 rounded-xl border-2 border-blue-200 focus:border-blue-600 focus:ring-0 font-black text-lg text-blue-900 bg-white"
                                                />
                                            </div>
                                            <p className="text-xs text-blue-400 mt-2 font-medium">
                                                Restaría pagar: <b className="text-blue-600">${(finalTotal - depositAmount).toLocaleString('es-AR')}</b> al retirar/recibir.
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Checkout Pro: Wallet Brick de MercadoPago ─── */}
                            {!isWholesale && mpPreferenceId && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                                        <CreditCard className="h-4 w-4 text-blue-600" />
                                        Seleccioná tu método de pago:
                                    </div>
                                    {/* El SDK de MercadoPago monta el botón de Checkout Pro aquí */}
                                    <div id="mp-wallet-container" className="min-h-[56px]"></div>
                                    {!mpBrickReady && (
                                        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-2">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Cargando métodos de pago...
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Botón de confirmación (visible hasta que el Brick esté activo) ── */}
                            {!mpPreferenceId && (
                                <button
                                    form="checkout-form"
                                    type="submit"
                                    disabled={loading}
                                    className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 shadow-2xl relative overflow-hidden ${loading
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : isWholesale
                                            ? 'bg-[#25D366] text-white hover:bg-green-600 shadow-green-100'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100'
                                        }`}
                                >
                                    {loading ? (
                                        <Loader2 className="h-6 w-6 animate-spin" />
                                    ) : isWholesale ? (
                                        <>
                                            <MessageCircle className="h-6 w-6" />
                                            ENVIAR PEDIDO POR WHATSAPP
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="h-5 w-5" />
                                            {paymentType === 'total' ? 'CONFIRMAR Y PAGAR' : 'CONFIRMAR Y PAGAR SEÑA'}
                                        </>
                                    )}
                                </button>
                            )}

                            {isWholesale && (
                                <p className="text-center text-xs text-gray-400 font-medium">
                                    Tu pedido queda registrado automáticamente. El pago se coordina por WhatsApp.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
