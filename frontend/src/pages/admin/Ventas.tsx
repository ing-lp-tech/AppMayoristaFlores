import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Venta } from '../../types';
import { Search, ShoppingCart } from 'lucide-react';
import clsx from 'clsx';

export const Ventas = () => {
    const [sales, setSales] = useState<Venta[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchSales = async () => {
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select('*')
                    .order('fecha_venta', { ascending: false });

                if (error) throw error;
                setSales(data || []);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchSales();
    }, []);

    const filteredSales = sales.filter(s =>
        s.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.cliente_info?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Cargando ventas...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
                    <p className="text-gray-500">Historial de órdenes y transacciones</p>
                </div>
                {/* Placeholder for future POS feature */}
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 opacity-50 cursor-not-allowed" title="Próximamente">
                    <ShoppingCart className="h-5 w-5" /> Nueva Venta (POS)
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por código o cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">Código</th>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Items</th>
                            <th className="px-6 py-3">Total</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredSales.map((venta) => (
                            <tr key={venta.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 font-mono text-sm">{venta.codigo}</td>
                                <td className="px-6 py-4 font-medium">{venta.cliente_info?.nombre || 'Cliente Final'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {(venta.items as any[])?.length || 0} items
                                </td>
                                <td className="px-6 py-4 font-bold text-gray-900">
                                    ${venta.total.toLocaleString()}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={clsx(
                                        "px-2 py-1 rounded-full text-xs font-bold uppercase",
                                        venta.estado_pago === 'pagado' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                    )}>
                                        {venta.estado_pago}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(venta.fecha_venta).toLocaleDateString()}
                                </td>
                            </tr>
                        ))}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No se encontraron ventas recientes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
