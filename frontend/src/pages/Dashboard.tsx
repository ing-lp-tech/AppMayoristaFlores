
import { Plus, Box, ShoppingCart, FileBarChart } from 'lucide-react';

export const Dashboard = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500">Ventas hoy</div>
                    <div className="text-2xl font-bold mt-2">$145,500</div>
                    <div className="text-xs text-green-600 mt-1">↑ 12% vs ayer</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500">Lotes activos</div>
                    <div className="text-2xl font-bold mt-2">3</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500">Alertas stock</div>
                    <div className="text-2xl font-bold text-red-600 mt-2">2</div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500">Deudas por pagar</div>
                    <div className="text-2xl font-bold mt-2">$67,000</div>
                </div>
            </div>

            {/* Lotes en producción */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold mb-4">🏭 Producción en Curso</h2>
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50/50 rounded-lg border border-blue-100 gap-4">
                        <div>
                            <div className="font-semibold text-gray-900">OP-001 - Jeans Negro</div>
                            <div className="text-sm text-gray-500">1,000 unidades • Taller Lavado</div>
                        </div>
                        <div className="flex-1 sm:max-w-xs">
                            <div className="flex justify-between text-xs mb-1">
                                <span>Progreso</span>
                                <span>75%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Acciones rápidas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Nuevo Lote', icon: Plus },
                    { label: 'Inventario', icon: Box },
                    { label: 'Registrar Venta', icon: ShoppingCart },
                    { label: 'Reportes', icon: FileBarChart }
                ].map((action) => (
                    <button key={action.label} className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col items-center justify-center gap-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50">
                        <action.icon className="h-8 w-8" />
                        <span className="font-medium">{action.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};
