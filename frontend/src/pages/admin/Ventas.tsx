import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Pedido } from '../../types';
import { Search, ShoppingCart, Package, Calendar, DollarSign, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { PedidoDetailModal } from '../../components/admin/PedidoDetailModal';

export const Ventas = () => {
    const [sales, setSales] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

    const fetchSales = async () => {
        try {
            const { data, error } = await supabase
                .from('pedidos')
                .select('*, items_minorista:pedido_items_minorista(*), items_mayorista:pedido_items_mayorista(*)')
                .order('creado_en', { ascending: false });

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const handleRefresh = () => {
        setLoading(true);
        fetchSales();
        setSelectedPedido(null);
    };

    const filteredSales = sales.filter(s =>
        s.codigo_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const estadoColors: Record<string, string> = {
        'pendiente': 'bg-yellow-100 text-yellow-700',
        'confirmado': 'bg-blue-100 text-blue-700',
        'en_preparacion': 'bg-purple-100 text-purple-700',
        'enviado': 'bg-indigo-100 text-indigo-700',
        'entregado': 'bg-green-100 text-green-700',
        'cancelado': 'bg-red-100 text-red-700'
    };

    if (loading) return <div className="p-8 text-center">Cargando ventas...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Ventas</h1>
                    <p className="text-gray-500">Historial de órdenes y transacciones</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 opacity-50 cursor-not-allowed" title="Próximamente">
                    <ShoppingCart className="h-5 w-5" /> Nueva Venta (POS)
                </button>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative">
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

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium text-xs uppercase">
                        <tr>
                            <th className="px-6 py-3">Código</th>
                            <th className="px-6 py-3">Cliente</th>
                            <th className="px-6 py-3">Tipo</th>
                            <th className="px-6 py-3">Items</th>
                            <th className="px-6 py-3">Total</th>
                            <th className="px-6 py-3">Estado</th>
                            <th className="px-6 py-3">Fecha</th>
                            <th className="px-6 py-3"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredSales.map((venta) => {
                            const itemCount = (venta.items_minorista?.length || 0) + (venta.items_mayorista?.length || 0);

                            return (
                                <tr
                                    key={venta.id}
                                    onClick={() => setSelectedPedido(venta)}
                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                >
                                    <td className="px-6 py-4 font-mono text-sm">{venta.codigo_pedido}</td>
                                    <td className="px-6 py-4 font-medium">{venta.cliente_nombre || 'Cliente Final'}</td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-bold",
                                            venta.tipo_cliente_pedido === 'mayorista'
                                                ? "bg-blue-100 text-blue-700"
                                                : "bg-gray-100 text-gray-700"
                                        )}>
                                            {venta.tipo_cliente_pedido === 'mayorista' ? '🏢 Mayorista' : '🛍️ Minorista'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {itemCount} items
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">
                                        ${venta.total.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={clsx(
                                            "px-2 py-1 rounded-full text-xs font-bold uppercase",
                                            estadoColors[venta.estado_pago]
                                        )}>
                                            {venta.estado.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(venta.creado_en).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                    No se encontraron ventas recientes.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {filteredSales.map((venta) => {
                    const itemCount = (venta.items_minorista?.length || 0) + (venta.items_mayorista?.length || 0);

                    return (
                        <div
                            key={venta.id}
                            onClick={() => setSelectedPedido(venta)}
                            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 active:bg-blue-50 transition-colors"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-mono text-sm font-bold text-gray-900">{venta.codigo_pedido}</p>
                                    <p className="text-sm text-gray-600 mt-0.5">{venta.cliente_nombre || 'Cliente Final'}</p>
                                </div>
                                <span className={clsx(
                                    "px-2 py-1 rounded-full text-xs font-bold",
                                    venta.tipo_cliente_pedido === 'mayorista'
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-700"
                                )}>
                                    {venta.tipo_cliente_pedido === 'mayorista' ? '🏢' : '🛍️'}
                                </span>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="flex items-center gap-2 text-sm">
                                    <Package className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">{itemCount} items</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                        {new Date(venta.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                    </span>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2">
                                    <DollarSign className="h-5 w-5 text-blue-600" />
                                    <span className="text-lg font-bold text-gray-900">
                                        ${venta.total.toLocaleString()}
                                    </span>
                                </div>
                                <span className={clsx(
                                    "px-2 py-1 rounded-full text-xs font-bold uppercase",
                                    estadoColors[venta.estado]
                                )}>
                                    {venta.estado.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                    );
                })}
                {filteredSales.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        No se encontraron ventas recientes.
                    </div>
                )}
            </div>

            {/* Modal */}
            {selectedPedido && (
                <PedidoDetailModal
                    pedido={selectedPedido}
                    onClose={() => setSelectedPedido(null)}
                    onUpdate={handleRefresh}
                />
            )}
        </div>
    );
};
