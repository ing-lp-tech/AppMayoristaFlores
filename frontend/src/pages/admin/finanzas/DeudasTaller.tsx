import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

interface DeudaTaller {
    lote_id: string;
    lote_codigo: string;
    propietario: string | null;
    fecha_inicio: string | null;
    total_acordado: number;
    monto_pendiente: number;
    monto_pagado: number;
    estado_pago: 'pagado' | 'parcial' | 'pendiente';
    observaciones: string | null;
    estado_lote: string;
    creado_en: string;
}

export const DeudasTaller = () => {
    const [deudas, setDeudas] = useState<DeudaTaller[]>([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState<'todos' | 'pendiente' | 'parcial' | 'pagado'>('todos');

    useEffect(() => {
        fetchDeudas();
    }, []);

    const fetchDeudas = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('v_deudas_taller')
                .select('*');
            if (error) throw error;
            setDeudas(data || []);
        } catch (err: any) {
            console.error('Error fetching deudas taller:', err);
        } finally {
            setLoading(false);
        }
    };

    const filtradas = deudas.filter(d =>
        filtro === 'todos' ? true : d.estado_pago === filtro
    );

    const totalDeuda = deudas.reduce((s, d) => s + (d.monto_pendiente || 0), 0);
    const totalGastado = deudas.reduce((s, d) => s + (d.total_acordado || 0), 0);
    const totalPagado = deudas.reduce((s, d) => s + (d.monto_pagado || 0), 0);

    if (loading) return <div className="p-8 text-center text-gray-400">Cargando deudas de taller...</div>;

    return (
        <div className="space-y-6">
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <span className="text-xs font-bold uppercase text-gray-400 block mb-1">Total Acordado</span>
                    <span className="text-2xl font-black text-gray-800">${totalGastado.toLocaleString()}</span>
                </div>
                <div className="bg-white rounded-xl border border-emerald-100 shadow-sm p-5">
                    <span className="text-xs font-bold uppercase text-emerald-500 block mb-1">Total Pagado</span>
                    <span className="text-2xl font-black text-emerald-600">${totalPagado.toLocaleString()}</span>
                </div>
                <div className={clsx('rounded-xl border shadow-sm p-5', totalDeuda > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-100')}>
                    <span className="text-xs font-bold uppercase text-red-400 block mb-1">Deuda Total Pendiente</span>
                    <span className={clsx('text-2xl font-black', totalDeuda > 0 ? 'text-red-600' : 'text-gray-400')}>
                        ${totalDeuda.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
                {(['todos', 'pendiente', 'parcial', 'pagado'] as const).map(f => (
                    <button
                        key={f}
                        onClick={() => setFiltro(f)}
                        className={clsx(
                            'px-4 py-2 rounded-lg text-sm font-bold transition-all capitalize',
                            filtro === f
                                ? f === 'pendiente' ? 'bg-red-100 text-red-700 border-2 border-red-300'
                                    : f === 'parcial' ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                                        : f === 'pagado' ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300'
                                            : 'bg-gray-200 text-gray-700 border-2 border-gray-300'
                                : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-gray-100'
                        )}
                    >
                        {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
                        <span className="ml-2 text-xs">
                            ({f === 'todos' ? deudas.length : deudas.filter(d => d.estado_pago === f).length})
                        </span>
                    </button>
                ))}
            </div>

            {/* Tabla */}
            {filtradas.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                    <CheckCircle className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Sin deudas de taller en este filtro.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                            <tr>
                                <th className="px-5 py-3">Lote</th>
                                <th className="px-5 py-3">Propietario</th>
                                <th className="px-5 py-3">Fecha</th>
                                <th className="px-5 py-3 text-right">Total</th>
                                <th className="px-5 py-3 text-right">Pagado</th>
                                <th className="px-5 py-3 text-right">Pendiente</th>
                                <th className="px-5 py-3 text-center">Estado</th>
                                <th className="px-5 py-3">Observaciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtradas.map(d => (
                                <tr key={d.lote_id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                            {d.lote_codigo}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-gray-600">{d.propietario || '—'}</td>
                                    <td className="px-5 py-4 text-gray-500 text-xs">
                                        {d.fecha_inicio ? new Date(d.fecha_inicio).toLocaleDateString('es-AR') : '—'}
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-gray-800">
                                        ${d.total_acordado.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right font-bold text-emerald-600">
                                        ${d.monto_pagado.toLocaleString()}
                                    </td>
                                    <td className="px-5 py-4 text-right font-black">
                                        <span className={d.monto_pendiente > 0 ? 'text-red-600' : 'text-gray-300'}>
                                            ${d.monto_pendiente.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        {d.estado_pago === 'pagado' && (
                                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full text-[10px] font-black uppercase">
                                                <CheckCircle className="h-3 w-3" /> Pagado
                                            </span>
                                        )}
                                        {d.estado_pago === 'parcial' && (
                                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-[10px] font-black uppercase">
                                                <Clock className="h-3 w-3" /> Parcial
                                            </span>
                                        )}
                                        {d.estado_pago === 'pendiente' && (
                                            <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-[10px] font-black uppercase">
                                                <AlertCircle className="h-3 w-3" /> Pendiente
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-gray-500 text-xs max-w-[200px] truncate" title={d.observaciones ?? ''}>
                                        {d.observaciones || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
