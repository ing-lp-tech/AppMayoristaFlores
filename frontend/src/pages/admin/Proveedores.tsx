import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Proveedor } from '../../types';
import { Plus, Search, Edit, Trash2, Phone, Mail, Building, Percent } from 'lucide-react';
import clsx from 'clsx';

// Default empty provider
const DEFAULT_PROVIDER: Partial<Proveedor> = {
    nombre: '',
    codigo: '',
    tipo: 'tela',
    telefono: '',
    email: '',
    saldo_actual: 0,
};

export const Proveedores = () => {
    const [providers, setProviders] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Proveedor>>(DEFAULT_PROVIDER);

    useEffect(() => {
        fetchProviders();
    }, []);

    const fetchProviders = async () => {
        try {
            const { data, error } = await supabase
                .from('proveedores')
                .select('*')
                .order('creado_en', { ascending: false });

            if (error) throw error;
            setProviders(data || []);
        } catch (error: any) {
            console.error('Error fetching providers:', error);
            // alert('Debug Error: ' + JSON.stringify(error)); 
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('proveedores')
                    .update(formData)
                    .eq('id', editingId);
                if (error) throw error;
                alert('Proveedor actualizado');
            } else {
                const { error } = await supabase
                    .from('proveedores')
                    .insert([{ ...formData }]);
                if (error) throw error;
                alert('Proveedor creado');
            }

            setIsModalOpen(false);
            setEditingId(null);
            setFormData(DEFAULT_PROVIDER);
            fetchProviders();
        } catch (error: any) {
            console.error('Error saving provider:', error);
            alert('Error al guardar: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este proveedor?')) return;

        try {
            const { error } = await supabase
                .from('proveedores')
                .delete()
                .eq('id', id);

            if (error) throw error;
            fetchProviders();
        } catch (error) {
            console.error('Error deleting provider:', error);
            alert('Error al eliminar');
        }
    };

    const handleEdit = (provider: Proveedor) => {
        setEditingId(provider.id);
        setFormData(provider);
        setIsModalOpen(true);
    };

    const handleAddNew = () => {
        setEditingId(null);
        setFormData(DEFAULT_PROVIDER);
        setIsModalOpen(true);
    };

    const filteredProviders = providers.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center">Cargando proveedores...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Proveedores</h1>
                    <p className="text-gray-500">Gestión de proveedores de telas, insumos y talleres</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                    Nuevo Proveedor
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProviders.map((provider) => (
                    <div key={provider.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={clsx(
                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                    provider.tipo === 'tela' ? "bg-purple-100 text-purple-600" :
                                        provider.tipo === 'insumo' ? "bg-orange-100 text-orange-600" :
                                            "bg-blue-100 text-blue-600"
                                )}>
                                    <Building className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{provider.nombre}</h3>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded uppercase">
                                        {provider.tipo}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleEdit(provider)}
                                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(provider.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                                <Percent className="h-4 w-4 text-gray-400" />
                                <span>Código: <span className="font-medium text-gray-900">{provider.codigo}</span></span>
                            </div>
                            {provider.telefono && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span>{provider.telefono}</span>
                                </div>
                            )}
                            {provider.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                    <span>{provider.email}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold text-gray-900">
                                {editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Nombre Comercial *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.nombre}
                                            onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Código Interno *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.codigo}
                                            onChange={e => setFormData({ ...formData, codigo: e.target.value })}
                                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 placeholder:text-gray-300"
                                            placeholder="EJ: PROV-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Tipo *
                                        </label>
                                        <select
                                            value={formData.tipo}
                                            onChange={e => setFormData({ ...formData, tipo: e.target.value as any })}
                                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="tela">Proveedor de Telas</option>
                                            <option value="insumo">Proveedor de Insumos</option>
                                            <option value="taller">Taller Externo</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Teléfono
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.telefono || ''}
                                            onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email || ''}
                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                    Guardar Proveedor
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
