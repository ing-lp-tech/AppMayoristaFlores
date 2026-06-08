import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, RotateCcw, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import clsx from 'clsx';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeletedItem {
    id: string;
    label: string;
    sublabel?: string;
    deleted_at: string;
}

interface Category {
    key: string;
    label: string;
    table: string;
    color: string;
    items: DeletedItem[];
    loading: boolean;
    buildLabel: (row: any) => { label: string; sublabel?: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    const days = Math.floor(hrs / 24);
    return `hace ${days} día${days !== 1 ? 's' : ''}`;
};

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES: Omit<Category, 'items' | 'loading'>[] = [
    {
        key: 'lotes',
        label: 'Lotes de Producción',
        table: 'lotes_produccion',
        color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
        buildLabel: (r) => ({ label: `Lote ${r.codigo}`, sublabel: r.propietario || r.modelo_corte }),
    },
    {
        key: 'productos',
        label: 'Productos',
        table: 'productos',
        color: 'bg-purple-50 border-purple-200 text-purple-700',
        buildLabel: (r) => ({ label: r.nombre, sublabel: r.codigo }),
    },
    {
        key: 'rollos',
        label: 'Rollos de Tela',
        table: 'rollos_tela',
        color: 'bg-blue-50 border-blue-200 text-blue-700',
        buildLabel: (r) => ({ label: r.codigo, sublabel: `${r.tipo_tela} · ${r.color || 'Sin color'}` }),
    },
    {
        key: 'insumos',
        label: 'Insumos',
        table: 'insumos',
        color: 'bg-cyan-50 border-cyan-200 text-cyan-700',
        buildLabel: (r) => ({ label: r.nombre, sublabel: r.codigo }),
    },
    {
        key: 'proveedores',
        label: 'Proveedores',
        table: 'proveedores',
        color: 'bg-emerald-50 border-emerald-200 text-emerald-700',
        buildLabel: (r) => ({ label: r.nombre, sublabel: r.codigo }),
    },
    {
        key: 'pedidos',
        label: 'Pedidos',
        table: 'pedidos',
        color: 'bg-yellow-50 border-yellow-200 text-yellow-700',
        buildLabel: (r) => ({ label: `Pedido #${r.codigo_pedido || r.id.slice(0, 8)}`, sublabel: r.estado }),
    },
    {
        key: 'compras',
        label: 'Compras a Proveedores',
        table: 'compras_proveedores',
        color: 'bg-orange-50 border-orange-200 text-orange-700',
        buildLabel: (r) => ({ label: r.codigo_compra || `Compra ${r.id.slice(0, 8)}`, sublabel: r.descripcion }),
    },
    {
        key: 'pagos',
        label: 'Pagos a Proveedores',
        table: 'pagos_proveedores',
        color: 'bg-rose-50 border-rose-200 text-rose-700',
        buildLabel: (r) => ({ label: `Pago $${Number(r.monto || 0).toLocaleString('es-AR')}`, sublabel: r.descripcion }),
    },
    {
        key: 'gastos',
        label: 'Gastos Operativos',
        table: 'gastos_operativos',
        color: 'bg-red-50 border-red-200 text-red-700',
        buildLabel: (r) => ({ label: r.descripcion || `Gasto ${r.id.slice(0, 8)}`, sublabel: `$${Number(r.monto || 0).toLocaleString('es-AR')}` }),
    },
    {
        key: 'aportes',
        label: 'Aportes de Capital',
        table: 'aportes_capital',
        color: 'bg-green-50 border-green-200 text-green-700',
        buildLabel: (r) => ({ label: `Aporte $${Number(r.monto || 0).toLocaleString('es-AR')}`, sublabel: r.descripcion }),
    },
    {
        key: 'retiros',
        label: 'Retiros de Capital',
        table: 'retiros_capital',
        color: 'bg-pink-50 border-pink-200 text-pink-700',
        buildLabel: (r) => ({ label: `Retiro $${Number(r.monto || 0).toLocaleString('es-AR')}`, sublabel: r.descripcion }),
    },
    {
        key: 'cupones',
        label: 'Cupones de Descuento',
        table: 'cupones_descuento',
        color: 'bg-violet-50 border-violet-200 text-violet-700',
        buildLabel: (r) => ({ label: r.codigo, sublabel: `${r.descuento_porcentaje ?? r.descuento ?? '?'}% descuento` }),
    },
    {
        key: 'calculos',
        label: 'Cálculos de Costos',
        table: 'calculos_costos',
        color: 'bg-slate-50 border-slate-200 text-slate-700',
        buildLabel: (r) => ({ label: r.nombre || `Cálculo ${r.id.slice(0, 8)}`, sublabel: r.descripcion }),
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const Papelera = () => {
    const [categories, setCategories] = useState<Category[]>(
        CATEGORIES.map((c) => ({ ...c, items: [], loading: true }))
    );
    const [expanded, setExpanded] = useState<Set<string>>(new Set(['lotes', 'productos', 'rollos', 'insumos']));
    const [restoring, setRestoring] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setCategories((prev) => prev.map((c) => ({ ...c, loading: true })));

        const results = await Promise.allSettled(
            CATEGORIES.map((cat) =>
                supabase
                    .from(cat.table)
                    .select('*')
                    .not('deleted_at', 'is', null)
                    .order('deleted_at', { ascending: false })
            )
        );

        setCategories(
            CATEGORIES.map((cat, i) => {
                const result = results[i];
                const rows = result.status === 'fulfilled' ? (result.value.data || []) : [];
                return {
                    ...cat,
                    loading: false,
                    items: rows.map((r: any) => ({
                        id: r.id,
                        deleted_at: r.deleted_at,
                        ...cat.buildLabel(r),
                    })),
                };
            })
        );
    };

    const restore = async (table: string, id: string) => {
        setRestoring(id);
        try {
            const { error } = await supabase
                .from(table)
                .update({ deleted_at: null })
                .eq('id', id);
            if (error) throw error;
            fetchAll();
        } catch (err: any) {
            alert('Error al restaurar: ' + err.message);
        } finally {
            setRestoring(null);
        }
    };

    const permanentDelete = async (table: string, id: string, label: string) => {
        if (!confirm(`¿Eliminar permanentemente "${label}"? Esta acción NO se puede deshacer.`)) return;
        setDeleting(id);
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            fetchAll();
        } catch (err: any) {
            alert('Error al eliminar: ' + err.message);
        } finally {
            setDeleting(null);
        }
    };

    const toggleExpand = (key: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 font-serif flex items-center gap-2">
                    <Trash2 className="h-6 w-6 text-gray-400" />
                    Papelera de Reciclaje
                </h1>
                <p className="text-gray-500 mt-1">
                    {totalItems === 0
                        ? 'La papelera está vacía'
                        : `${totalItems} elemento${totalItems !== 1 ? 's' : ''} eliminado${totalItems !== 1 ? 's' : ''} — podés restaurarlos en cualquier momento`}
                </p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <span>
                    Los elementos en papelera no aparecen en ninguna otra sección del sistema.
                    Restaurar devuelve el elemento al estado activo. La eliminación permanente
                    es irreversible.
                </span>
            </div>

            {/* Categories */}
            {categories.map((cat) => {
                const isExpanded = expanded.has(cat.key);
                const hasItems = cat.items.length > 0;

                return (
                    <div key={cat.key} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        {/* Category header */}
                        <button
                            onClick={() => toggleExpand(cat.key)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <span className="font-semibold text-gray-800">{cat.label}</span>
                                {cat.loading ? (
                                    <span className="text-xs text-gray-400 animate-pulse">cargando...</span>
                                ) : (
                                    <span
                                        className={clsx(
                                            'text-xs font-medium px-2 py-0.5 rounded-full border',
                                            hasItems ? cat.color : 'bg-gray-50 border-gray-200 text-gray-400'
                                        )}
                                    >
                                        {cat.items.length}
                                    </span>
                                )}
                            </div>
                            {isExpanded
                                ? <ChevronUp className="h-4 w-4 text-gray-400" />
                                : <ChevronDown className="h-4 w-4 text-gray-400" />}
                        </button>

                        {/* Items list */}
                        {isExpanded && (
                            <div className="border-t border-gray-100">
                                {cat.loading ? (
                                    <div className="px-5 py-6 text-center text-gray-400 text-sm animate-pulse">Cargando...</div>
                                ) : !hasItems ? (
                                    <div className="px-5 py-6 text-center text-gray-400 text-sm">Sin elementos eliminados</div>
                                ) : (
                                    <ul className="divide-y divide-gray-50">
                                        {cat.items.map((item) => (
                                            <li key={item.id} className="flex items-center gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 truncate">{item.label}</p>
                                                    {item.sublabel && (
                                                        <p className="text-xs text-gray-400 truncate">{item.sublabel}</p>
                                                    )}
                                                </div>

                                                {/* Date */}
                                                <div className="text-right shrink-0 hidden sm:block">
                                                    <p className="text-xs text-gray-500">{timeAgo(item.deleted_at)}</p>
                                                    <p className="text-[11px] text-gray-400">{formatDate(item.deleted_at)}</p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => restore(cat.table, item.id)}
                                                        disabled={restoring === item.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                                    >
                                                        <RotateCcw className="h-3.5 w-3.5" />
                                                        {restoring === item.id ? 'Restaurando...' : 'Restaurar'}
                                                    </button>
                                                    <button
                                                        onClick={() => permanentDelete(cat.table, item.id, item.label)}
                                                        disabled={deleting === item.id}
                                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                        {deleting === item.id ? 'Eliminando...' : 'Eliminar'}
                                                    </button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
