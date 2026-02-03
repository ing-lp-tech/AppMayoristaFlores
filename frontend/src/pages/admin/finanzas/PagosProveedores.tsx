import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { pagosService, comprasService, type Pago, type CreatePagoInput, type Compra } from '../../../services/finanzasService';
import { duenoService, type Dueno, getDuenoNombreCompleto } from '../../../services/duenoService';

export const PagosProveedores = () => {
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [compras, setCompras] = useState<Compra[]>([]);
    const [duenos, setDuenos] = useState<Dueno[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [formData, setFormData] = useState<CreatePagoInput>({
        compra_id: '',
        dueno_id: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        monto: 0,
        metodo_pago: 'efectivo',
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [pagosData, comprasData, duenosData] = await Promise.all([
                pagosService.getAll(),
                comprasService.getAll(undefined, { estado: 'pendiente' }),
                duenoService.getAll(),
            ]);
            setPagos(pagosData);
            setCompras(comprasData.filter((c: Compra) => c.monto_pendiente > 0));
            setDuenos(duenosData);
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await pagosService.create(formData);
            await loadData();
            setIsModalOpen(false);
        } catch (error: any) {
            alert(error.message);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
    }

    return (
        <div>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex justify-between items-center">
                <h3 className="text-lg font-semibold">Pagos a Proveedores</h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="h-5 w-5" />
                    Registrar Pago
                </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dueño</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compra</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Método</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {pagos.map((pago) => (
                            <tr key={pago.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm">{new Date(pago.fecha_pago).toLocaleDateString('es-AR')}</td>
                                <td className="px-4 py-3 text-sm">{pago.dueno && getDuenoNombreCompleto(pago.dueno)}</td>
                                <td className="px-4 py-3 text-sm">{pago.compra?.codigo_compra || 'N/A'}</td>
                                <td className="px-4 py-3 text-sm text-right font-medium">${pago.monto.toLocaleString('es-AR')}</td>
                                <td className="px-4 py-3 text-sm capitalize">{pago.metodo_pago}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full">
                        <div className="p-6 border-b">
                            <h2 className="text-2xl font-bold">Registrar Pago</h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Compra Pendiente *</label>
                                <select
                                    required
                                    value={formData.compra_id}
                                    onChange={(e) => setFormData({ ...formData, compra_id: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="">Seleccionar...</option>
                                    {compras.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.codigo_compra} - Pendiente: ${c.monto_pendiente.toLocaleString('es-AR')}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Dueño que Paga *</label>
                                <select
                                    required
                                    value={formData.dueno_id}
                                    onChange={(e) => setFormData({ ...formData, dueno_id: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="">Seleccionar...</option>
                                    {duenos.map((d) => (
                                        <option key={d.id} value={d.id}>{getDuenoNombreCompleto(d)}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Fecha de Pago *</label>
                                <input
                                    type="date"
                                    required
                                    value={formData.fecha_pago}
                                    onChange={(e) => setFormData({ ...formData, fecha_pago: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Monto *</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.monto}
                                    onChange={(e) => setFormData({ ...formData, monto: parseFloat(e.target.value) })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Método de Pago *</label>
                                <select
                                    required
                                    value={formData.metodo_pago}
                                    onChange={(e) => setFormData({ ...formData, metodo_pago: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg"
                                >
                                    <option value="efectivo">Efectivo</option>
                                    <option value="transferencia">Transferencia</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="tarjeta">Tarjeta</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-lg">Cancelar</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Registrar Pago</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
