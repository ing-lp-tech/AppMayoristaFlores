import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { CuponDescuento } from '../../types';
import { Ticket, Plus, Trash2, Clock, Percent } from 'lucide-react';

export default function Cupones() {
    const [cupones, setCupones] = useState<CuponDescuento[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    // Form states
    const [codigo, setCodigo] = useState('');
    const [descuento, setDescuento] = useState(10);
    const [duracionHoras, setDuracionHoras] = useState(3);
    const [duracionMinutos, setDuracionMinutos] = useState(0);

    const fetchCupones = async () => {
        try {
            const { data, error } = await supabase
                .from('cupones_descuento')
                .select('*')
                .order('creado_en', { ascending: false });

            if (error) throw error;
            setCupones(data || []);
        } catch (error) {
            console.error('Error fetching cupones:', error);
            alert('Error al cargar cupones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCupones();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!codigo || descuento <= 0 || (duracionHoras === 0 && duracionMinutos === 0)) {
            alert('Por favor completa todos los campos correctamente');
            return;
        }

        const ahora = new Date();
        const expiracion = new Date(ahora.getTime() + (duracionHoras * 60 + duracionMinutos) * 60000);

        try {
            const { error } = await supabase
                .from('cupones_descuento')
                .insert({
                    codigo: codigo.toUpperCase(),
                    descuento_porcentaje: descuento,
                    fecha_expiracion: expiracion.toISOString(),
                    activo: true
                });

            if (error) {
                if (error.code === '23505') {
                    throw new Error('Ya existe un cupón con este código');
                }
                throw error;
            }

            setCodigo('');
            setIsCreating(false);
            fetchCupones();
        } catch (err: any) {
            console.error('Error creating cupon:', err);
            alert(err.message || 'Error al crear el cupón');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cupón?')) return;
        try {
            const { error } = await supabase
                .from('cupones_descuento')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchCupones();
        } catch (error) {
            console.error('Error deleting cupon:', error);
            alert('Error al eliminar');
        }
    };

    const toggleActivo = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('cupones_descuento')
                .update({ activo: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            fetchCupones();
        } catch (error) {
            console.error('Error updating cupon:', error);
            alert('Error al actualizar estado');
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando cupones...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                        <Ticket className="h-6 w-6 text-indigo-600" />
                        Cupones de Descuento
                    </h1>
                    <p className="text-gray-500 mt-1">Gstiona los cupones temporales para tus clientes</p>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Cupón
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-100 relative">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Crear Nuevo Cupón</h2>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Código</label>
                            <input
                                type="text"
                                required
                                value={codigo}
                                onChange={e => setCodigo(e.target.value.toUpperCase())}
                                placeholder="EJ: OFERTA20"
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 uppercase"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">Descuento (%)</label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    max="100"
                                    value={descuento}
                                    onChange={e => setDescuento(Number(e.target.value))}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Horas</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={duracionHoras}
                                    onChange={e => setDuracionHoras(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Minutos</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={duracionMinutos}
                                    onChange={e => setDuracionMinutos(Number(e.target.value))}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors"
                            >
                                Guardar
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsCreating(false)}
                                className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200"
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Código</th>
                            <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Descuento</th>
                            <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Expira en</th>
                            <th className="px-6 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-black text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {cupones.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                    No hay cupones creados aún.
                                </td>
                            </tr>
                        ) : (
                            cupones.map((cupon) => {
                                const expiracion = new Date(cupon.fecha_expiracion);
                                const ahora = new Date();
                                const isExpired = expiracion < ahora;

                                return (
                                    <tr key={cupon.id} className={!cupon.activo || isExpired ? 'bg-gray-50 opacity-75' : ''}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <Ticket className="h-5 w-5 text-indigo-400 mr-2" />
                                                <span className="font-black text-gray-900 border-2 border-dashed border-gray-300 px-2 py-1 rounded bg-gray-50 tracking-wider">
                                                    {cupon.codigo}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-lg font-black text-green-600">
                                                {cupon.descuento_porcentaje}%
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-600">
                                                <Clock className="h-4 w-4 mr-1 text-gray-400" />
                                                <div className="flex flex-col">
                                                    <span className={isExpired ? 'text-red-500 font-bold' : 'font-medium'}>
                                                        {expiracion.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                                                    </span>
                                                    {isExpired && <span className="text-[10px] text-red-500 uppercase font-black">Expirado</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => toggleActivo(cupon.id, cupon.activo)}
                                                className={`px-3 py-1 inline-flex text-xs leading-5 font-black rounded-full capitalize ${cupon.activo
                                                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                                                    }`}
                                            >
                                                {cupon.activo ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleDelete(cupon.id)}
                                                className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors"
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

