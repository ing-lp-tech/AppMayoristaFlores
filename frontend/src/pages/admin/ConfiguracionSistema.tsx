import React, { useState, useEffect } from 'react';
import { Settings, Save, Smartphone, Hash, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ConfiguracionSistema() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [form, setForm] = useState({
        whatsapp_pedidos: '',
        minimo_curvas_mayorista: 1,
        descuento_mayorista_porcentaje: 15,
        requiere_cuit_mayorista: true
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            setLoading(true);
            setError(null);

            // Intentar obtener la configuración existente
            const { data, error: fetchError } = await supabase
                .from('configuracion_sistema')
                .select('*')
                .limit(1);

            if (fetchError) {
                throw fetchError;
            }

            if (data && data.length > 0) {
                const configRow = data[0];
                setConfigId(configRow.id);
                setForm({
                    whatsapp_pedidos: configRow.whatsapp_pedidos || '',
                    minimo_curvas_mayorista: configRow.minimo_curvas_mayorista || 1,
                    descuento_mayorista_porcentaje: configRow.descuento_mayorista_porcentaje || 15,
                    requiere_cuit_mayorista: configRow.requiere_cuit_mayorista ?? true
                });
            }
        } catch (err: any) {
            console.error('Error fetching config:', err);
            setError('No se pudo cargar la configuración actual.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccessMsg(null);

        try {
            // Validar formato básico de WhatsApp (solo números)
            const cleanWhatsapp = form.whatsapp_pedidos.replace(/[^0-9]/g, '');
            if (!cleanWhatsapp) {
                throw new Error("El número de WhatsApp no es válido.");
            }

            const payload = {
                whatsapp_pedidos: cleanWhatsapp,
                minimo_curvas_mayorista: form.minimo_curvas_mayorista,
                descuento_mayorista_porcentaje: form.descuento_mayorista_porcentaje,
                requiere_cuit_mayorista: form.requiere_cuit_mayorista,
                actualizado_en: new Date().toISOString()
            };

            if (configId) {
                // Update
                const { error: updateError } = await supabase
                    .from('configuracion_sistema')
                    .update(payload)
                    .eq('id', configId);

                if (updateError) throw updateError;
            } else {
                // Insert
                const { data, error: insertError } = await supabase
                    .from('configuracion_sistema')
                    .insert([payload])
                    .select()
                    .single();

                if (insertError) throw insertError;
                if (data) setConfigId(data.id);
            }

            setSuccessMsg('Configuración guardada correctamente.');

            // Clear success message after 3 seconds
            setTimeout(() => setSuccessMsg(null), 3000);

        } catch (err: any) {
            console.error('Error saving config:', err);
            setError(err.message || 'Error al guardar la configuración.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando configuración...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Settings className="h-6 w-6 text-blue-600" />
                        Configuración del Sistema
                    </h1>
                    <p className="text-gray-500 mt-1">Ajustes generales, métodos de contacto y reglas de negocio</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-bold">{error}</span>
                </div>
            )}

            {successMsg && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl border border-green-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-bold">{successMsg}</span>
                </div>
            )}

            <form onSubmit={handleSave} className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 space-y-8">

                    {/* Sección Contacto y Ventas */}
                    <section>
                        <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 border-b pb-4">
                            <Smartphone className="h-5 w-5 text-gray-400" />
                            Contacto y Ventas
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 font-black uppercase tracking-wider text-xs">
                                    WhatsApp para Pedidos Mayoristas
                                </label>
                                <p className="text-gray-400 text-xs mb-3">
                                    Número que recibe los mensajes y redirige a los clientes cuando cierran un pedido mayorista. Debe incluir código de país sin el símbolo +. Ej: 5491122334455
                                </p>
                                <div className="relative">
                                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={form.whatsapp_pedidos}
                                        onChange={e => setForm({ ...form, whatsapp_pedidos: e.target.value })}
                                        placeholder="5491126879409"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Sección Reglas Mayoristas */}
                    <section>
                        <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 border-b pb-4 mt-8">
                            <Settings className="h-5 w-5 text-gray-400" />
                            Reglas Mercado Mayorista
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 text-xs uppercase tracking-wider">
                                    Mínimo Curvas Mayorista
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={form.minimo_curvas_mayorista}
                                    onChange={e => setForm({ ...form, minimo_curvas_mayorista: parseInt(e.target.value) })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2 text-xs uppercase tracking-wider">
                                    Descuento Mayorista Default (%)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    required
                                    value={form.descuento_mayorista_porcentaje}
                                    onChange={e => setForm({ ...form, descuento_mayorista_porcentaje: parseFloat(e.target.value) })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-4">
                                <input
                                    type="checkbox"
                                    id="req_cuit"
                                    checked={form.requiere_cuit_mayorista}
                                    onChange={e => setForm({ ...form, requiere_cuit_mayorista: e.target.checked })}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                />
                                <label htmlFor="req_cuit" className="font-bold text-gray-700">
                                    Requerir CUIT en Checkout Mayorista
                                </label>
                            </div>
                        </div>
                    </section>

                </div>

                <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-black hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                        <Save className="h-5 w-5" />
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
}
