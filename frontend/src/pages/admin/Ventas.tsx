import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Pedido } from '../../types';
import {
    Search, ShoppingCart, Package, Calendar,
    DollarSign, ChevronRight, Filter, RefreshCw,
    Store, Building2, Clock, CheckCircle2,
    Truck, XCircle, Circle
} from 'lucide-react';
import clsx from 'clsx';
import { PedidoDetailModal } from '../../components/admin/PedidoDetailModal';

// ─── Constantes de estado ─────────────────────────────────────────────────────
const ESTADOS = [
    { value: 'todos',        label: 'Todos' },
    { value: 'pendiente',    label: 'Pendiente' },
    { value: 'confirmado',   label: 'Confirmado' },
    { value: 'en_preparacion', label: 'En Preparación' },
    { value: 'enviado',      label: 'Enviado' },
    { value: 'entregado',    label: 'Entregado' },
    { value: 'cancelado',    label: 'Cancelado' },
];

const estadoConfig: Record<string, { badge: string; icon: React.FC<{ className?: string }> }> = {
    'pendiente':      { badge: 'bg-amber-100 text-amber-700 border-amber-200',      icon: Clock        },
    'confirmado':     { badge: 'bg-blue-100 text-blue-700 border-blue-200',          icon: CheckCircle2 },
    'en_preparacion': { badge: 'bg-purple-100 text-purple-700 border-purple-200',    icon: Package      },
    'enviado':        { badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',    icon: Truck        },
    'entregado':      { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    'cancelado':      { badge: 'bg-red-100 text-red-700 border-red-200',             icon: XCircle      },
};

const getEstadoConfig = (estado: string) =>
    estadoConfig[estado] ?? { badge: 'bg-gray-100 text-gray-600 border-gray-200', icon: Circle };

// ─── Badge de Estado ──────────────────────────────────────────────────────────
const EstadoBadge = ({ estado, size = 'sm' }: { estado: string; size?: 'xs' | 'sm' }) => {
    const cfg = getEstadoConfig(estado);
    const Icon = cfg.icon;
    return (
        <span
            className={clsx(
                'inline-flex items-center gap-1 rounded-full border font-bold uppercase tracking-wide',
                size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
                cfg.badge
            )}
        >
            <Icon className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
            {estado.replace('_', ' ')}
        </span>
    );
};

// ─── Componente principal ─────────────────────────────────────────────────────
export const Ventas = () => {
    const [sales, setSales] = useState<Pedido[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('todos');
    const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);

    const fetchSales = async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pedidos')
                .select(`
                    *,
                    items_minorista:pedido_items_minorista(
                        *,
                        color_nombre,
                        color_hex,
                        producto:productos(nombre, codigo),
                        talla:producto_talles(talla_codigo, talla_nombre)
                    ),
                    items_mayorista:pedido_items_mayorista(
                        *,
                        producto:productos(nombre, codigo)
                    )
                `)
                .order('creado_en', { ascending: false });

            if (error) throw error;
            setSales(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, []);

    const handleRefresh = () => {
        fetchSales(true);
        setSelectedPedido(null);
    };

    const filteredSales = sales.filter(s => {
        const matchSearch =
            s.codigo_pedido.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchEstado = filterEstado === 'todos' || s.estado === filterEstado;
        return matchSearch && matchEstado;
    });

    // Contadores por estado
    const countByEstado = (estado: string) =>
        estado === 'todos'
            ? sales.length
            : sales.filter(s => s.estado === estado).length;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 gap-4 text-gray-400">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium">Cargando ventas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* ── Cabecera ─────────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black text-gray-900">Ventas</h1>
                    <p className="text-xs md:text-sm text-gray-500">
                        {filteredSales.length} órdenes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                        title="Actualizar"
                    >
                        <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
                    </button>
                    <button
                        className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors opacity-50 cursor-not-allowed"
                        title="Próximamente"
                    >
                        <ShoppingCart className="h-4 w-4" />
                        <span className="hidden sm:inline">Nueva Venta</span>
                    </button>
                </div>
            </div>

            {/* ── Buscador ──────────────────────────────────────────── */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Buscar por código o cliente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm"
                />
            </div>

            {/* ── Filtros por Estado (scroll horizontal mobile) ─────── */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
                {ESTADOS.map(({ value, label }) => {
                    const count = countByEstado(value);
                    const isActive = filterEstado === value;
                    return (
                        <button
                            key={value}
                            onClick={() => setFilterEstado(value)}
                            className={clsx(
                                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                                isActive
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                            )}
                        >
                            {label}
                            <span
                                className={clsx(
                                    'rounded-full px-1.5 py-0.5 text-[10px] font-black',
                                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                                )}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Vista Desktop (tabla) ──────────────────────────────── */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-3">Código</th>
                            <th className="px-5 py-3">Cliente</th>
                            <th className="px-5 py-3">Tipo</th>
                            <th className="px-5 py-3">Items</th>
                            <th className="px-5 py-3">Total</th>
                            <th className="px-5 py-3">Estado</th>
                            <th className="px-5 py-3">Fecha</th>
                            <th className="px-5 py-3" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredSales.map((venta) => {
                            const itemCount = (venta.items_minorista?.length || 0) + (venta.items_mayorista?.length || 0);
                            return (
                                <tr
                                    key={venta.id}
                                    onClick={() => setSelectedPedido(venta)}
                                    className="hover:bg-blue-50/60 cursor-pointer transition-colors group"
                                >
                                    <td className="px-5 py-4 font-mono text-sm font-bold text-gray-800">
                                        {venta.codigo_pedido}
                                    </td>
                                    <td className="px-5 py-4 font-medium text-gray-900">
                                        {venta.cliente_nombre || 'Cliente Final'}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span
                                            className={clsx(
                                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border',
                                                venta.tipo_cliente_pedido === 'mayorista'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200'
                                            )}
                                        >
                                            {venta.tipo_cliente_pedido === 'mayorista'
                                                ? <><Building2 className="h-3 w-3" /> Mayorista</>
                                                : <><Store className="h-3 w-3" /> Minorista</>
                                            }
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-500">
                                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                    </td>
                                    <td className="px-5 py-4 font-bold text-gray-900">
                                        ${venta.total.toLocaleString('es-AR')}
                                    </td>
                                    <td className="px-5 py-4">
                                        {/* BUG FIX: era venta.estado_pago → ahora venta.estado */}
                                        <EstadoBadge estado={venta.estado} />
                                    </td>
                                    <td className="px-5 py-4 text-sm text-gray-500">
                                        {new Date(venta.creado_en).toLocaleDateString('es-AR', {
                                            day: '2-digit', month: 'short', year: '2-digit'
                                        })}
                                    </td>
                                    <td className="px-5 py-4">
                                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-5 py-16 text-center text-gray-400">
                                    <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-medium">Sin resultados</p>
                                    <p className="text-xs mt-1">Probá otro filtro o término de búsqueda</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* ── Vista Mobile (cards mejoradas) ─────────────────────── */}
            <div className="md:hidden space-y-3">
                {filteredSales.map((venta) => {
                    const itemCount =
                        (venta.items_minorista?.length || 0) +
                        (venta.items_mayorista?.length || 0);

                    return (
                        <button
                            key={venta.id}
                            onClick={() => setSelectedPedido(venta)}
                            className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform"
                        >
                            {/* Stripe superior de color según estado */}
                            <div
                                className={clsx(
                                    'h-1 w-full rounded-t-2xl',
                                    venta.estado === 'pendiente'      && 'bg-amber-400',
                                    venta.estado === 'confirmado'     && 'bg-blue-500',
                                    venta.estado === 'en_preparacion' && 'bg-purple-500',
                                    venta.estado === 'enviado'        && 'bg-indigo-500',
                                    venta.estado === 'entregado'      && 'bg-emerald-500',
                                    venta.estado === 'cancelado'      && 'bg-red-400',
                                )}
                            />

                            <div className="p-4">
                                {/* Fila 1: Código + Estado */}
                                <div className="flex items-center justify-between mb-2.5">
                                    <span className="font-mono text-sm font-black text-gray-900 tracking-tight">
                                        {venta.codigo_pedido}
                                    </span>
                                    <EstadoBadge estado={venta.estado} size="xs" />
                                </div>

                                {/* Fila 2: Cliente */}
                                <p className="text-sm font-semibold text-gray-800 mb-3 truncate">
                                    {venta.cliente_nombre || 'Cliente Final'}
                                </p>

                                {/* Fila 3: Metadatos */}
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className={clsx(
                                        'inline-flex items-center gap-1 font-bold',
                                        venta.tipo_cliente_pedido === 'mayorista' ? 'text-blue-600' : 'text-gray-500'
                                    )}>
                                        {venta.tipo_cliente_pedido === 'mayorista'
                                            ? <><Building2 className="h-3 w-3" /> Mayorista</>
                                            : <><Store className="h-3 w-3" /> Minorista</>
                                        }
                                    </span>
                                    <span className="text-gray-300">·</span>
                                    <span className="flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                    </span>
                                    <span className="text-gray-300">·</span>
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {new Date(venta.creado_en).toLocaleDateString('es-AR', {
                                            day: '2-digit', month: 'short'
                                        })}
                                    </span>
                                </div>

                                {/* Separador */}
                                <div className="border-t border-gray-100 mt-3 pt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-blue-600">
                                        <DollarSign className="h-4 w-4" />
                                        <span className="text-base font-black text-gray-900">
                                            ${venta.total.toLocaleString('es-AR')}
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                                        Ver detalle <ChevronRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}

                {filteredSales.length === 0 && (
                    <div className="text-center py-16 text-gray-400">
                        <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p className="text-sm font-medium">Sin resultados</p>
                        <p className="text-xs mt-1">Probá otro filtro o término de búsqueda</p>
                    </div>
                )}
            </div>

            {/* ── Modal de Detalle ─────────────────────────────────── */}
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
