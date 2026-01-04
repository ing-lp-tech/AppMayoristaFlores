import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { LoteProduccion, Producto } from '../../types';
import { Plus, ChevronsRight, CheckCircle, Scissors, Package, Trash2 } from 'lucide-react';
import clsx from 'clsx';

export const Produccion = () => {
    const [lotes, setLotes] = useState<LoteProduccion[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showRealQtyModal, setShowRealQtyModal] = useState<{ id: string, name: string } | null>(null);
    const [realQty, setRealQty] = useState<number>(0);

    // New Batch State
    const [newBatch, setNewBatch] = useState<Partial<LoteProduccion>>({
        codigo: '',
        producto_id: '',
        modelo_corte: '',
        detalle_rollos: [{ color: '', metros: 0 }],
        estado: 'planificado',
        fecha_inicio: new Date().toISOString().split('T')[0]
    });

    const [rollos, setRollos] = useState<any[]>([]);
    const [availableRolls, setAvailableRolls] = useState<any[]>([]);
    const [rollFilters, setRollFilters] = useState({ tipo: '', metros: '' });
    const [typeOptions, setTypeOptions] = useState<string[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    // Filter rolls when data or filters change
    useEffect(() => {
        let filtered = rollos;
        if (rollFilters.tipo) {
            filtered = filtered.filter(r => r.tipo_tela === rollFilters.tipo);
        }
        if (rollFilters.metros) {
            const minMeters = parseFloat(rollFilters.metros);
            if (!isNaN(minMeters)) {
                // Approximate match +/- 10% or explicit >= if needed.
                // User said "distingo por cantidad de metros", often meaning exact value.
                // Let's allow finding rolls that have AT LEAST this amount, or maybe close to it?
                // Plan said "search for meters". Let's do exact match or within 5 meters range for ease
                filtered = filtered.filter(r => Math.abs(r.metros_restantes - minMeters) < 5 || r.metros_restantes >= minMeters);
            }
        }
        setAvailableRolls(filtered);
    }, [rollos, rollFilters]);

    const fetchData = async () => {
        try {
            const [lotesRes, prodRes, rollosRes] = await Promise.all([
                supabase.from('lotes_produccion').select('*, producto:productos(nombre, codigo)').order('creado_en', { ascending: false }),
                supabase.from('productos').select('id, nombre, codigo').order('nombre', { ascending: true }),
                supabase.from('rollos_tela').select('*').eq('estado', 'disponible')
            ]);

            setLotes(lotesRes.data || []);
            // @ts-ignore
            setProductos(prodRes.data || []);
            const rolls = rollosRes.data || [];
            setRollos(rolls);

            // Extract unique types
            const types = Array.from(new Set(rolls.map((r: any) => r.tipo_tela)));
            setTypeOptions(types);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRollo = () => {
        setNewBatch({
            ...newBatch,
            detalle_rollos: [...(newBatch.detalle_rollos || []), { color: '', metros: 0 }]
        });
    };

    const handleRemoveRollo = (index: number) => {
        const list = [...(newBatch.detalle_rollos || [])];
        list.splice(index, 1);
        setNewBatch({ ...newBatch, detalle_rollos: list });
    };

    const handleRolloSelect = (index: number, rolloId: string) => {
        const selectedRoll = rollos.find(r => r.id === rolloId);
        if (!selectedRoll) return;

        const list = [...(newBatch.detalle_rollos || [])];
        // Set properties: rollo_id, color from roll, and use FULL available stock
        list[index] = {
            rollo_id: selectedRoll.id,
            color: selectedRoll.color || 'Sin color',
            metros: selectedRoll.metros_restantes,
            // Hidden fields helper
            metros_usados: selectedRoll.metros_restantes
        } as any;
        setNewBatch({ ...newBatch, detalle_rollos: list });
    };

    const updateRollo = (index: number, field: 'color' | 'metros', value: string | number) => {
        const list = [...(newBatch.detalle_rollos || [])];
        list[index] = { ...list[index], [field]: field === 'metros' ? Number(value) : value };
        setNewBatch({ ...newBatch, detalle_rollos: list });
    };

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // 1. Create Batch
            const { data: batchData, error: batchError } = await supabase.from('lotes_produccion').insert([{
                ...newBatch,
                cantidad_total: 0
            }]).select().single();

            if (batchError) throw batchError;

            // 2. Consume Rolls from Inventory (Update Stock)
            const rollsToConsume = newBatch.detalle_rollos
                ?.filter(r => r.rollo_id && r.metros > 0)
                .map(r => ({
                    rollo_id: r.rollo_id,
                    metros_usados: r.metros
                }));

            if (rollsToConsume && rollsToConsume.length > 0) {
                const { error: rpcError } = await supabase.rpc('consume_rolls_for_batch', {
                    p_batch_id: batchData.id,
                    p_rolls: rollsToConsume
                });

                if (rpcError) {
                    console.error('Error consuming rolls:', rpcError);
                    alert('Lote creado, pero hubo un error actualizando el stock de telas.');
                }
            }

            fetchData();
            setIsModalOpen(false);
            setNewBatch({ codigo: '', producto_id: '', modelo_corte: '', detalle_rollos: [{ color: '', metros: 0 }], estado: 'planificado', fecha_inicio: new Date().toISOString().split('T')[0] });
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const handleFinalizeProduction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showRealQtyModal) return;

        try {
            const { error } = await supabase.from('lotes_produccion').update({
                cantidad_real: realQty,
                estado: 'terminado',
                progreso_porcentaje: 100,
                fecha_fin: new Date().toISOString()
            }).eq('id', showRealQtyModal.id);

            if (error) throw error;

            // Optional: Increment stock
            const lote = lotes.find(l => l.id === showRealQtyModal.id);
            if (lote) {
                await supabase.rpc('increment_stock', { p_id: lote.producto_id, quantity: realQty });
            }

            setShowRealQtyModal(null);
            setRealQty(0);
            fetchData();
        } catch (error: any) {
            alert('Error al finalizar: ' + error.message);
        }
    };

    const updateStatus = async (id: string, currentStatus: string) => {
        const flow = ['planificado', 'corte', 'taller', 'terminado'];
        const currentIndex = flow.indexOf(currentStatus);

        if (currentStatus === 'taller') {
            const lote = lotes.find(l => l.id === id);
            setShowRealQtyModal({ id, name: lote?.producto?.nombre || 'Producto' });
            return;
        }

        const nextStatus = flow[currentIndex + 1];
        try {
            const { error } = await supabase.from('lotes_produccion').update({
                estado: nextStatus,
                progreso_porcentaje: (currentIndex + 1) * 25
            }).eq('id', id);

            if (error) throw error;
            fetchData();
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando producción...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Producción</h1>
                    <p className="text-gray-500">Gestión de lotes y tendido de tela</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all active:scale-95"
                >
                    <Plus className="h-5 w-5" /> Iniciar Lote
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lotes.map((lote: any) => (
                    <div key={lote.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                            <span className="font-mono font-bold text-indigo-600 bg-white px-2 py-1 rounded-md border text-sm">{lote.codigo}</span>
                            <span className={clsx(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                                lote.estado === 'planificado' && "bg-gray-100 text-gray-600 border border-gray-200",
                                lote.estado === 'corte' && "bg-amber-100 text-amber-700 border border-amber-200",
                                lote.estado === 'taller' && "bg-blue-100 text-blue-700 border border-blue-200",
                                lote.estado === 'terminado' && "bg-emerald-100 text-emerald-700 border border-emerald-200",
                            )}>
                                {lote.estado}
                            </span>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg leading-tight">{lote.producto?.nombre || 'Producto Desconocido'}</h3>
                                <div className="mt-2 space-y-1">
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Scissors className="h-3 w-3" /> Modelo: <span className="font-medium">{lote.modelo_corte || 'N/A'}</span>
                                    </p>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {lote.estado === 'terminado'
                                            ? `Final: ${lote.cantidad_real} prendas`
                                            : `Metros Tela: ${(lote.detalle_rollos || []).reduce((a: number, c: any) => a + c.metros, 0)}m`
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                    className="bg-indigo-600 h-2 rounded-full transition-all duration-700"
                                    style={{ width: `${lote.progreso_porcentaje || 0}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-500 italic">
                                <span>Iniciado: {lote.fecha_inicio}</span>
                            </div>

                            {/* Actions */}
                            {lote.estado !== 'terminado' && (
                                <button
                                    onClick={() => updateStatus(lote.id, lote.estado)}
                                    className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-semibold text-sm shadow-sm active:scale-95"
                                >
                                    {lote.estado === 'taller' ? 'Completar Cantidad & Finalizar' : 'Avanzar Etapa'}
                                    <ChevronsRight className="h-4 w-4" />
                                </button>
                            )}
                            {lote.estado === 'terminado' && (
                                <div className="w-full mt-2 flex justify-center items-center gap-2 py-2.5 text-emerald-700 font-bold bg-emerald-50 rounded-xl border border-emerald-100 text-sm">
                                    <CheckCircle className="h-4 w-4" /> Finalizado con éxito
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal: Iniciar Lote */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 transform transition-all">
                        <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                            <Plus className="text-indigo-600" /> Iniciar Nuevo Lote
                        </h2>
                        <form onSubmit={handleCreateBatch} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Código Lote</label>
                                    <input
                                        required
                                        className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={newBatch.codigo}
                                        onChange={e => setNewBatch({ ...newBatch, codigo: e.target.value })}
                                        placeholder="I-000XXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Modelo de Corte</label>
                                    <input
                                        required
                                        className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={newBatch.modelo_corte}
                                        onChange={e => setNewBatch({ ...newBatch, modelo_corte: e.target.value })}
                                        placeholder="Ej: Slim Fit 2024"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Producto a Confeccionar</label>
                                <select
                                    required
                                    className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                    value={newBatch.producto_id}
                                    onChange={e => setNewBatch({ ...newBatch, producto_id: e.target.value })}
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {productos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Carga de Rollos (Tendido)</label>
                                    <button type="button" onClick={handleAddRollo} className="text-indigo-600 font-bold text-xs flex items-center gap-1 hover:underline">
                                        <Plus className="h-3 w-3" /> Agregar Rollo
                                    </button>
                                </div>

                                {/* Filtros de Rollos */}
                                <div className="bg-indigo-50 p-3 rounded-xl grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-indigo-800 block mb-1">Filtrar por Tela</label>
                                        <select
                                            className="w-full text-xs p-2 rounded-lg border-indigo-200 focus:ring-indigo-500"
                                            value={rollFilters.tipo}
                                            onChange={e => setRollFilters({ ...rollFilters, tipo: e.target.value })}
                                        >
                                            <option value="">Todas</option>
                                            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-indigo-800 block mb-1">Buscar Metros (Aprox)</label>
                                        <input
                                            type="number"
                                            className="w-full text-xs p-2 rounded-lg border-indigo-200 focus:ring-indigo-500"
                                            placeholder="Ej: 50"
                                            value={rollFilters.metros}
                                            onChange={e => setRollFilters({ ...rollFilters, metros: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
                                    {newBatch.detalle_rollos?.map((r, i) => {
                                        // Filter out rolls selected in other rows
                                        const otherSelectedIds = newBatch.detalle_rollos
                                            ?.map((val, idx) => idx !== i ? val.rollo_id : null)
                                            .filter(Boolean) as string[];

                                        const rowOptions = availableRolls.filter(ar =>
                                            ar.id === r.rollo_id || !otherSelectedIds.includes(ar.id)
                                        );

                                        return (
                                            <div key={i} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <div className="flex gap-2 items-center">
                                                    <div className="flex-1">
                                                        <select
                                                            className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            value={r.rollo_id || ''}
                                                            onChange={e => handleRolloSelect(i, e.target.value)}
                                                        >
                                                            <option value="">-- Seleccionar Rollo --</option>
                                                            {rowOptions.map((ar: any) => (
                                                                <option key={ar.id} value={ar.id}>
                                                                    {`[${ar.codigo}] ${ar.tipo_tela} - ${ar.color || 'S/C'} (${ar.metros_restantes}m)`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {i > 0 && (
                                                        <button type="button" onClick={() => handleRemoveRollo(i)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 items-center">
                                                    <div className="flex-1">
                                                        <input
                                                            placeholder="Color (Auto)"
                                                            readOnly
                                                            className="w-full bg-gray-100 border-transparent p-2 rounded-lg text-xs text-gray-500"
                                                            value={r.color}
                                                        />
                                                    </div>
                                                    <div className="w-24">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                placeholder="Mts"
                                                                className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm font-bold text-right"
                                                                value={r.metros || ''}
                                                                onChange={e => updateRollo(i, 'metros', e.target.value)}
                                                            />
                                                            <span className="absolute right-7 top-2 text-xs text-gray-400">m</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <p className="text-xs text-gray-400 italic text-center">
                                * Al seleccionar un rollo, se consumirán los metros indicados del inventario.
                            </p>

                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all">Crear Lote</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Finalizar Lote (Cantidad Real) */}
            {showRealQtyModal && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8">
                        <h2 className="text-xl font-black mb-2">Finalizar Producción</h2>
                        <p className="text-gray-500 text-sm mb-6">¿Cuantas prendas de <span className="text-indigo-600 font-bold">{showRealQtyModal.name}</span> se cortaron finalmente?</p>

                        <form onSubmit={handleFinalizeProduction} className="space-y-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Cantidad Real Producida</label>
                                <input
                                    type="number"
                                    autoFocus
                                    required
                                    className="w-full border-gray-200 border-2 p-4 rounded-xl text-2xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    value={realQty || ''}
                                    onChange={e => setRealQty(Number(e.target.value))}
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button type="button" onClick={() => setShowRealQtyModal(null)} className="px-5 py-2 text-gray-500 font-bold">Cancelar</button>
                                <button type="submit" className="px-8 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all">Terminar Lote</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
