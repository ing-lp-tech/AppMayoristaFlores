import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { LoteProduccion, Producto } from '../../types';
import { Plus, CheckCircle, Package, Trash2, X, Settings, Scissors } from 'lucide-react';
import clsx from 'clsx';

export const Produccion = () => {
    const navigate = useNavigate();
    const [lotes, setLotes] = useState<LoteProduccion[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showRealQtyModal, setShowRealQtyModal] = useState<{ id: string, name: string } | null>(null);
    const [realQty, setRealQty] = useState<number>(0);

    // Nuevo estado para el "Stepper"
    const [selectedBatch, setSelectedBatch] = useState<LoteProduccion | null>(null);
    const [procesos, setProcesos] = useState<any[]>([]); // Store processes with steps

    // New Batch State
    const [newBatch, setNewBatch] = useState<Partial<LoteProduccion> & { selectedProcessId?: string }>({
        codigo: '',
        producto_id: '',
        modelo_corte: '',
        detalle_rollos: [{ color: '', metros: 0 }],
        estado: 'planificado',
        fecha_inicio: new Date().toISOString().split('T')[0],
        selectedProcessId: ''
    });

    const [rollos, setRollos] = useState<any[]>([]);
    const [availableRolls, setAvailableRolls] = useState<any[]>([]);
    const [rollFilters, setRollFilters] = useState({ tipo: '', metros: '' });
    const [typeOptions, setTypeOptions] = useState<string[]>([]);

    // Matrix State: { [Color]: { [TalleId]: Quantity } }
    const [cortePlan, setCortePlan] = useState<Record<string, Record<string, number>>>({});

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
            const [lotesRes, prodRes, rollosRes, procesosRes] = await Promise.all([
                supabase.from('lotes_produccion').select('*, producto:productos(nombre, codigo, producto_talles(*))').order('creado_en', { ascending: false }),
                supabase.from('productos').select('id, nombre, codigo, proceso_produccion_id, producto_talles(*)').order('nombre', { ascending: true }),
                supabase.from('rollos_tela').select('*').eq('estado', 'disponible'),
                supabase.from('procesos_templates').select('*, pasos:pasos_proceso(*)')
            ]);

            setLotes(lotesRes.data || []);
            // @ts-ignore
            setProductos(prodRes.data || []);
            setRollos(rollosRes.data || []);
            // @ts-ignore
            setProcesos(procesosRes.data || []);

            // Extract unique types
            const rules = rollosRes.data || [];
            const types = Array.from(new Set(rules.map((r: any) => r.tipo_tela)));
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
            // 1. Prepare Batch Data with Snapshot
            let snapshot = null;
            let firstState = 'planificado';

            const selectedProd = productos.find(p => p.id === newBatch.producto_id);

            if (selectedProd?.proceso_produccion_id) {
                // Fetch the dynamic process steps
                const { data: steps } = await supabase
                    .from('pasos_proceso')
                    .select('*')
                    .eq('proceso_id', selectedProd.proceso_produccion_id)
                    .order('orden', { ascending: true });

                if (steps && steps.length > 0) {
                    snapshot = { pasos: steps };
                    firstState = steps[0].nombre;
                }
            }

            // If no custom process, use default snapshot for consistency
            if (!snapshot) {
                snapshot = {
                    pasos: [
                        { nombre: 'planificado', orden: 0, requiere_input: false },
                        { nombre: 'corte', orden: 1, requiere_input: false },
                        { nombre: 'taller', orden: 2, requiere_input: false },
                        { nombre: 'terminado', orden: 3, requiere_input: true }
                    ]
                };
            }

            // 2. Create Batch
            const { data: batchData, error: batchError } = await supabase.from('lotes_produccion').insert([{
                ...newBatch,
                cantidad_total: 0,
                estado: firstState,
                proceso_snapshot: snapshot,
                paso_actual_index: 0
            }]).select().single();

            if (batchError) throw batchError;

            // 3. Consume Rolls from Inventory (Update Stock)
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
            fetchData();
            setIsModalOpen(false);
            setNewBatch({
                codigo: '',
                producto_id: '',
                modelo_corte: '',
                detalle_rollos: [{ color: '', metros: 0 }],
                estado: 'planificado',
                fecha_inicio: new Date().toISOString().split('T')[0],
                selectedProcessId: ''
            });
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

    const updateStatus = async (id: string, targetStatus: string) => {
        const lote = lotes.find(l => l.id === id);
        if (!lote) return;

        // Get Steps
        const steps = lote.proceso_snapshot?.pasos || [
            { nombre: 'planificado' }, { nombre: 'corte' }, { nombre: 'taller' }, { nombre: 'terminado', requiere_input: true }
        ];

        const targetIndex = steps.findIndex((s: any) => s.nombre === targetStatus);
        const targetStep = steps[targetIndex];
        // const isLastStep = targetIndex === steps.length - 1; // Unused
        const requiresInput = targetStep?.requiere_input || (targetStatus === 'terminado'); // Fallback for old

        // 1. Check if we need Real Quantity
        if (requiresInput) {
            setShowRealQtyModal({ id, name: lote.producto?.nombre || 'Producto' });
            setSelectedBatch(null);
            return;
        }

        // 2. Calculate Progress
        // Standard logic: 0% at start, 100% at end. 
        // Steps: 4. Index 0 = 0%, Index 1 = 33%, Index 2 = 66%, Index 3 = 100%.
        // Formula: (targetIndex / (totalSteps - 1)) * 100
        const totalSteps = steps.length;
        const percentage = totalSteps > 1 ? Math.round((targetIndex / (totalSteps - 1)) * 100) : 0;

        try {
            const { error } = await supabase.from('lotes_produccion').update({
                estado: targetStatus,
                paso_actual_index: targetIndex,
                progreso_porcentaje: percentage
            }).eq('id', id);

            if (error) throw error;

            if (selectedBatch && selectedBatch.id === id) {
                setSelectedBatch({
                    ...selectedBatch,
                    estado: targetStatus,
                    paso_actual_index: targetIndex,
                    progreso_porcentaje: percentage
                });
            }

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
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/admin/procesos')}
                        className="bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all active:scale-95 font-medium"
                    >
                        <Settings className="h-5 w-5" /> Gestionar Procesos
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all active:scale-95 font-medium"
                    >
                        <Plus className="h-5 w-5" /> Iniciar Lote
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lotes.map((lote: any) => (
                    <div
                        key={lote.id}
                        onClick={() => {
                            setSelectedBatch(lote);
                            setCortePlan(lote.tallas_distribucion || {});
                        }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                    >
                        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                            <span className="font-mono font-bold text-indigo-600 bg-white px-2 py-1 rounded-md border text-sm shadow-sm">{lote.codigo}</span>
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
                                    className={clsx(
                                        "h-2 rounded-full transition-all duration-700",
                                        lote.estado === 'terminado' ? "bg-emerald-500" : "bg-indigo-600"
                                    )}
                                    // Si es terminado 100%, sino usamos el calculado o un default visual
                                    style={{ width: lote.estado === 'terminado' ? '100%' : `${lote.progreso_porcentaje || 10}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-400 italic">
                                <span>Click para gestionar etapas</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal: Stepper Management */}
            {selectedBatch && (
                <div
                    className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedBatch(null); }}
                >
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Control de Etapas</h2>
                                <p className="text-sm text-gray-500 font-bold">{selectedBatch.producto?.nombre} - <span className="text-indigo-600">{selectedBatch.codigo}</span></p>
                            </div>
                            <button onClick={() => setSelectedBatch(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                                <X className="h-6 w-6" /> {/* Make sure X is imported if not already */}
                            </button>
                        </div>

                        <div className="p-10">
                            {/* Stepper UI */}
                            <div className="relative flex justify-between items-center mb-12">
                                {/* Connecting Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-0 rounded-full"></div>

                                {/* Steps */}
                                {/* Steps */}
                                {(() => {
                                    // Determine steps from snapshot or legacy fallback
                                    const steps = selectedBatch.proceso_snapshot?.pasos || [
                                        { nombre: 'planificado', orden: 0 },
                                        { nombre: 'corte', orden: 1 },
                                        { nombre: 'taller', orden: 2 },
                                        { nombre: 'terminado', orden: 3, requiere_input: true }
                                    ];

                                    // Find current index
                                    // We can use paso_actual_index if available, or find by name
                                    let currentIdx = selectedBatch.paso_actual_index ?? -1;
                                    if (currentIdx === -1) {
                                        currentIdx = steps.findIndex((s: any) => s.nombre.toLowerCase() === (selectedBatch.estado || '').toLowerCase());
                                    }
                                    if (currentIdx === -1 && selectedBatch.estado) currentIdx = 0; // Fallback

                                    return steps.map((step: any, idx: number) => {
                                        const isCompleted = idx <= currentIdx;
                                        const isCurrent = idx === currentIdx;
                                        // const isLast = idx === steps.length - 1; // Unused

                                        return (
                                            <button
                                                key={idx}
                                                // Only allow clicking if not already finished (or allow reverting?)
                                                // Let's allow clicking any previous or next step for flexibility
                                                onClick={() => updateStatus(selectedBatch.id, step.nombre)}
                                                className="relative z-10 flex flex-col items-center gap-3 group"
                                            >
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center border-4 transition-all duration-300 shadow-sm",
                                                    isCurrent ? "bg-indigo-600 border-indigo-100 text-white scale-110 shadow-indigo-200" :
                                                        isCompleted ? "bg-indigo-100 border-indigo-50 text-indigo-600" :
                                                            "bg-white border-gray-100 text-gray-300 group-hover:border-gray-200"
                                                )}>
                                                    {/* Dynamic Icons based on name or index? */}
                                                    {/* Simple logic for standard names, generic for others */}
                                                    {step.nombre.toLowerCase().includes('planif') && <Package className="h-5 w-5" />}
                                                    {step.nombre.toLowerCase().includes('corte') && <Scissors className="h-5 w-5" />}
                                                    {step.nombre.toLowerCase().includes('taller') && <div className="font-black text-xs">MAQ</div>}
                                                    {step.nombre.toLowerCase().includes('terminado') && <CheckCircle className="h-5 w-5" />}
                                                    {/* Generic Icon for custom steps */}
                                                    {!['planificado', 'corte', 'taller', 'terminado'].some(k => step.nombre.toLowerCase().includes(k)) && (
                                                        <div className="font-black text-xs">{idx + 1}</div>
                                                    )}
                                                </div>
                                                <span className={clsx(
                                                    "text-xs font-black uppercase tracking-wider transition-colors max-w-[80px] text-center truncate",
                                                    isCurrent ? "text-indigo-600" :
                                                        isCompleted ? "text-indigo-400" : "text-gray-300"
                                                )} title={step.nombre}>
                                                    {step.nombre}
                                                </span>
                                            </button>
                                        );
                                    });
                                })()}
                            </div>


                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center">
                                <p className="text-blue-800 text-sm font-medium">
                                    💡 Haz click en cualquier etapa para mover el lote a ese estado.
                                    <br /><span className="text-xs opacity-70">Si seleccionas "Terminado", se te pedirá la cantidad final producida.</span>
                                </p>
                            </div>

                            {/* PLANILLA DE CORTE (EDIT MODE) */}
                            {(() => {
                                // If the batch has detailing of rolls, show the matrix
                                // Wait, we need product sizes. The batch has selectedBatch.producto which includes producto_talles
                                // But only if we typed it correctly and fetched it.
                                // In fetchData we select '*, producto:productos(*, producto_talles(*))'
                                // So selectedBatch.producto should have producto_talles.
                                const prod = selectedBatch.producto as any; // Cast to access full details if TS complains
                                if (!prod || !prod.producto_talles) return null;

                                const colors = Array.from(new Set(selectedBatch.detalle_rollos?.map(r => r.color || 'Sin Color') || [])).filter(Boolean);
                                const sizes = prod.producto_talles.sort((a: any, b: any) => a.orden - b.orden);

                                if (colors.length === 0) return null;

                                // Helper
                                const handleMatrixChange = (color: string, talleId: string, qty: number) => {
                                    const nextPlan = { ...cortePlan };
                                    if (!nextPlan[color]) nextPlan[color] = {};
                                    nextPlan[color][talleId] = qty;
                                    setCortePlan(nextPlan);
                                };
                                const cellValue = (color: string, talleId: string) => cortePlan[color]?.[talleId] || 0;

                                const totalMatrix = Object.values(cortePlan).reduce((acc, row) =>
                                    acc + Object.values(row).reduce((s, q) => s + q, 0), 0
                                );

                                const saveMatrix = async () => {
                                    try {
                                        const { error } = await supabase
                                            .from('lotes_produccion')
                                            .update({
                                                tallas_distribucion: cortePlan,
                                                cantidad_total: totalMatrix
                                            })
                                            .eq('id', selectedBatch.id);

                                        if (error) throw error;
                                        alert('Planilla de corte actualizada');
                                        fetchData(); // Refresh to update card numbers
                                    } catch (err: any) {
                                        alert('Error guardando planilla: ' + err.message);
                                    }
                                };

                                return (
                                    <div className="mt-8 pt-6 border-t border-gray-100">
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <Scissors className="h-5 w-5 text-indigo-600" />
                                                <h3 className="font-bold text-gray-800 uppercase text-sm tracking-wider">Planilla de Corte</h3>
                                            </div>
                                            <button
                                                onClick={saveMatrix}
                                                className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                                            >
                                                Guardar Planilla
                                            </button>
                                        </div>

                                        <div className="overflow-x-auto rounded-xl border border-gray-200">
                                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-black text-gray-500 uppercase text-xs">Color \ Talle</th>
                                                        {sizes.map((t: any) => (
                                                            <th key={t.id} className="px-2 py-3 text-center font-bold text-gray-700 min-w-[50px]">
                                                                {t.talla_codigo}
                                                            </th>
                                                        ))}
                                                        <th className="px-4 py-3 text-right font-black text-gray-500 uppercase text-xs">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 bg-white">
                                                    {colors.map((color: any) => {
                                                        const rowTotal = sizes.reduce((sum: number, t: any) => sum + cellValue(color, t.id), 0);
                                                        return (
                                                            <tr key={color} className="hover:bg-gray-50/50">
                                                                <td className="px-4 py-2 font-bold text-gray-900 break-words max-w-[120px]">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: color !== 'Sin Color' && color !== 'Sin color' ? color.toLowerCase() : '#eee' }}></div>
                                                                        {color}
                                                                    </div>
                                                                </td>
                                                                {sizes.map((t: any) => (
                                                                    <td key={t.id} className="p-1">
                                                                        <input
                                                                            type="number"
                                                                            min="0"
                                                                            className="w-full text-center border-gray-200 bg-gray-50 rounded-lg py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none font-bold text-gray-700"
                                                                            value={cellValue(color, t.id) || ''}
                                                                            onChange={e => handleMatrixChange(color, t.id, Number(e.target.value))}
                                                                            placeholder="-"
                                                                        />
                                                                    </td>
                                                                ))}
                                                                <td className="px-4 py-2 text-right font-black text-indigo-600">
                                                                    {rowTotal}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot className="bg-gray-50 font-bold">
                                                    <tr>
                                                        <td className="px-4 py-3 text-gray-500 text-xs uppercase">Total</td>
                                                        {sizes.map((t: any) => {
                                                            const colTotal = colors.reduce((sum: number, c: any) => sum + cellValue(c, t.id), 0);
                                                            return <td key={t.id} className="text-center py-3">{colTotal || '-'}</td>;
                                                        })}
                                                        <td className="px-4 py-3 text-right text-indigo-700 text-lg">
                                                            {totalMatrix}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

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
                                    onChange={e => {
                                        const pid = e.target.value;
                                        const prod = productos.find(p => p.id === pid);
                                        setNewBatch({
                                            ...newBatch,
                                            producto_id: pid,
                                            // Auto-fill cut model with SKU if product found, otherwise keep existing or clear
                                            modelo_corte: prod ? prod.codigo : newBatch.modelo_corte
                                        });
                                    }}
                                >
                                    <option value="">Seleccionar producto...</option>
                                    {productos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Selector de Proceso */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Proceso / Receta</label>
                                <select
                                    className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                                    // @ts-ignore
                                    value={newBatch.selectedProcessId || ''}
                                    onChange={e => setNewBatch({ ...newBatch, selectedProcessId: e.target.value })}
                                >
                                    <option value="">Proceso Estándar (Por Defecto)</option>
                                    {procesos.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.nombre} ({p.pasos?.length || 0} pasos)</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">
                                    * Se seleccionó automáticamente el proceso del producto, pero puedes cambiarlo aquí.
                                </p>
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
