import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    Factory,
    Layers,
    ShoppingCart,
    Package,
    TrendingUp,
    AlertTriangle,
    Users,
    DollarSign,
    ChevronRight,
    BarChart3,
    Truck,
    Clock,
    CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

// ─── Types ─────────────────────────────────────────────────────────────────

interface DashboardStats {
    lotesActivos: number;
    lotesTerminados: number;
    rollosDisponibles: number;
    pedidosRecientes: number;
    totalVentas: number;
    deudaPendiente: number;
    totalProveedores: number;
}

interface LoteReciente {
    id: string;
    codigo: string;
    estado: string;
    progreso_porcentaje: number;
    paso_actual_index: number;
    proceso_snapshot: any;
    // Supabase puede retornar tanto objeto como array según la relación
    productos?: any[];
    producto?: any;
}

interface PedidoReciente {
    id: string;
    codigo_pedido: string;
    cliente_nombre?: string;
    total: number;
    estado: string;
    creado_en: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const estadoLoteColor: Record<string, string> = {
    planificado: 'bg-gray-100 text-gray-600',
    corte: 'bg-amber-100 text-amber-700',
    taller: 'bg-blue-100 text-blue-700',
    terminado: 'bg-emerald-100 text-emerald-700',
};

const estadoPedidoColor: Record<string, string> = {
    pendiente: 'bg-yellow-100 text-yellow-700',
    confirmado: 'bg-blue-100 text-blue-700',
    en_preparacion: 'bg-purple-100 text-purple-700',
    enviado: 'bg-indigo-100 text-indigo-700',
    entregado: 'bg-green-100 text-green-700',
    cancelado: 'bg-red-100 text-red-700',
};

const fmt = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

// ─── Component ──────────────────────────────────────────────────────────────

export const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats>({
        lotesActivos: 0,
        lotesTerminados: 0,
        rollosDisponibles: 0,
        pedidosRecientes: 0,
        totalVentas: 0,
        deudaPendiente: 0,
        totalProveedores: 0,
    });
    const [lotes, setLotes] = useState<LoteReciente[]>([]);
    const [pedidos, setPedidos] = useState<PedidoReciente[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        try {
            const [
                lotesRes,
                rollosRes,
                pedidosRes,
                comprasRes,
                proveedoresRes,
            ] = await Promise.all([
                supabase
                    .from('lotes_produccion')
                    .select(`id, codigo, estado, progreso_porcentaje, paso_actual_index, proceso_snapshot,
                        producto:productos(nombre),
                        productos:lote_productos(producto:productos(nombre))
                    `)
                    .order('creado_en', { ascending: false })
                    .limit(20),

                supabase
                    .from('rollos_tela')
                    .select('id', { count: 'exact' })
                    .or('metros_restantes.gt.0.5,peso_restante.gt.0.01'),

                supabase
                    .from('pedidos')
                    .select('id, codigo_pedido, cliente_nombre, total, estado, creado_en')
                    .order('creado_en', { ascending: false })
                    .limit(5),

                supabase
                    .from('compras_proveedores')
                    .select('monto_pendiente')
                    .neq('estado_pago', 'pagado'),

                supabase
                    .from('proveedores')
                    .select('id', { count: 'exact' }),
            ]);

            const todosLotes: LoteReciente[] = (lotesRes.data || []) as LoteReciente[];
            const lotesActivos = todosLotes.filter(l => l.estado !== 'terminado').length;
            const lotesTerminados = todosLotes.filter(l => l.estado === 'terminado').length;

            const allPedidos: PedidoReciente[] = pedidosRes.data || [];
            const totalVentas = allPedidos.reduce((s, p) => s + (p.total || 0), 0);

            const compras = comprasRes.data || [];
            const deudaPendiente = compras.reduce((s: number, c: any) => s + (c.monto_pendiente || 0), 0);

            setStats({
                lotesActivos,
                lotesTerminados,
                rollosDisponibles: rollosRes.count || 0,
                pedidosRecientes: allPedidos.length,
                totalVentas,
                deudaPendiente,
                totalProveedores: proveedoresRes.count || 0,
            });

            setLotes(todosLotes.filter(l => l.estado !== 'terminado').slice(0, 4));
            setPedidos(allPedidos.slice(0, 4));
        } catch (err) {
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Accesos rápidos ──────────────────────────────────────────────────────
    const quickLinks = [
        { label: 'Producción', icon: Factory, color: 'bg-indigo-50 text-indigo-600', path: '/admin/produccion' },
        { label: 'Inventario', icon: Layers, color: 'bg-purple-50 text-purple-600', path: '/admin/inventario' },
        { label: 'Stock', icon: Package, color: 'bg-teal-50 text-teal-600', path: '/admin/stock' },
        { label: 'Ventas', icon: ShoppingCart, color: 'bg-blue-50 text-blue-600', path: '/admin/ventas' },
        { label: 'Proveedores', icon: Truck, color: 'bg-orange-50 text-orange-600', path: '/admin/proveedores' },
        { label: 'Costos', icon: BarChart3, color: 'bg-pink-50 text-pink-600', path: '/admin/costos' },
        { label: 'Finanzas', icon: DollarSign, color: 'bg-green-50 text-green-600', path: '/admin/finanzas' },
        { label: 'Equipo', icon: Users, color: 'bg-gray-100 text-gray-600', path: '/admin/equipo' },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-3">
                    <div className="inline-block w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm">Cargando dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-6">

            {/* ── Header ─────────────────────────────────────────────────── */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-500 mt-0.5">Resumen general del negocio</p>
            </div>

            {/* ── KPIs — 2 columnas en mobile, 4 en desktop ──────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Lotes activos */}
                <div
                    onClick={() => navigate('/admin/produccion')}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">Lotes activos</span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Factory className="h-4 w-4 text-indigo-600" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.lotesActivos}</div>
                    <div className="text-xs text-gray-400 mt-1">{stats.lotesTerminados} terminados</div>
                </div>

                {/* Rollos en inventario */}
                <div
                    onClick={() => navigate('/admin/inventario')}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">Rollos tela</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                            <Layers className="h-4 w-4 text-purple-600" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stats.rollosDisponibles}</div>
                    <div className="text-xs text-gray-400 mt-1">con stock disponible</div>
                </div>

                {/* Ventas recientes */}
                <div
                    onClick={() => navigate('/admin/ventas')}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">Últimas ventas</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                        </div>
                    </div>
                    <div className="text-xl font-bold text-gray-900 truncate">{fmt(stats.totalVentas)}</div>
                    <div className="text-xs text-gray-400 mt-1">{stats.pedidosRecientes} pedidos recientes</div>
                </div>

                {/* Deuda pendiente */}
                <div
                    onClick={() => navigate('/admin/finanzas')}
                    className={clsx(
                        'rounded-xl border shadow-sm p-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]',
                        stats.deudaPendiente > 0 ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'
                    )}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">Deuda proveed.</span>
                        <div className={clsx(
                            'w-8 h-8 rounded-lg flex items-center justify-center',
                            stats.deudaPendiente > 0 ? 'bg-red-100' : 'bg-green-50'
                        )}>
                            {stats.deudaPendiente > 0
                                ? <AlertTriangle className="h-4 w-4 text-red-500" />
                                : <CheckCircle2 className="h-4 w-4 text-green-500" />
                            }
                        </div>
                    </div>
                    <div className={clsx(
                        'text-xl font-bold truncate',
                        stats.deudaPendiente > 0 ? 'text-red-700' : 'text-green-700'
                    )}>
                        {stats.deudaPendiente > 0 ? fmt(stats.deudaPendiente) : '¡Al día!'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">compras sin pagar</div>
                </div>
            </div>

            {/* ── Contenido principal — 1 col mobile, 2 col desktop ──────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Lotes en producción */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <div className="flex items-center gap-2">
                            <Factory className="h-4 w-4 text-indigo-500" />
                            <h2 className="font-semibold text-gray-800 text-sm">Producción en curso</h2>
                        </div>
                        <button
                            onClick={() => navigate('/admin/produccion')}
                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 font-medium"
                        >
                            Ver todo <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {lotes.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No hay lotes activos
                            </div>
                        ) : lotes.map(lote => {
                            const nombreProducto = lote.productos && lote.productos.length > 0
                                ? lote.productos.map((lp: any) => lp.producto?.nombre).filter(Boolean).join(' + ')
                                : lote.producto?.nombre || '—';

                            const progreso = lote.estado === 'terminado' ? 100 : (lote.progreso_porcentaje || 10);

                            return (
                                <div
                                    key={lote.id}
                                    onClick={() => navigate('/admin/produccion')}
                                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-mono text-xs font-bold text-indigo-600">{lote.codigo}</span>
                                                <span className={clsx(
                                                    'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                                                    estadoLoteColor[lote.estado] || 'bg-gray-100 text-gray-500'
                                                )}>
                                                    {lote.estado}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-600 truncate">{nombreProducto}</p>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 ml-2 shrink-0">{progreso}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div
                                            className={clsx(
                                                'h-1.5 rounded-full transition-all duration-500',
                                                lote.estado === 'terminado' ? 'bg-emerald-500' : 'bg-indigo-500'
                                            )}
                                            style={{ width: `${progreso}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Últimos pedidos */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                        <div className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-blue-500" />
                            <h2 className="font-semibold text-gray-800 text-sm">Últimos pedidos</h2>
                        </div>
                        <button
                            onClick={() => navigate('/admin/ventas')}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-medium"
                        >
                            Ver todo <ChevronRight className="h-3 w-3" />
                        </button>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {pedidos.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">
                                No hay pedidos recientes
                            </div>
                        ) : pedidos.map(pedido => (
                            <div
                                key={pedido.id}
                                onClick={() => navigate('/admin/ventas')}
                                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-gray-700">{pedido.codigo_pedido}</span>
                                            <span className={clsx(
                                                'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase',
                                                estadoPedidoColor[pedido.estado] || 'bg-gray-100 text-gray-500'
                                            )}>
                                                {pedido.estado?.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(pedido.creado_en).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                                            {pedido.cliente_nombre ? ` · ${pedido.cliente_nombre}` : ''}
                                        </p>
                                    </div>
                                    <span className="text-sm font-bold text-gray-900 shrink-0 ml-2">
                                        {fmt(pedido.total)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Accesos rápidos — grid 4x2 en mobile, 8x1 en desktop ───── */}
            <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Accesos rápidos</h2>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {quickLinks.map(({ label, icon: Icon, color, path }) => (
                        <button
                            key={label}
                            onClick={() => navigate(path)}
                            className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.95] group"
                        >
                            <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', color)}>
                                <Icon className="h-5 w-5" />
                            </div>
                            <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Resumen de proveedores ──────────────────────────────────── */}
            <div
                onClick={() => navigate('/admin/proveedores')}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.99]"
            >
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <Truck className="h-5 w-5 text-orange-500" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">Proveedores registrados</p>
                    <p className="text-xs text-gray-500">Telas, insumos y talleres externos</p>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-2xl font-bold text-gray-900">{stats.totalProveedores}</p>
                    <ChevronRight className="h-4 w-4 text-gray-400 ml-auto" />
                </div>
            </div>

        </div>
    );
};
