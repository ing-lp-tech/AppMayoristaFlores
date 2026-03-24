import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Calendar, Package, ArrowUpRight, ArrowDownRight, Search, FileText, Scissors } from 'lucide-react';
import clsx from 'clsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface StockMovement {
    id: string;
    fecha: string;
    tipo_movimiento: 'entrada_produccion' | 'salida_venta' | 'ajuste';
    producto: { nombre: string; codigo: string };
    talle: string;
    color: string;
    cantidad: number;
    referencia_tipo: string;
    referencia_id: string;
    usuario?: { nombre: string };
}

export const StockMovementsList: React.FC = () => {
    const [movements, setMovements] = useState<StockMovement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<string>('todos');

    useEffect(() => {
        fetchMovements();
    }, []);

    const fetchMovements = async () => {
        setLoading(true);
        // Traemos los movimientos y suectamos el nombre del producto y el usuario
        const { data, error } = await supabase
            .from('movimientos_stock_productos')
            .select(`
                id,
                fecha,
                tipo_movimiento,
                talle,
                color,
                cantidad,
                referencia_tipo,
                referencia_id,
                producto:productos(nombre, codigo),
                usuario:usuarios(nombre)
            `)
            .order('fecha', { ascending: false });

        if (error) {
            console.error('Error fetching stock movements:', error);
        } else {
            // Se usa "as any" porque Supabase puede inferir la relación a uno como un array en los tipos genéricos
            setMovements((data as any) || []);
        }
        setLoading(false);
    };

    const filteredMovements = movements.filter(m => {
        const matchTerm =
            m.producto?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.producto?.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.talle.toLowerCase().includes(searchTerm.toLowerCase());

        const matchType = filterType === 'todos' || m.tipo_movimiento === filterType;

        return matchTerm && matchType;
    });

    const getMovementIcon = (tipo: string) => {
        switch (tipo) {
            case 'entrada_produccion':
                return <ArrowDownRight className="w-5 h-5 text-green-500" />;
            case 'salida_venta':
                return <ArrowUpRight className="w-5 h-5 text-red-500" />;
            default:
                return <Package className="w-5 h-5 text-gray-500" />;
        }
    };

    const getMovementBadge = (tipo: string) => {
        switch (tipo) {
            case 'entrada_produccion':
                return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium border border-green-200">Producción (+ Entrada)</span>;
            case 'salida_venta':
                return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium border border-red-200">Venta (- Salida)</span>;
            case 'ajuste':
                return <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium border border-orange-200">Ajuste</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">{tipo}</span>;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Header / Filters */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por producto, color o talle..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="w-full sm:w-auto flex gap-2">
                    <select
                        className="w-full sm:w-auto px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="todos">Todos los Movimientos</option>
                        <option value="entrada_produccion">Entradas de Producción</option>
                        <option value="salida_venta">Salidas por Venta</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4">Fecha</th>
                            <th className="px-6 py-4">Tipo</th>
                            <th className="px-6 py-4">Producto</th>
                            <th className="px-6 py-4">Talle & Color</th>
                            <th className="px-6 py-4 text-right">Cantidad</th>
                            <th className="px-6 py-4">Referencia</th>
                            <th className="px-6 py-4">Usuario</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                    <div className="flex justify-center items-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                        <span className="ml-2">Cargando historial...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : filteredMovements.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">No se encontraron movimientos de stock</p>
                                </td>
                            </tr>
                        ) : (
                            filteredMovements.map((mov) => (
                                <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-gray-600">
                                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                            <span>
                                                {format(new Date(mov.fecha), "d MMM yyyy, HH:mm", { locale: es })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {getMovementIcon(mov.tipo_movimiento)}
                                            {getMovementBadge(mov.tipo_movimiento)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-gray-900">{mov.producto?.nombre}</span>
                                            <span className="text-xs text-gray-500 font-mono">{mov.producto?.codigo}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-sm font-medium border border-gray-200">
                                                {mov.talle}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <div
                                                    className="w-3 h-3 rounded-full border shadow-sm border-gray-200"
                                                    style={{ backgroundColor: mov.color }}
                                                    title={mov.color}
                                                />
                                                <span className="text-sm text-gray-600 capitalize">{mov.color}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={clsx(
                                            "font-bold text-lg",
                                            mov.tipo_movimiento === 'entrada_produccion' ? "text-green-600" : "text-red-500"
                                        )}>
                                            {mov.tipo_movimiento === 'entrada_produccion' ? '+' : '-'}{mov.cantidad}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {mov.referencia_tipo === 'pedido' ? (
                                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded inline-flex">
                                                <FileText className="w-4 h-4 text-gray-400" />
                                                Pedido
                                            </div>
                                        ) : mov.referencia_tipo === 'lote_produccion' ? (
                                            <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded inline-flex">
                                                <Scissors className="w-4 h-4 text-gray-400" />
                                                Lote Producción
                                            </div>
                                        ) : (
                                            <span className="capitalize">{mov.referencia_tipo}</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {mov.usuario?.nombre || 'Sistema'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
