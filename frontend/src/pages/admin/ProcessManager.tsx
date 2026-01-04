import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Save, Move, Layers } from 'lucide-react';

interface Paso {
    id?: string;
    nombre: string;
    orden: number;
    requiere_input: boolean;
}

interface Proceso {
    id: string;
    nombre: string;
    descripcion: string;
    pasos?: Paso[];
}

export const ProcessManager = () => {
    const [procesos, setProcesos] = useState<Proceso[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProceso, setSelectedProceso] = useState<Proceso | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [pasos, setPasos] = useState<Paso[]>([]);

    useEffect(() => {
        fetchProcesos();
    }, []);

    const fetchProcesos = async () => {
        try {
            const { data, error } = await supabase
                .from('procesos_templates')
                .select('*, pasos:pasos_proceso(*)');

            if (error) throw error;
            // Ordenar pasos
            const sorted = data?.map(p => ({
                ...p,
                pasos: p.pasos?.sort((a: Paso, b: Paso) => a.orden - b.orden)
            })) || [];

            setProcesos(sorted);
        } catch (error) {
            console.error('Error fetching processes:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNew = () => {
        setSelectedProceso(null);
        setNombre('');
        setDescripcion('');
        setPasos([
            { nombre: 'Planificado', orden: 0, requiere_input: false },
            { nombre: 'Corte', orden: 1, requiere_input: false },
            { nombre: 'Taller', orden: 2, requiere_input: false },
            { nombre: 'Terminado', orden: 3, requiere_input: true }
        ]);
        setIsEditing(true);
    };

    const handleEdit = (proceso: Proceso) => {
        setSelectedProceso(proceso);
        setNombre(proceso.nombre);
        setDescripcion(proceso.descripcion);
        setPasos(proceso.pasos || []);
        setIsEditing(true);
    };

    const addPaso = () => {
        setPasos([...pasos, { nombre: 'Nueva Etapa', orden: pasos.length, requiere_input: false }]);
    };

    const removePaso = (idx: number) => {
        const newPasos = pasos.filter((_, i) => i !== idx);
        // Reordenar
        const reordered = newPasos.map((p, i) => ({ ...p, orden: i }));
        setPasos(reordered);
    };

    const updatePaso = (idx: number, field: keyof Paso, value: any) => {
        const newPasos = [...pasos];
        newPasos[idx] = { ...newPasos[idx], [field]: value };
        setPasos(newPasos);
    };

    const handleSave = async () => {
        try {
            if (selectedProceso) {
                // Update
                const { error: updateError } = await supabase
                    .from('procesos_templates')
                    .update({ nombre, descripcion })
                    .eq('id', selectedProceso.id);
                if (updateError) throw updateError;

                // Delete old steps and insert new ones (Simplest approach for now)
                await supabase.from('pasos_proceso').delete().eq('proceso_id', selectedProceso.id);

                const pasosToInsert = pasos.map((p, i) => ({
                    proceso_id: selectedProceso.id,
                    nombre: p.nombre,
                    orden: i,
                    requiere_input: p.requiere_input
                }));

                const { error: stepsError } = await supabase.from('pasos_proceso').insert(pasosToInsert);
                if (stepsError) throw stepsError;

            } else {
                // Create
                const { data: newProc, error: createError } = await supabase
                    .from('procesos_templates')
                    .insert([{ nombre, descripcion }])
                    .select()
                    .single();

                if (createError) throw createError;

                const pasosToInsert = pasos.map((p, i) => ({
                    proceso_id: newProc.id,
                    nombre: p.nombre,
                    orden: i,
                    requiere_input: p.requiere_input
                }));

                const { error: stepsError } = await supabase.from('pasos_proceso').insert(pasosToInsert);
                if (stepsError) throw stepsError;
            }

            setIsEditing(false);
            fetchProcesos();
            alert('Proceso guardado correctamente');
        } catch (error: any) {
            console.error(error);
            alert('Error al guardar: ' + error.message);
        }
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Procesos</h1>
                    <p className="text-gray-500 font-medium">Define las 'Recetas' de producción para tus productos</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={handleNew}
                        className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all"
                    >
                        <Plus className="h-5 w-5" /> Nuevo Proceso
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 p-8 animate-in slide-in-from-bottom-5">
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nombre del Proceso</label>
                            <input
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-bold text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={nombre}
                                onChange={e => setNombre(e.target.value)}
                                placeholder="Ej: Jean Completo 2024"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Descripción</label>
                            <input
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={descripcion}
                                onChange={e => setDescripcion(e.target.value)}
                                placeholder="Detalles opcionales..."
                            />
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between items-end">
                            <label className="block text-xs font-black text-indigo-500 uppercase tracking-widest">Etapas del Proceso (En orden)</label>
                            <button onClick={addPaso} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                <Plus className="h-4 w-4" /> Agregar Etapa
                            </button>
                        </div>

                        <div className="space-y-3">
                            {pasos.map((paso, idx) => (
                                <div key={idx} className="flex items-center gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100 group hover:border-indigo-100 hover:bg-white transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-500 font-bold flex items-center justify-center text-sm">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <input
                                            className="w-full bg-transparent border-0 border-b border-transparent focus:border-indigo-300 focus:ring-0 font-bold text-gray-800 placeholder-gray-300"
                                            value={paso.nombre}
                                            onChange={e => updatePaso(idx, 'nombre', e.target.value)}
                                            placeholder="Nombre de la etapa"
                                        />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={paso.requiere_input}
                                            onChange={e => updatePaso(idx, 'requiere_input', e.target.checked)}
                                            className="rounded text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-xs font-bold text-gray-500">Pide Cantidad?</span>
                                    </div>
                                    <button onClick={() => removePaso(idx)} className="p-2 text-gray-300 hover:text-red-500">
                                        <Trash2 className="h-5 w-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-8 py-3 rounded-xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Save className="h-5 w-5" /> Guardar Proceso
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {procesos.map(proc => (
                        <div key={proc.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    <Layers className="h-6 w-6" />
                                </div>
                                <button
                                    onClick={() => handleEdit(proc)}
                                    className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-100"
                                >
                                    Editar
                                </button>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900 mb-1">{proc.nombre}</h3>
                            <p className="text-sm text-gray-400 mb-6 line-clamp-2">{proc.descripcion || 'Sin descripción'}</p>

                            <div className="bg-gray-50 rounded-xl p-4">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">Flujo de trabajo</p>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {proc.pasos?.slice(0, 3).map((p, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-gray-600 bg-white px-2 py-1 rounded-lg border border-gray-200">{p.nombre}</span>
                                            {i < (proc.pasos?.length || 0) - 1 && <span className="text-gray-300">→</span>}
                                        </div>
                                    ))}
                                    {(proc.pasos?.length || 0) > 3 && (
                                        <span className="text-xs font-bold text-gray-400">+{proc.pasos!.length - 3} más</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
