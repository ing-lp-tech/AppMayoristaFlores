import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Producto, RolloTela, Insumo } from '../../types';
import { Calculator, DollarSign } from 'lucide-react';
import clsx from 'clsx';

export const Costos = () => {
    const [products, setProducts] = useState<Producto[]>([]);
    const [telas, setTelas] = useState<RolloTela[]>([]);
    const [insumos, setInsumos] = useState<Insumo[]>([]);

    // Selection
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [selectedTelaId, setSelectedTelaId] = useState<string>('');

    // Calculation State
    const [laborCost, setLaborCost] = useState<number>(0);
    const [marginPercent, setMarginPercent] = useState<number>(50); // 50% default

    // Result
    const [calculatedCost, setCalculatedCost] = useState<number>(0);
    const [calculatedPrice, setCalculatedPrice] = useState<number>(0);

    useEffect(() => {
        const fetchAll = async () => {
            const [p, t, i] = await Promise.all([
                supabase.from('productos').select('*'),
                supabase.from('rollos_tela').select('*').gt('metros_restantes', 0),
                supabase.from('insumos').select('*')
            ]);
            setProducts(p.data || []);
            setTelas(t.data || []);
            setInsumos(i.data || []);
        };
        fetchAll();
    }, []);

    const selectedProduct = products.find(p => p.id === selectedProductId);
    const selectedTela = telas.find(t => t.id === selectedTelaId);

    // Auto-calculate whenever inputs change
    useEffect(() => {
        if (!selectedProduct || !selectedTela) return;

        const specs = selectedProduct.especificaciones || {};
        const consumoTela = specs.consumo_tela || 0; // meters per unit

        // 1. Fabric Cost
        const fabricCost = consumoTela * (selectedTela.costo_por_metro || 0);

        // 2. Supplies Cost
        let suppliesCost = 0;
        // Logic: specifications.insumos typically store [{insumo_id, cantidad}]
        // Simplified here: Assuming specifications has detailed logic, or we sum standard
        // For MVP, we'll just sum a flat rate or iterate if structure matches
        // Let's assume specs.insumos is an array of IDs for now to keep it simple, or improved logic:
        // Actually, let's assume specs.insumos = [{id: '...', cantidad: 2}]
        if (specs.insumos && Array.isArray(specs.insumos)) {
            specs.insumos.forEach((item: any) => {
                const insumo = insumos.find(i => i.id === item.id);
                if (insumo) {
                    suppliesCost += (insumo.costo_unitario || 0) * (item.cantidad || 1);
                }
            });
        }

        // 3. Total Direct Cost
        const total = fabricCost + suppliesCost + laborCost;
        setCalculatedCost(total);

        // 4. Suggested Price
        const price = total / ((100 - marginPercent) / 100);
        setCalculatedPrice(price);

    }, [selectedProduct, selectedTela, laborCost, marginPercent, insumos]);

    const handleSaveCost = async () => {
        if (!selectedProductId) return;
        try {
            const { error } = await supabase
                .from('productos')
                .update({
                    costo_estimado: calculatedCost,
                    precio_minorista: Math.ceil(calculatedPrice / 100) * 100 // Round to nearest 100
                })
                .eq('id', selectedProductId);

            if (error) throw error;
            alert('Costo y Precio actualizados en el producto!');
        } catch (error) {
            console.error(error);
            alert('Error al guardar');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center md:text-left">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-blue-600" />
                    Calculadora de Costos
                </h1>
                <p className="text-gray-500">
                    Estima el costo real de producción basado en el consumo de tela, insumos y mano de obra.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Configuration Panel */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                    <h2 className="font-bold text-lg border-b pb-2">Configuración</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Producto Base</label>
                        <select
                            className="w-full border rounded-lg p-2"
                            value={selectedProductId}
                            onChange={e => setSelectedProductId(e.target.value)}
                        >
                            <option value="">Seleccionar Producto...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
                            ))}
                        </select>
                        {selectedProduct && (
                            <p className="text-xs text-gray-500 mt-1">
                                Consumo: {selectedProduct.especificaciones?.consumo_tela || 0}m
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tela a Utilizar</label>
                        <select
                            className="w-full border rounded-lg p-2"
                            value={selectedTelaId}
                            onChange={e => setSelectedTelaId(e.target.value)}
                        >
                            <option value="">Seleccionar Rollo...</option>
                            {telas.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.tipo_tela} - {t.color} (${t.costo_por_metro}/m)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Costo Mano de Obra (Corte + Confección)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                            <input
                                type="number"
                                className="w-full border rounded-lg p-2 pl-8"
                                value={laborCost}
                                onChange={e => setLaborCost(Number(e.target.value))}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Margen de Ganancia Deseado (%)</label>
                        <input
                            type="number"
                            className="w-full border rounded-lg p-2"
                            value={marginPercent}
                            onChange={e => setMarginPercent(Number(e.target.value))}
                        />
                    </div>
                </div>

                {/* Results Panel */}
                <div className={clsx(
                    "bg-gray-50 p-6 rounded-xl shadow-inner border border-gray-200 space-y-6 flex flex-col justify-center",
                    (!selectedProduct || !selectedTela) && "opacity-50 pointer-events-none"
                )}>
                    <div>
                        <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Costo Unitario Total</p>
                        <p className="text-4xl font-bold text-gray-900 mt-2">
                            ${calculatedCost.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Incluye tela, insumos y mano de obra</p>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500 uppercase tracking-wide font-bold">Precio Sugerido (Público)</p>
                        <p className="text-3xl font-bold text-green-600 mt-2">
                            ${calculatedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            Para obtener un margen del {marginPercent}%
                        </p>
                    </div>

                    <button
                        onClick={handleSaveCost}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 transition-transform active:scale-95 flex items-center justify-center gap-2"
                    >
                        <DollarSign className="h-5 w-5" />
                        Aplicar Precio al Producto
                    </button>
                </div>
            </div>

            {/* Breakdown */}
            {selectedProduct && selectedTela && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-4">Desglose de Costos</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                            <span>Tela ({selectedProduct.especificaciones?.consumo_tela}m x ${selectedTela.costo_por_metro})</span>
                            <span className="font-medium">${((selectedProduct.especificaciones?.consumo_tela || 0) * selectedTela.costo_por_metro).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                            <span>Insumos (Estimado)</span>
                            <span className="font-medium">${(calculatedCost - laborCost - ((selectedProduct.especificaciones?.consumo_tela || 0) * selectedTela.costo_por_metro)).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-2 hover:bg-gray-50 rounded">
                            <span>Mano de Obra</span>
                            <span className="font-medium">${laborCost.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between p-2 bg-gray-100 rounded font-bold mt-2">
                            <span>TOTAL</span>
                            <span>${calculatedCost.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
