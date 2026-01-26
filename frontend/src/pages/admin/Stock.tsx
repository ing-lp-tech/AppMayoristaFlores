import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Package, Search, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

export const Stock = () => {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        setLoading(true);
        // Fetch products with their breakdown (producto_talles)
        // Note: Assuming 'producto_talles' is the relation name. If not, we might need to adjust.
        const { data, error } = await supabase
            .from('productos')
            .select(`
                *,
                talles:producto_talles(*),
                categoria:categorias(nombre)
            `)
            .order('nombre');

        if (error) {
            console.error('Error fetching stock:', error);
        } else {
            setProducts(data || []);
        }
        setLoading(false);
    };

    const toggleExpand = (id: string) => {
        setExpandedProductId(expandedProductId === id ? null : id);
    };

    const filteredProducts = products.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Package className="text-blue-600" />
                    Control de Stock
                </h1>
                <p className="text-gray-500">Visualice el stock actual por producto, talle y variante.</p>
            </div>

            {/* Search */}
            <div className="mb-6 relative max-w-md">
                <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4">Categoría</th>
                                    <th className="px-6 py-4 text-center">Stock Total</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredProducts.map(product => (
                                    <React.Fragment key={product.id}>
                                        <tr
                                            className={`hover:bg-gray-50 transition-colors cursor-pointer ${expandedProductId === product.id ? 'bg-blue-50/30' : ''}`}
                                            onClick={() => toggleExpand(product.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <div>
                                                    <div className="font-bold text-gray-900">{product.nombre}</div>
                                                    <div className="text-xs text-gray-500">COD: {product.codigo}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {product.categoria?.nombre || "Sin Categoría"}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-mono font-bold text-lg text-blue-700">
                                                    {product.stock_total || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {product.stock_total <= (product.stock_minimo || 10) ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <AlertCircle className="w-3 h-3" /> Bajo
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Normal
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {expandedProductId === product.id ? (
                                                    <ChevronUp className="w-5 h-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="w-5 h-5 text-gray-400" />
                                                )}
                                            </td>
                                        </tr>

                                        {/* Expanded Detail Row */}
                                        {expandedProductId === product.id && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={5} className="px-6 py-4">
                                                    <div className="pl-4 border-l-2 border-blue-200">
                                                        <h4 className="text-sm font-bold text-gray-700 mb-3">Detalle por Talle y Color</h4>

                                                        {!product.talles || product.talles.length === 0 ? (
                                                            <div className="text-sm text-gray-500 italic">
                                                                No hay desglose de talles registrado para este producto.
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                                                {product.talles
                                                                    .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
                                                                    .map((talle: any) => (
                                                                        <div key={talle.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-center">
                                                                            <div className="text-xs text-gray-500 font-bold uppercase mb-1">{talle.talla_nombre}</div>
                                                                            <div className={`text-xl font-bold ${talle.stock < (talle.stock_minimo || 5) ? 'text-red-600' : 'text-gray-800'}`}>
                                                                                {talle.stock}
                                                                            </div>
                                                                            <div className="text-[10px] text-gray-400">unids.</div>
                                                                        </div>
                                                                    ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}

                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                            No se encontraron productos.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
