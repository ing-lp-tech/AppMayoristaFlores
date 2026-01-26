import { X, Package, MapPin, Calendar, DollarSign, User, Phone, Mail, Edit2, Trash2 } from 'lucide-react';
import type { Pedido } from '../../types/index';
import { supabase } from '../../lib/supabase';
import { useState } from 'react';

interface PedidoDetailModalProps {
    pedido: Pedido;
    onClose: () => void;
    onUpdate: () => void;
}

export const PedidoDetailModal = ({ pedido, onClose, onUpdate }: PedidoDetailModalProps) => {
    const [editingEstado, setEditingEstado] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState(pedido.estado);
    const [deleting, setDeleting] = useState(false);

    const handleUpdateEstado = async () => {
        try {
            const { error } = await supabase
                .from('pedidos')
                .update({ estado: nuevoEstado })
                .eq('id', pedido.id);

            if (error) throw error;

            setEditingEstado(false);
            onUpdate();
        } catch (error) {
            console.error('Error updating estado:', error);
            alert('Error al actualizar el estado del pedido');
        }
    };

    const handleDelete = async () => {
        if (!confirm('¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.')) {
            return;
        }

        setDeleting(true);
        try {
            // Delete order items first (foreign key constraint)
            if (pedido.tipo_cliente_pedido === 'mayorista') {
                await supabase.from('pedido_items_mayorista').delete().eq('pedido_id', pedido.id);
            } else {
                await supabase.from('pedido_items_minorista').delete().eq('pedido_id', pedido.id);
            }

            // Delete the order
            const { error } = await supabase.from('pedidos').delete().eq('id', pedido.id);
            if (error) throw error;

            onUpdate();
            onClose();
        } catch (error) {
            console.error('Error deleting pedido:', error);
            alert('Error al eliminar el pedido');
        } finally {
            setDeleting(false);
        }
    };

    const itemsToShow = pedido.tipo_cliente_pedido === 'mayorista'
        ? pedido.items_mayorista || []
        : pedido.items_minorista || [];

    const estadoColors: Record<string, string> = {
        'pendiente': 'bg-yellow-100 text-yellow-800',
        'confirmado': 'bg-blue-100 text-blue-800',
        'en_preparacion': 'bg-purple-100 text-purple-800',
        'enviado': 'bg-indigo-100 text-indigo-800',
        'entregado': 'bg-green-100 text-green-800',
        'cancelado': 'bg-red-100 text-red-800'
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black mb-1">Pedido #{pedido.codigo_pedido}</h2>
                        <p className="text-blue-100 text-sm">
                            {pedido.tipo_cliente_pedido === 'mayorista' ? '🏢 Mayorista' : '🛍️ Minorista'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Client & Order Info - Mobile First Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-600" />
                                Información del Cliente
                            </h3>
                            <div className="space-y-2 text-sm">
                                <p className="flex items-center gap-2">
                                    <span className="font-semibold text-gray-600">Nombre:</span>
                                    <span className="text-gray-900">{pedido.cliente_nombre}</span>
                                </p>
                                {pedido.cliente_email && (
                                    <p className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">{pedido.cliente_email}</span>
                                    </p>
                                )}
                                <p className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-700">{pedido.cliente_telefono}</span>
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-blue-600" />
                                Dirección de Envío
                            </h3>
                            <div className="space-y-1 text-sm">
                                <p className="text-gray-900">{pedido.direccion_envio}</p>
                                <p className="text-gray-700">{pedido.ciudad_envio}</p>
                            </div>
                        </div>
                    </div>

                    {/* Estado & Fecha */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-xl p-4">
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Edit2 className="h-5 w-5 text-blue-600" />
                                Estado del Pedido
                            </h3>
                            {editingEstado ? (
                                <div className="space-y-3">
                                    <select
                                        value={nuevoEstado}
                                        onChange={(e) => setNuevoEstado(e.target.value as any)}
                                        className="w-full rounded-lg border-gray-200 text-sm font-medium"
                                    >
                                        <option value="pendiente">Pendiente</option>
                                        <option value="confirmado">Confirmado</option>
                                        <option value="en_preparacion">En Preparación</option>
                                        <option value="enviado">Enviado</option>
                                        <option value="entregado">Entregado</option>
                                        <option value="cancelado">Cancelado</option>
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleUpdateEstado}
                                            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700"
                                        >
                                            Guardar
                                        </button>
                                        <button
                                            onClick={() => setEditingEstado(false)}
                                            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg text-sm font-bold hover:bg-gray-300"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase ${estadoColors[pedido.estado]}`}>
                                        {pedido.estado.replace('_', ' ')}
                                    </span>
                                    <button
                                        onClick={() => setEditingEstado(true)}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-semibold flex items-center gap-1"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                        Editar
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4">
                            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" />
                                Fecha
                            </h3>
                            <p className="text-sm text-gray-700">
                                {new Date(pedido.creado_en).toLocaleString('es-AR', {
                                    dateStyle: 'long',
                                    timeStyle: 'short'
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="bg-gray-50 rounded-xl p-4">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            Items del Pedido ({itemsToShow.length})
                        </h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {pedido.tipo_cliente_pedido === 'mayorista' ? (
                                pedido.items_mayorista?.map((item, idx) => (
                                    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-gray-900 text-sm">
                                                Producto ID: {item.producto_id.substring(0, 8)}...
                                            </span>
                                            <span className="text-blue-600 font-bold text-sm">
                                                ${item.subtotal.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <p>Curva: {item.nombre_curva}</p>
                                            <p>Cantidad de curvas: {item.cantidad_curvas}</p>
                                            <p>Talles: {item.talles_incluidos?.join(', ') || 'N/A'}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                pedido.items_minorista?.map((item, idx) => (
                                    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="font-bold text-gray-900 text-sm block">
                                                    Producto ID: {item.producto_id.substring(0, 8)}...
                                                </span>
                                                <span className="text-xs text-gray-600">
                                                    Talle: {item.talle_id} • Cantidad: {item.cantidad}
                                                </span>
                                            </div>
                                            <span className="text-blue-600 font-bold text-sm">
                                                ${item.subtotal.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 text-white">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <DollarSign className="h-6 w-6" />
                                <span className="text-lg font-bold">Total del Pedido</span>
                            </div>
                            <span className="text-3xl font-black">
                                ${pedido.total.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Delete Button */}
                    <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        {deleting ? 'Eliminando...' : 'Eliminar Pedido'}
                    </button>
                </div>
            </div>
        </div>
    );
};
