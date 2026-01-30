import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { RolloTela, Insumo, Proveedor } from '../../types';
import { Plus, Search, Edit, Trash2, AlertCircle, ChevronDown, ChevronRight, Package, Ruler, Scale } from 'lucide-react';
import { FormattedNumberInput } from '../../components/ui/FormattedNumberInput';
import clsx from 'clsx';

// Extended type (since we added columns in DB but maybe not in TS types yet)
interface ExtendedRollo extends RolloTela {
    ancho_cm?: number;
    peso_inicial?: number;
    peso_restante?: number;
    propietario?: string;
}

export const Inventario = () => {
    const [activeTab, setActiveTab] = useState<'telas' | 'insumos'>('telas');
    const [telas, setTelas] = useState<ExtendedRollo[]>([]);
    const [insumos, setInsumos] = useState<Insumo[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [estadoFilter, setEstadoFilter] = useState<'todos' | 'disponible' | 'usado' | 'agotado'>('todos');

    // Fabric Grouping State
    const [expandedType, setExpandedType] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form states
    const [newTela, setNewTela] = useState<Partial<ExtendedRollo>>({
        codigo: '',
        tipo_tela: '',
        color: '',
        metros_iniciales: 0,
        metros_restantes: 0,
        peso_inicial: 0,
        peso_restante: 0,
        ancho_cm: 150,
        costo_por_metro: 0,
        estado: 'disponible',
        propietario: ''
    });

    const [newInsumo, setNewInsumo] = useState<Partial<Insumo>>({
        codigo: '', nombre: '', stock_actual: 0, stock_minimo: 10, unidad_medida: 'unidades', costo_unitario: 0
    });

    // Fabric Types State (Moved from below)
    interface TipoTela { id: string; nombre: string; composicion: string; proveedor_id: string; onza: string; precio_por_kilo: number; }
    const [availableTypes, setAvailableTypes] = useState<TipoTela[]>([]);

    // Batch Entry State
    const [batchCommon, setBatchCommon] = useState({
        tipo_tela_id: '',
        proveedor_id: '',
        ancho_cm: 150,
        costo_por_metro: 0,
        propietario: ''
    });

    const [batchRolls, setBatchRolls] = useState([
        { color: '', metros_iniciales: 0, peso_inicial: 0 }
    ]);

    const addBatchRow = () => {
        setBatchRolls([...batchRolls, { color: '', metros_iniciales: 0, peso_inicial: 0 }]);
    };

    const removeBatchRow = (index: number) => {
        setBatchRolls(batchRolls.filter((_, i) => i !== index));
    };

    const updateBatchRow = (index: number, field: string, value: any) => {
        const newRolls = [...batchRolls];
        // @ts-ignore
        newRolls[index] = { ...newRolls[index], [field]: value };
        setBatchRolls(newRolls);
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const typeId = e.target.value;
        const type = availableTypes.find(t => t.id === typeId);
        setBatchCommon(prev => ({
            ...prev,
            tipo_tela_id: typeId,
            proveedor_id: type?.proveedor_id || '',
            costo_por_metro: 0
        }));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [telasRes, insumosRes, provRes, typesRes] = await Promise.all([
                supabase.from('rollos_tela').select('*').order('creado_en', { ascending: false }),
                supabase.from('insumos').select('*').order('creado_en', { ascending: false }),
                supabase.from('proveedores').select('*').order('nombre', { ascending: true }),
                supabase.from('tipos_tela').select('*').order('nombre', { ascending: true })
            ]);

            if (telasRes.error) throw telasRes.error;
            if (insumosRes.error) throw insumosRes.error;

            setTelas(telasRes.data || []);
            setInsumos(insumosRes.data || []);
            setProveedores(provRes.data || []);
            setAvailableTypes(typesRes.data || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
        } finally {
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (activeTab === 'telas') {
                if (editingId) {
                    // Update single logic
                    const payload = {
                        ...newTela,
                        metros_restantes: newTela.metros_iniciales,
                        peso_restante: newTela.peso_inicial
                    };
                    const { error } = await supabase.from('rollos_tela').update(payload).eq('id', editingId);
                    if (error) throw error;
                } else {
                    // BATCH INSERT
                    const selectedType = availableTypes.find(t => t.id === batchCommon.tipo_tela_id);
                    if (!selectedType) throw new Error("Seleccione un tipo de tela");

                    const rollsToInsert = batchRolls.map(roll => {
                        const uniqueSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                        const cleanType = selectedType.nombre.substring(0, 3).toUpperCase();
                        const autoCode = `${cleanType}-${uniqueSuffix}`;

                        return {
                            tipo_tela: selectedType.nombre, // Saving name for compatibility
                            proveedor_id: batchCommon.proveedor_id || null,
                            ancho_cm: batchCommon.ancho_cm,
                            costo_por_metro: batchCommon.costo_por_metro,
                            propietario: batchCommon.propietario || null,
                            estado: 'disponible',

                            codigo: autoCode,
                            color: roll.color,
                            metros_iniciales: roll.metros_iniciales,
                            metros_restantes: roll.metros_iniciales,
                            peso_inicial: roll.peso_inicial,
                            peso_restante: roll.peso_inicial
                        };
                    });

                    const { error } = await supabase.from('rollos_tela').insert(rollsToInsert);
                    if (error) throw error;
                }
            } else {
                if (editingId) {
                    const { error } = await supabase.from('insumos').update(newInsumo).eq('id', editingId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('insumos').insert([newInsumo]);
                    if (error) throw error;
                }
            }
            setIsModalOpen(false);
            fetchData();
            alert('Guardado exitosamente');
        } catch (error: any) {
            console.error(error);
            alert('Error al guardar: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar ítem? Esto no se puede deshacer.')) return;
        const table = activeTab === 'telas' ? 'rollos_tela' : 'insumos';
        await supabase.from(table).delete().eq('id', id);
        fetchData();
    };

    const openEdit = (item: any) => {
        setEditingId(item.id);
        if (activeTab === 'telas') {
            setNewTela(item);
        } else {
            setNewInsumo(item);
        }
        setIsModalOpen(true);
    };

    // Fabric Types State
    const [showNewTypeModal, setShowNewTypeModal] = useState(false);
    const [newTypeDraft, setNewTypeDraft] = useState<Partial<TipoTela>>({ nombre: '', composicion: '', onza: '', precio_por_kilo: 0 });

    const handleSaveType = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data, error } = await supabase.from('tipos_tela').insert([newTypeDraft]).select().single();
            if (error) throw error;

            setAvailableTypes([...availableTypes, data]);
            // @ts-ignore
            setBatchCommon(prev => ({ ...prev, tipo_tela_id: data.id }));
            setShowNewTypeModal(false);
            setNewTypeDraft({ nombre: '', composicion: '', onza: '', precio_por_kilo: 0 });
            alert('Tipo de tela creado!');
        } catch (error: any) {
            console.error(error);
            alert('Error al crear tipo: ' + error.message);
        }
    };

    const openNew = () => {
        setEditingId(null);
        setNewTela({
            codigo: '', tipo_tela: '', color: '',
            metros_iniciales: 0, metros_restantes: 0,
            peso_inicial: 0, peso_restante: 0,
            ancho_cm: 150, costo_por_metro: 0,
            estado: 'disponible'
        });
        setNewInsumo({ codigo: '', nombre: '', stock_actual: 0, stock_minimo: 10, unidad_medida: 'unidades', costo_unitario: 0 });
        setIsModalOpen(true);
    };

    // --- Grouping Logic ---
    const groupedTelas = telas.reduce((acc, rollo) => {
        const type = rollo.tipo_tela || 'Sin Clasificar';
        if (!acc[type]) acc[type] = [];
        acc[type].push(rollo);
        return acc;
    }, {} as Record<string, ExtendedRollo[]>);

    const filteredTypes = Object.keys(groupedTelas).filter(type =>
        type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        groupedTelas[type].some(r => r.codigo.toLowerCase().includes(searchTerm.toLowerCase()) || r.color?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const filteredInsumos = insumos.filter(i =>
        i.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );



    return (
        <div className="space-y-6">
            {/* Sync Warning */}


            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventario de Telas e insumos</h1>
                    <p className="text-gray-500">Control de Telas e Insumos</p>
                </div>
                <div className="flex gap-2">
                    <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                        <button
                            onClick={() => setActiveTab('telas')}
                            className={clsx(
                                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'telas' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            Telas (Rollos)
                        </button>
                        <button
                            onClick={() => setActiveTab('insumos')}
                            className={clsx(
                                "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                                activeTab === 'insumos' ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-50"
                            )}
                        >
                            Insumos
                        </button>
                    </div>
                    {activeTab === 'telas' && (
                        <button
                            onClick={() => setShowNewTypeModal(true)}
                            className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors shadow-sm"
                        >
                            <Plus className="h-5 w-5" />
                            Nuevo Tipo de Tela
                        </button>
                    )}
                    <button
                        onClick={openNew}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-5 w-5" />
                        {activeTab === 'telas' ? 'Ingresar Rollos' : 'Nuevo Insumo'}
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder={activeTab === 'telas' ? "Buscar tela por código, tipo..." : "Buscar insumo por nombre, código..."}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* Status Filters (only for telas) */}
            {activeTab === 'telas' && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-600 mr-2">Filtrar por estado:</span>
                        {[
                            { value: 'todos' as const, label: 'Todos', color: 'gray' },
                            { value: 'disponible' as const, label: 'Disponible', color: 'green' },
                            { value: 'usado' as const, label: 'Usado', color: 'yellow' },
                            { value: 'agotado' as const, label: 'Agotado', color: 'red' }
                        ].map(filter => {
                            const count = telas.filter(t => {
                                if (filter.value === 'todos') return true;
                                const totalWeight = Number(t.peso_inicial) || Number(t.peso_restante) || 0;
                                const remainingWeight = Number(t.peso_restante) || 0;
                                const percentageRemaining = totalWeight > 0 ? (remainingWeight / totalWeight) * 100 : 0;
                                const isAgotado = Number(t.metros_restantes) <= 0.5 && Number(t.peso_restante) <= 0.01;

                                if (filter.value === 'agotado') return isAgotado || remainingWeight <= 0.01;
                                if (filter.value === 'disponible') return percentageRemaining >= 95 && !isAgotado;
                                if (filter.value === 'usado') return percentageRemaining > 10 && percentageRemaining < 95 && !isAgotado;
                                return false;
                            }).length;

                            return (
                                <button
                                    key={filter.value}
                                    onClick={() => setEstadoFilter(filter.value)}
                                    className={clsx(
                                        "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                                        estadoFilter === filter.value
                                            ? filter.color === 'green' ? "bg-green-100 text-green-700 border-2 border-green-300"
                                                : filter.color === 'yellow' ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-300"
                                                    : filter.color === 'red' ? "bg-red-100 text-red-700 border-2 border-red-300"
                                                        : "bg-gray-100 text-gray-700 border-2 border-gray-300"
                                            : "bg-gray-50 text-gray-600 border-2 border-transparent hover:bg-gray-100"
                                    )}
                                >
                                    {filter.label}
                                    <span className={clsx(
                                        "px-2 py-0.5 rounded-full text-xs font-black",
                                        estadoFilter === filter.value
                                            ? "bg-white/50"
                                            : "bg-gray-200"
                                    )}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Content */}
            {activeTab === 'telas' ? (
                <div className="space-y-4">
                    {filteredTypes.map(type => {
                        const rolls = groupedTelas[type];
                        // Calculate Active vs Inactive first to use for totals
                        // Now prioritized by KG as requested: If it has weight (> 0.01), it is ACTIVE, even if meters are 0.
                        const activeRolls = rolls.filter(r => Number(r.metros_restantes) > 0.5 || Number(r.peso_restante) > 0.01);
                        const inactiveRolls = rolls.filter(r => Number(r.metros_restantes) <= 0.5 && Number(r.peso_restante) <= 0.01);

                        const totalMeters = activeRolls.reduce((sum, r) => sum + Number(r.metros_restantes || 0), 0);
                        const totalKg = activeRolls.reduce((sum, r) => sum + Number(r.peso_restante || 0), 0);

                        const totalRolls = rolls.length;
                        const availableRollsCount = activeRolls.length;
                        const uniqueColors = [...new Set(rolls.map(r => r.color))].length;
                        const isExpanded = expandedType === type || searchTerm.length > 0;

                        // Group by Color
                        const rollsByColor = rolls.reduce((acc, r) => {
                            const color = r.color || 'Sin Color';
                            if (!acc[color]) acc[color] = [];
                            acc[color].push(r);
                            return acc;
                        }, {} as Record<string, ExtendedRollo[]>);

                        return (
                            <div key={type} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                                <button
                                    onClick={() => setExpandedType(expandedType === type ? null : type)}
                                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                                >
                                    <div className="flex items-center gap-4">
                                        {isExpanded ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">{type}</h3>
                                            <p className="text-sm text-gray-500">{totalRolls} rollos &bull; {uniqueColors} colores</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xl font-bold text-blue-600">{totalKg.toFixed(1)} kg</span>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-gray-500 font-bold">{totalMeters} m</span>
                                            <span className="text-xs text-gray-400 uppercase font-medium">Total Disp.</span>
                                        </div>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="p-4 space-y-6">
                                        {Object.entries(rollsByColor).map(([color, colorRolls]) => (
                                            <div key={color} className="border-l-4 border-blue-200 pl-4">
                                                <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                    {color}
                                                    <span className="text-sm font-normal text-gray-400">({colorRolls.length} rollos)</span>
                                                </h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                                    {[...colorRolls].sort((a, b) => {
                                                        const aActive = Number(a.metros_restantes) > 0.5 || Number(a.peso_restante) > 0.01;
                                                        const bActive = Number(b.metros_restantes) > 0.5 || Number(b.peso_restante) > 0.01;
                                                        if (aActive === bActive) return 0;
                                                        return aActive ? -1 : 1;
                                                    }).filter(t => {
                                                        // Apply estado filter
                                                        if (estadoFilter === 'todos') return true;

                                                        const totalWeight = Number(t.peso_inicial) || Number(t.peso_restante) || 0;
                                                        const remainingWeight = Number(t.peso_restante) || 0;
                                                        const percentageRemaining = totalWeight > 0 ? (remainingWeight / totalWeight) * 100 : 0;
                                                        const isAgotado = Number(t.metros_restantes) <= 0.5 && Number(t.peso_restante) <= 0.01;

                                                        if (estadoFilter === 'agotado') return isAgotado || remainingWeight <= 0.01;
                                                        if (estadoFilter === 'disponible') return percentageRemaining >= 95 && !isAgotado;
                                                        if (estadoFilter === 'usado') return percentageRemaining > 10 && percentageRemaining < 95 && !isAgotado;

                                                        return false;
                                                    }).map(t => {
                                                        const isAgotado = Number(t.metros_restantes) <= 0.5 && Number(t.peso_restante) <= 0.01;

                                                        return (
                                                            <div key={t.id} className={clsx(
                                                                "relative rounded-lg border p-4 transition-all group",
                                                                isAgotado
                                                                    ? "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
                                                                    : "bg-white border-gray-200 hover:shadow-md"
                                                            )}>
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex flex-col gap-1 items-start">
                                                                        <div className="flex items-center gap-1">
                                                                            <span className={clsx("font-mono text-xs px-2 py-1 rounded", isAgotado ? "bg-gray-200 text-gray-500" : "bg-gray-100 text-gray-600")}>{t.codigo}</span>
                                                                            {(() => {
                                                                                // Determine roll status based on weight
                                                                                const totalWeight = Number(t.peso_inicial) || Number(t.peso_restante) || 0;
                                                                                const remainingWeight = Number(t.peso_restante) || 0;
                                                                                const percentageRemaining = totalWeight > 0 ? (remainingWeight / totalWeight) * 100 : 0;

                                                                                if (isAgotado || remainingWeight <= 0.01) {
                                                                                    return <span className="text-[10px] font-black bg-red-100 text-red-600 px-1 py-0.5 rounded border border-red-100">AGOTADO</span>;
                                                                                } else if (percentageRemaining >= 95) {
                                                                                    return <span className="text-[10px] font-black bg-green-100 text-green-600 px-1 py-0.5 rounded border border-green-100">DISPONIBLE</span>;
                                                                                } else if (percentageRemaining > 10) {
                                                                                    return <span className="text-[10px] font-black bg-yellow-100 text-yellow-600 px-1 py-0.5 rounded border border-yellow-100">USADO</span>;
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                        {t.propietario && (
                                                                            <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">
                                                                                {t.propietario}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={() => openEdit(t)} className="p-1 hover:text-blue-600"><Edit className="h-3 w-3" /></button>
                                                                        <button onClick={() => handleDelete(t.id)} className="p-1 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                                                                    </div>
                                                                </div>
                                                                <div className="space-y-2 mt-3">
                                                                    <div className="flex justify-between items-center text-sm">
                                                                        <div className="flex items-center gap-1.5 text-gray-600">
                                                                            <Scale className="h-3.5 w-3.5" />
                                                                            <span>Peso</span>
                                                                        </div>
                                                                        <span className="font-black text-2xl text-blue-700">{t.peso_restante !== null ? t.peso_restante : '-'} <span className="text-sm font-bold text-gray-400">kg</span></span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-sm mt-1">
                                                                        <div className="flex items-center gap-1.5 text-gray-600">
                                                                            <Ruler className="h-3.5 w-3.5" />
                                                                            <span>Metros</span>
                                                                        </div>
                                                                        <span className={clsx("font-bold", isAgotado ? "text-red-400 line-through decoration-2" : "text-gray-900")}>{t.metros_restantes}m</span>
                                                                    </div>
                                                                    <div className="flex justify-between items-center text-sm">
                                                                        <div className="flex items-center gap-1.5 text-gray-600">
                                                                            <Package className="h-3.5 w-3.5" />
                                                                            <span>Ancho</span>
                                                                        </div>
                                                                        <span className="font-medium text-gray-500">{t.ancho_cm || '-'} cm</span>
                                                                    </div>
                                                                </div>
                                                                <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400 flex justify-between">
                                                                    <span>Valor Est.</span>
                                                                    <span>${((t.metros_restantes || 0) * (t.costo_por_metro || 0)).toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )
                                }
                            </div>
                        );
                    })
                    }
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase">
                                <tr>
                                    <th className="px-6 py-3">Insumo</th>
                                    <th className="px-6 py-3">Stock</th>
                                    <th className="px-6 py-3">Unidad</th>
                                    <th className="px-6 py-3">Costo Unit.</th>
                                    <th className="px-6 py-3 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredInsumos.map(i => (
                                    <tr key={i.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{i.nombre}</div>
                                            <div className="text-xs text-gray-500">{i.codigo}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={clsx("flex items-center gap-2", i.stock_actual <= i.stock_minimo && "text-red-600 font-bold")}>
                                                {i.stock_actual <= i.stock_minimo && <AlertCircle className="h-4 w-4" />}
                                                {i.stock_actual}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{i.unidad_medida}</td>
                                        <td className="px-6 py-4 text-gray-500">${i.costo_unitario}</td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => openEdit(i)} className="text-blue-600 hover:underline mr-3">Editar</button>
                                            <button onClick={() => handleDelete(i.id)} className="text-red-600 hover:underline">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {/* Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6">
                            <h2 className="text-xl font-bold mb-4">
                                {editingId ? 'Editar' : 'Ingreso Masivo'} {activeTab === 'telas' ? 'de Telas' : 'de Insumos'}
                            </h2>

                            <form onSubmit={handleSave} className="space-y-4">
                                {activeTab === 'telas' ? (
                                    editingId ? (
                                        // EDIT MODE (Single Roll)
                                        <>
                                            <div className="bg-yellow-50 p-3 rounded mb-4 text-sm text-yellow-800 border border-yellow-200">
                                                Editando Rollo individual. Para cambiar propiedades base, edite el Tipo de Tela.
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Tela</label>
                                                    <input disabled className="w-full border p-2 rounded bg-gray-100" value={newTela.tipo_tela} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                                    <input placeholder="Ej: Azul Clásico" className="w-full border p-2 rounded" value={newTela.color} onChange={e => setNewTela({ ...newTela, color: e.target.value })} required />
                                                </div>
                                            </div>

                                            <div className="mb-4">
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Propietario</label>
                                                <select
                                                    className="w-full border p-2 rounded font-medium text-blue-900"
                                                    value={newTela.propietario || ''}
                                                    onChange={e => setNewTela({ ...newTela, propietario: e.target.value })}
                                                >
                                                    <option value="">-- Sin asignar --</option>
                                                    <option value="Soledad">Soledad</option>
                                                    <option value="Tatiana">Tatiana</option>
                                                    <option value="Florinda">Florinda</option>
                                                </select>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Metros Restantes</label>
                                                    <div className="relative">
                                                        <FormattedNumberInput
                                                            value={newTela.metros_restantes || 0}
                                                            onChange={val => setNewTela({ ...newTela, metros_restantes: val })}
                                                            className="w-full border p-2 rounded pl-8"
                                                            suffix={<Ruler className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />}
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Peso Restante (Kg)</label>
                                                    <div className="relative">
                                                        <FormattedNumberInput
                                                            value={newTela.peso_restante || 0}
                                                            onChange={val => setNewTela({ ...newTela, peso_restante: val })}
                                                            className="w-full border p-2 rounded pl-8"
                                                            suffix={<Scale className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        // BATCH ENTRY MODE
                                        <>
                                            {/* Common Header */}
                                            <div className="bg-gray-50 p-4 rounded-lg space-y-4 mb-4 border">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-gray-700 text-sm uppercase">Datos del Lote</h3>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewTypeModal(true)}
                                                        className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-medium"
                                                    >
                                                        + Nuevo Tipo de Tela
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de Tela</label>
                                                        <select
                                                            className="w-full border p-2 rounded bg-white shadow-sm"
                                                            value={batchCommon.tipo_tela_id}
                                                            onChange={handleTypeChange}
                                                            required
                                                        >
                                                            <option value="">-- Seleccionar Tipo --</option>
                                                            {availableTypes.map(t => (
                                                                <option key={t.id} value={t.id}>{t.nombre}</option>
                                                            ))}
                                                        </select>
                                                        {batchCommon.tipo_tela_id && (
                                                            <div className="mt-2 text-xs text-gray-400 bg-white p-2 rounded border">
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <span>Comp: {availableTypes.find(t => t.id === batchCommon.tipo_tela_id)?.composicion || '-'}</span>
                                                                    <span>Onzas: {availableTypes.find(t => t.id === batchCommon.tipo_tela_id)?.onza || '-'}</span>
                                                                </div>
                                                            </div>
                                                        )}

                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Costo ($/m)</label>
                                                        <FormattedNumberInput
                                                            value={batchCommon.costo_por_metro || 0}
                                                            onChange={val => setBatchCommon({ ...batchCommon, costo_por_metro: val })}
                                                            className="w-full border p-2 rounded bg-white"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Ancho (cm)</label>
                                                        <FormattedNumberInput
                                                            value={batchCommon.ancho_cm || 0}
                                                            onChange={val => setBatchCommon({ ...batchCommon, ancho_cm: val })}
                                                            className="w-full border p-2 rounded bg-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Proveedor (del Lote)</label>
                                                        <select
                                                            className="w-full border p-2 rounded bg-white"
                                                            value={batchCommon.proveedor_id}
                                                            onChange={e => setBatchCommon({ ...batchCommon, proveedor_id: e.target.value })}
                                                        >
                                                            <option value="">Seleccionar...</option>
                                                            {proveedores.filter(p => p.tipo === 'tela').map(p => (
                                                                <option key={p.id} value={p.id}>{p.nombre}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1">Propietario (Socio)</label>
                                                        <select
                                                            className="w-full border p-2 rounded bg-white font-bold text-blue-900"
                                                            value={batchCommon.propietario}
                                                            onChange={e => setBatchCommon({ ...batchCommon, propietario: e.target.value })}
                                                        >
                                                            <option value="">-- Todos / Empresa --</option>
                                                            <option value="Soledad">Soledad</option>
                                                            <option value="Tatiana">Tatiana</option>
                                                            <option value="Florinda">Florinda</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dynamic Rows */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <h3 className="font-bold text-gray-700 text-sm uppercase">Lista de Rollos</h3>
                                                    <button type="button" onClick={addBatchRow} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">+ Agregar Fila</button>
                                                </div>

                                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                                    {batchRolls.map((roll, idx) => (
                                                        <div key={idx} className="flex gap-2 items-start bg-white p-2 border rounded-lg shadow-sm">
                                                            <div className="w-8 pt-2 text-center text-xs text-gray-400 font-mono">{idx + 1}</div>
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 flex-1">
                                                                <input
                                                                    placeholder="Color (ej: Azul)"
                                                                    className="border p-1.5 rounded text-sm w-full"
                                                                    value={roll.color}
                                                                    onChange={e => updateBatchRow(idx, 'color', e.target.value)}
                                                                    required
                                                                />
                                                                <div className="relative">
                                                                    <FormattedNumberInput
                                                                        placeholder="Metros"
                                                                        className="border p-1.5 rounded text-sm w-full pl-6"
                                                                        value={roll.metros_iniciales || 0}
                                                                        onChange={val => updateBatchRow(idx, 'metros_iniciales', val)}
                                                                        suffix={<Ruler className="absolute left-1.5 top-2 h-3 w-3 text-gray-400" />}
                                                                    />
                                                                </div>
                                                                <div className="relative">
                                                                    <FormattedNumberInput
                                                                        placeholder="Kg"
                                                                        className="border p-1.5 rounded text-sm w-full pl-6"
                                                                        value={roll.peso_inicial || 0}
                                                                        onChange={val => updateBatchRow(idx, 'peso_inicial', val)}
                                                                        suffix={<Scale className="absolute left-1.5 top-2 h-3 w-4 text-gray-400" />}
                                                                    />
                                                                </div>
                                                            </div>
                                                            {batchRolls.length > 1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => removeBatchRow(idx)}
                                                                    className="text-red-400 hover:text-red-600 p-1.5"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="text-xs text-gray-400 text-center pt-2">
                                                    * El código se generará automáticamente (ej: GAB-A1B2)
                                                </div>
                                            </div>
                                        </>
                                    )
                                ) : (
                                    <>
                                        <input placeholder="Código" className="w-full border p-2 rounded" value={newInsumo.codigo} onChange={e => setNewInsumo({ ...newInsumo, codigo: e.target.value })} required />
                                        <input placeholder="Nombre (ej: Botón 20mm)" className="w-full border p-2 rounded" value={newInsumo.nombre} onChange={e => setNewInsumo({ ...newInsumo, nombre: e.target.value })} required />
                                        <div className="grid grid-cols-2 gap-4">
                                            <FormattedNumberInput
                                                placeholder="Stock Actual"
                                                className="border p-2 rounded"
                                                value={newInsumo.stock_actual || 0}
                                                onChange={val => setNewInsumo({ ...newInsumo, stock_actual: val })}
                                            />
                                            <FormattedNumberInput
                                                placeholder="Stock Mínimo"
                                                className="border p-2 rounded"
                                                value={newInsumo.stock_minimo || 0}
                                                onChange={val => setNewInsumo({ ...newInsumo, stock_minimo: val })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <select className="border p-2 rounded" value={newInsumo.unidad_medida} onChange={e => setNewInsumo({ ...newInsumo, unidad_medida: e.target.value })}>
                                                <option value="unidades">Unidades</option>
                                                <option value="metros">Metros</option>
                                                <option value="kg">Metros</option>
                                            </select>
                                            <FormattedNumberInput
                                                placeholder="Costo Unitario ($)"
                                                className="border p-2 rounded"
                                                value={newInsumo.costo_unitario || 0}
                                                onChange={val => setNewInsumo({ ...newInsumo, costo_unitario: val })}
                                            />
                                        </div>
                                        <select
                                            className="w-full border p-2 rounded"
                                            value={newInsumo.proveedor_id || ''}
                                            onChange={e => setNewInsumo({ ...newInsumo, proveedor_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar Proveedor...</option>
                                            {proveedores.filter(p => p.tipo === 'insumo').map(p => (
                                                <option key={p.id} value={p.id}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    </>
                                )}

                                <div className="flex justify-end gap-2 mt-6">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 hover:bg-gray-100 rounded">Cancelar</button>
                                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Modal for New Type */}
            {
                showNewTypeModal && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border-2 border-blue-100">
                            <div className="flex justify-between items-center mb-6 border-b pb-2">
                                <h2 className="text-lg font-bold text-gray-800">Crear Nuevo Tipo de Tela</h2>
                                <button onClick={() => setShowNewTypeModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
                            </div>
                            <form onSubmit={handleSaveType} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre (ej: Gabardina)</label>
                                    <input className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" autoFocus value={newTypeDraft.nombre} onChange={e => setNewTypeDraft({ ...newTypeDraft, nombre: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Composición</label>
                                    <input placeholder="Ej: 100% Algodón" className="w-full border p-2 rounded" value={newTypeDraft.composicion} onChange={e => setNewTypeDraft({ ...newTypeDraft, composicion: e.target.value })} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Onzas</label>
                                        <input placeholder="Ej: 8oz" className="w-full border p-2 rounded" value={newTypeDraft.onza} onChange={e => setNewTypeDraft({ ...newTypeDraft, onza: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Precio x Kg</label>
                                        <FormattedNumberInput
                                            className="w-full border p-2 rounded"
                                            value={newTypeDraft.precio_por_kilo || 0}
                                            onChange={val => setNewTypeDraft({ ...newTypeDraft, precio_por_kilo: val })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor Predeterminado</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        value={newTypeDraft.proveedor_id || ''}
                                        onChange={e => setNewTypeDraft({ ...newTypeDraft, proveedor_id: e.target.value })}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {proveedores.filter(p => p.tipo === 'tela').map(p => (
                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex justify-end gap-2 mt-8 pt-4 border-t">
                                    <button type="button" onClick={() => setShowNewTypeModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium">Cancelar</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded shadow-lg hover:bg-blue-700 text-sm font-bold transition-transform active:scale-95">Guardar Tipo</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
