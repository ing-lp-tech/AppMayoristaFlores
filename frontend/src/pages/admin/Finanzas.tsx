import { useState } from 'react';
import { DollarSign, ShoppingCart, CreditCard, TrendingDown, PiggyBank, BarChart3 } from 'lucide-react';
import { ComprasProveedores } from './finanzas/ComprasProveedores';
import { PagosProveedores } from './finanzas/PagosProveedores';
import { GastosOperativos } from './finanzas/GastosOperativos';
import { AportesRetiros } from './finanzas/AportesRetiros';
import { ReportesFinancieros } from './finanzas/ReportesFinancieros';

type Tab = 'compras' | 'pagos' | 'gastos' | 'aportes' | 'reportes';

export const Finanzas = () => {
    const [activeTab, setActiveTab] = useState<Tab>('compras');

    const tabs = [
        { id: 'compras' as Tab, label: 'Compras', icon: ShoppingCart },
        { id: 'pagos' as Tab, label: 'Pagos', icon: CreditCard },
        { id: 'gastos' as Tab, label: 'Gastos', icon: TrendingDown },
        { id: 'aportes' as Tab, label: 'Aportes/Retiros', icon: PiggyBank },
        { id: 'reportes' as Tab, label: 'Reportes', icon: BarChart3 },
    ];

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <DollarSign className="h-8 w-8 text-green-600" />
                    <h1 className="text-3xl font-bold text-gray-900">Finanzas</h1>
                </div>
                <p className="text-gray-600">Gestión financiera completa por dueño</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm mb-6">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${activeTab === tab.id
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className="h-5 w-5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Tab Content */}
            <div>
                {activeTab === 'compras' && <ComprasProveedores />}
                {activeTab === 'pagos' && <PagosProveedores />}
                {activeTab === 'gastos' && <GastosOperativos />}
                {activeTab === 'aportes' && <AportesRetiros />}
                {activeTab === 'reportes' && <ReportesFinancieros />}
            </div>
        </div>
    );
};
