import { useState, useEffect } from 'react';
import { Plus, Filter, Trash2, Upload, X, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import {
    comprasService,
    type Compra,
    type CreateCompraInput,
    type EstadoPago,
} from '../../../services/finanzasService';
import { duenoService, type Dueno, getDuenoNombreCompleto } from '../../../services/duenoService';
import { proveedorService } from '../../../services/proveedorService';
import type { Proveedor } from '../../../types';

export const ComprasProveedores = () => {
    const [compras, setCompras] = useState<Compra[]>([]);
    const [duenos, setDuenos] = useState<Dueno[]>([]);
    const [proveedores, setProveedores] = useState<Proveedor[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterDueno, setFilterDueno] = useState<string>('');
    const [filterEstado, setFilterEstado] = useState<EstadoPago | ''>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState<CreateCompraInput>({
        dueno_id: '',
        proveedor_id: '',
        fecha_compra: new Date().toISOString().split('T')[0],
        monto_total: 0,
        descripcion: '',
        notas: '',
    });

    useEffect(() => {
        loadData();
    }, [filterDueno, filterEstado]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [comprasData, duenosData, proveedoresData] = await Promise.all([
                comprasService.getAll(filterDueno || undefined, {
                    estado: filterEstado || undefined,
                }),
                duenoService.getAll(),
                proveedorService.getAll(),
            ]);
            setCompras(comprasData);
            setDuenos(duenosData);
            setProveedores(proveedoresData);
        } catch (error: any) {
            console.error('Error loading data:', error);
            alert(error.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setUploading(true);

        try {
            let comprobanteUrl = '';

            // Si hay archivo, subirlo a Storage primero
            if (selectedFile) {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${formData.dueno_id}/${Date.now()}.${fileExt}`;

                const { error } = await supabase.storage
                    .from('comprobantes')
                    .upload(fileName, selectedFile, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (error) {
                    console.error('Error uploading file:', error);
                    throw new Error(`Error al subir archivo: ${error.message}`);
                }

                // Obtener URL pública
                const { data: urlData } = supabase.storage
                    .from('comprobantes')
                    .getPublicUrl(fileName);

                comprobanteUrl = urlData.publicUrl;
            }

            // Crear compra con URL del comprobante
            await comprasService.create({
                ...formData,
                comprobante_url: comprobanteUrl || undefined
            });

            await loadData();
            setIsModalOpen(false);
            resetForm();
        } catch (error: any) {
            alert(error.message || 'Error al crear compra');
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            dueno_id: '',
            proveedor_id: '',
            fecha_compra: new Date().toISOString().split('T')[0],
            monto_total: 0,
            descripcion: '',
            notas: '',
        });
        setSelectedFile(null);
        setPreviewUrl('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);

            // Crear preview para imágenes
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setPreviewUrl(reader.result as string);
                };
                reader.readAsDataURL(file);
            } else {
                setPreviewUrl('');
            }
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setPreviewUrl('');
    };

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar esta compra?')) return;
        try {
            await comprasService.delete(id);
            await loadData();
        } catch (error: any) {
            alert(error.message || 'Error al eliminar compra');
        }
    };

    const getEstadoBadge = (estado: EstadoPago) => {
        const styles: Record<EstadoPago, string> = {
            pendiente: 'bg-red-100 text-red-800',
            parcial: 'bg-yellow-100 text-yellow-800',
            pagado: 'bg-green-100 text-green-800',
        };
        const labels: Record<EstadoPago, string> = {
            pendiente: 'Pendiente',
            parcial: 'Parcial',
            pagado: 'Pagado',
        };
        return (
            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[estado]}`}>
                {labels[estado]}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                    <div className="flex gap-3 items-center flex-wrap">
                        <Filter className="h-5 w-5 text-gray-400" />

                        {/* Filter by Dueno */}
                        <select
                            value={filterDueno}
                            onChange={(e) => setFilterDueno(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos los Dueños</option>
                            {duenos.map((d) => (
                                <option key={d.id} value={d.id}>
                                    {getDuenoNombreCompleto(d)}
                                </option>
                            ))}
                        </select>

                        {/* Filter by Estado */}
                        <select
                            value={filterEstado}
                            onChange={(e) => setFilterEstado(e.target.value as EstadoPago | '')}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="">Todos los Estados</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="parcial">Parcial</option>
                            <option value="pagado">Pagado</option>
                        </select>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Nueva Compra
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dueño</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Proveedor</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Comprobante</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto Total</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pagado</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Pendiente</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {compras.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                                        No hay compras registradas
                                    </td>
                                </tr>
                            ) : (
                                compras.map((compra) => (
                                    <tr key={compra.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{compra.codigo_compra}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {new Date(compra.fecha_compra).toLocaleDateString('es-AR')}
                                        </td>
                                        <td className="px-4 py-3">
                                            {compra.dueno && (
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                                        style={{ backgroundColor: compra.dueno.color_identificador }}
                                                    >
                                                        {compra.dueno.nombre[0]}
                                                    </div>
                                                    <span className="text-sm text-gray-900">{getDuenoNombreCompleto(compra.dueno)}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {compra.proveedor?.nombre || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {compra.comprobante_url ? (
                                                <a
                                                    href={compra.comprobante_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                                    title="Ver comprobante"
                                                >
                                                    <ImageIcon className="h-4 w-4" />
                                                    <span className="hidden sm:inline">Ver archivo</span>
                                                </a>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Sin archivo</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                            ${compra.monto_total.toLocaleString('es-AR')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-900">
                                            ${compra.monto_pagado.toLocaleString('es-AR')}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-medium text-red-600">
                                            ${compra.monto_pendiente.toLocaleString('es-AR')}
                                        </td>
                                        <td className="px-4 py-3">{getEstadoBadge(compra.estado_pago)}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => handleDelete(compra.id)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Nueva Compra */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-2xl font-bold text-gray-900">Nueva Compra</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dueño *</label>
                                    <select
                                        required
                                        value={formData.dueno_id}
                                        onChange={(e) => setFormData({ ...formData, dueno_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar...</option>
                                        {duenos.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {getDuenoNombreCompleto(d)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Proveedor *
                                    </label>
                                    <select
                                        required
                                        value={formData.proveedor_id}
                                        onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar Proveedor...</option>
                                        {proveedores.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.nombre} ({p.tipo})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.fecha_compra}
                                        onChange={(e) => setFormData({ ...formData, fecha_compra: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total *</label>
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.monto_total}
                                        onChange={(e) => setFormData({ ...formData, monto_total: parseFloat(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                    <textarea
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                                    <textarea
                                        value={formData.notas}
                                        onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {/* Upload de Comprobante - Mobile First */}
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Comprobante (Foto/PDF)
                                    </label>

                                    {!selectedFile ? (
                                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors active:bg-blue-100">
                                            <div className="flex flex-col items-center justify-center gap-2 py-6">
                                                <Upload className="h-8 w-8 text-gray-400" />
                                                <p className="text-sm text-gray-600 font-medium">Toca para seleccionar</p>
                                                <p className="text-xs text-gray-500">Imágenes o PDF</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/*,application/pdf"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                    ) : (
                                        <div className="relative border-2 border-gray-300 rounded-lg p-4">
                                            {previewUrl ? (
                                                <div className="flex items-center gap-3">
                                                    <img
                                                        src={previewUrl}
                                                        alt="Preview"
                                                        className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {selectedFile.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3">
                                                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                                        <ImageIcon className="h-8 w-8 text-gray-400" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-900 truncate">
                                                            {selectedFile.name}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {(selectedFile.size / 1024).toFixed(1)} KB
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={removeFile}
                                                className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 justify-center"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Subiendo...
                                        </>
                                    ) : (
                                        'Crear Compra'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
