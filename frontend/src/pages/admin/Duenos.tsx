import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Power } from 'lucide-react';
import { duenoService, type Dueno, type CreateDuenoInput, getDuenoNombreCompleto, formatDNI } from '../../services/duenoService';

export const Duenos = () => {
    const [duenos, setDuenos] = useState<Dueno[]>([]);
    const [filteredDuenos, setFilteredDuenos] = useState<Dueno[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDueno, setEditingDueno] = useState<Dueno | null>(null);

    // Form state
    const [formData, setFormData] = useState<CreateDuenoInput>({
        nombre: '',
        apellido: '',
        dni: '',
        telefono_whatsapp: '',
        email: '',
        porcentaje_participacion: undefined,
        fecha_incorporacion: new Date().toISOString().split('T')[0],
        notas: '',
    });

    useEffect(() => {
        loadDuenos();
    }, [showInactive]);

    useEffect(() => {
        filterDuenos();
    }, [searchTerm, duenos]);

    const loadDuenos = async () => {
        try {
            setLoading(true);
            const data = await duenoService.getAll(showInactive);
            setDuenos(data);
            setFilteredDuenos(data);
        } catch (error: any) {
            console.error('Error loading duenos:', error);
            alert(error.message || 'Error al cargar dueños');
        } finally {
            setLoading(false);
        }
    };

    const filterDuenos = () => {
        if (!searchTerm.trim()) {
            setFilteredDuenos(duenos);
            return;
        }

        const term = searchTerm.toLowerCase();
        const filtered = duenos.filter(
            (d) =>
                d.nombre.toLowerCase().includes(term) ||
                d.apellido.toLowerCase().includes(term) ||
                d.dni.includes(term)
        );
        setFilteredDuenos(filtered);
    };

    const handleOpenModal = (dueno?: Dueno) => {
        if (dueno) {
            setEditingDueno(dueno);
            setFormData({
                nombre: dueno.nombre,
                apellido: dueno.apellido,
                dni: dueno.dni,
                telefono_whatsapp: dueno.telefono_whatsapp,
                email: dueno.email || '',
                porcentaje_participacion: dueno.porcentaje_participacion,
                fecha_incorporacion: dueno.fecha_incorporacion || new Date().toISOString().split('T')[0],
                notas: dueno.notas || '',
                color_identificador: dueno.color_identificador,
            });
        } else {
            setEditingDueno(null);
            setFormData({
                nombre: '',
                apellido: '',
                dni: '',
                telefono_whatsapp: '',
                email: '',
                porcentaje_participacion: undefined,
                fecha_incorporacion: new Date().toISOString().split('T')[0],
                notas: '',
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDueno(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingDueno) {
                await duenoService.update(editingDueno.id, formData);
            } else {
                await duenoService.create(formData);
            }
            await loadDuenos();
            handleCloseModal();
        } catch (error: any) {
            alert(error.message || 'Error al guardar dueño');
        }
    };

    const handleToggleActive = async (dueno: Dueno) => {
        if (
            !confirm(
                `¿Estás seguro de ${dueno.activo ? 'desactivar' : 'activar'} a ${getDuenoNombreCompleto(dueno)}?`
            )
        ) {
            return;
        }

        try {
            await duenoService.toggleActive(dueno.id, !dueno.activo);
            await loadDuenos();
        } catch (error: any) {
            alert(error.message || 'Error al cambiar estado');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Users className="h-8 w-8 text-blue-600" />
                    <h1 className="text-3xl font-bold text-gray-900">Dueños/Socios</h1>
                </div>
                <p className="text-gray-600">Gestiona los dueños y socios de la tienda</p>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    {/* Search */}
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, apellido o DNI..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    <div className="flex gap-3">
                        {/* Toggle inactive */}
                        <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                            <input
                                type="checkbox"
                                checked={showInactive}
                                onChange={(e) => setShowInactive(e.target.checked)}
                                className="rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">Mostrar inactivos</span>
                        </label>

                        {/* Add button */}
                        <button
                            onClick={() => handleOpenModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            Agregar Dueño
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dueño
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    DNI
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contacto
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Participación
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredDuenos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        {searchTerm ? 'No se encontraron dueños con ese criterio' : 'No hay dueños registrados'}
                                    </td>
                                </tr>
                            ) : (
                                filteredDuenos.map((dueno) => (
                                    <tr key={dueno.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                                                    style={{ backgroundColor: dueno.color_identificador }}
                                                >
                                                    {dueno.nombre[0]}
                                                    {dueno.apellido[0]}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900">{getDuenoNombreCompleto(dueno)}</div>
                                                    {dueno.email && <div className="text-sm text-gray-500">{dueno.email}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{formatDNI(dueno.dni)}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">{dueno.telefono_whatsapp}</td>
                                        <td className="px-6 py-4 text-sm text-gray-900">
                                            {dueno.porcentaje_participacion ? `${dueno.porcentaje_participacion}%` : '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${dueno.activo
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                    }`}
                                            >
                                                {dueno.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(dueno)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(dueno)}
                                                    className={`p-2 rounded-lg transition-colors ${dueno.activo
                                                        ? 'text-red-600 hover:bg-red-50'
                                                        : 'text-green-600 hover:bg-green-50'
                                                        }`}
                                                    title={dueno.activo ? 'Desactivar' : 'Activar'}
                                                >
                                                    <Power className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingDueno ? 'Editar Dueño' : 'Nuevo Dueño'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Apellido *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.apellido}
                                        onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.dni}
                                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        minLength={7}
                                        maxLength={10}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono/WhatsApp *
                                    </label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.telefono_whatsapp}
                                        onChange={(e) => setFormData({ ...formData, telefono_whatsapp: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        % Participación
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={formData.porcentaje_participacion || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                porcentaje_participacion: e.target.value ? parseFloat(e.target.value) : undefined,
                                            })
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Fecha de Incorporación
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.fecha_incorporacion}
                                        onChange={(e) => setFormData({ ...formData, fecha_incorporacion: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                    <textarea
                                        value={formData.notas}
                                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    {editingDueno ? 'Guardar Cambios' : 'Crear Dueño'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
