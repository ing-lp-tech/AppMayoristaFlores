import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Package, Save, X, AlertCircle, Upload, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { productService, categoryService } from '../../services/productService';
import type { Producto, ProductoTalla, Categoria } from '../../types';

export const AdminProducts = () => {
    const [products, setProducts] = useState<(Producto & { producto_talles: ProductoTalla[] })[]>([]);
    const [categories, setCategories] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'general' | 'variantes' | 'precios'>('general');

    // Form State
    const [formData, setFormData] = useState<Partial<Producto>>({
        nombre: '',
        codigo: '',
        categoria_id: '',
        proceso_produccion_id: '',
        descripcion_publica: '',
        precio_minorista: 0,
        precio_mayorista_curva: 0,
        disponible_minorista: true,
        disponible_mayorista: true,
        imagenes: [],
        imagen_principal: '',
        curva_minima: true
    });

    const [tallesForm, setTallesForm] = useState<Omit<ProductoTalla, 'id' | 'producto_id'>[]>([
        { talla_codigo: 'S', talla_nombre: 'Small', orden: 1, incluido_curva: true, stock: 0, stock_minimo: 5, disponible_publico: true },
        { talla_codigo: 'M', talla_nombre: 'Medium', orden: 2, incluido_curva: true, stock: 0, stock_minimo: 5, disponible_publico: true },
        { talla_codigo: 'L', talla_nombre: 'Large', orden: 3, incluido_curva: true, stock: 0, stock_minimo: 5, disponible_publico: true },
        { talla_codigo: 'XL', talla_nombre: 'Extra Large', orden: 4, incluido_curva: true, stock: 0, stock_minimo: 5, disponible_publico: true }
    ]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            console.log("Fetching products and categories...");
            const [productsData, categoriesData] = await Promise.all([
                productService.getProducts(false),
                categoryService.getCategories()
            ]);
            setProducts(productsData);
            setCategories(categoriesData);
        } catch (error) {
            console.error('Error loading admin data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setFormData({
            nombre: '',
            codigo: '',
            categoria_id: categories[0]?.id || '',
            proceso_produccion_id: '',
            descripcion_publica: '',
            precio_minorista: 0,
            precio_mayorista_curva: 0,
            disponible_minorista: true,
            disponible_mayorista: true,
            imagenes: [],
            imagen_principal: '',
            curva_minima: true
        });
        setTallesForm([
            { talla_codigo: 'S', talla_nombre: 'Small', orden: 1, incluido_curva: true, stock: 0, stock_minimo: 5, disponible_publico: true },
            { talla_codigo: 'M', talla_nombre: 'Medium', orden: 2, incluido_curva: true, stock: 0, stock_minimo: 5, disponible_publico: true },
            { talla_codigo: 'L', talla_nombre: 'Large', orden: 3, incluido_curva: true, stock: 0, stock_minimo: 5, disponible_publico: true },
            { talla_codigo: 'XL', talla_nombre: 'Extra Large', orden: 4, incluido_curva: true, stock: 0, stock_minimo: 5, disponible_publico: true }
        ]);
        setActiveTab('general');
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await productService.uploadProductImage(file);
            setFormData(prev => ({
                ...prev,
                imagenes: [...(prev.imagenes || []), url],
                imagen_principal: prev.imagen_principal || url
            }));
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error al subir imagen');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.categoria_id) {
            alert('Por favor seleccione una categoría');
            return;
        }

        try {
            const productData = {
                ...formData,
                proceso_produccion_id: formData.proceso_produccion_id || null, // Convert empty string to null for UUID
                stock_total: tallesForm.reduce((sum, t) => sum + t.stock, 0),
                slug: formData.nombre?.toLowerCase().replace(/ /g, '-')
            } as any;

            if (formData.id) {
                await productService.updateProduct(formData.id, productData);
                alert('Producto actualizado con éxito');
            } else {
                await productService.createProduct(productData, tallesForm);
                alert('Producto creado con éxito');
            }

            setIsModalOpen(false);
            loadInitialData();
        } catch (error: any) {
            console.error(error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleEdit = (product: Producto & { producto_talles: ProductoTalla[] }) => {
        setFormData({
            ...product,
            categoria_id: product.categoria_id || '',
            proceso_produccion_id: product.proceso_produccion_id || ''
        });

        // Sort sizes by order before setting form
        const sortedTalles = [...product.producto_talles].sort((a, b) => a.orden - b.orden);
        setTallesForm(sortedTalles);

        setActiveTab('general');
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;

        try {
            await productService.deleteProduct(id);
            setProducts(products.filter(p => p.id !== id));
        } catch (error: any) {
            console.error('Error deleting:', error);
            alert('Error al eliminar producto');
        }
    };

    // ==========================================
    // NUEVA FUNCIÓN: DUPLICAR PRODUCTO
    // ==========================================
    const handleDuplicate = async (product: Producto) => {
        if (!window.confirm(`¿Quieres crear una copia de "${product.nombre}"?`)) return;

        // Mostrar estado de carga (opcional, podrías usar un toast)
        // Mostrar estado de carga (opcional, podrías usar un toast)
        // const originalText = document.getElementById(`dup-btn-${product.id}`)?.innerText;

        try {
            // AQUI DEBES PONER TU URL REAL DE VERCEL BACKEND
            // Ejemplo: https://app-mayorista-backend.vercel.app
            const BACKEND_URL = "https://app-mayorista-flores-backend-7bkk.vercel.app";

            const response = await fetch(`${BACKEND_URL}/api/products/duplicate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    newName: `${product.nombre} (Copia)`
                })
            });

            const data = await response.json();

            if (data.success) {
                alert("¡Producto clonado con éxito!");
                loadInitialData(); // Recargamos la lista para que aparezca la copia
            } else {
                alert("Error: " + (data.error || "No se pudo duplicar"));
            }

        } catch (error) {
            console.error("Error duplicando:", error);
            alert("Error de conexión con el backend");
        }
    };

    const updateTalla = (index: number, field: keyof Omit<ProductoTalla, 'id' | 'producto_id'>, value: any) => {
        const newTalles = [...tallesForm];
        newTalles[index] = { ...newTalles[index], [field]: value };
        setTallesForm(newTalles);
    };

    const addTallaField = () => {
        setTallesForm([...tallesForm, {
            talla_codigo: '',
            talla_nombre: '',
            orden: tallesForm.length + 1,
            incluido_curva: true,
            stock: 0,
            stock_minimo: 5,
            disponible_publico: true
        }]);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Productos</h1>
                    <p className="text-gray-500 mt-1 font-medium">Control dual de catálogo, precios y stock por talle</p>
                </div>
                <button
                    onClick={handleOpenModal}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-100 transition-all hover:-translate-y-1"
                >
                    <Plus className="h-5 w-5 stroke-[3]" />
                    Nuevo Producto
                </button>
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-sm">
                    <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-500 font-bold">Sincronizando catálogo...</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Producto</th>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Precios Duales</th>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Stock Total</th>
                                    <th className="px-6 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                    <th className="px-6 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-14 w-14 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden shadow-inner flex items-center justify-center border border-gray-100">
                                                    {product.imagen_principal ? (
                                                        <img src={product.imagen_principal} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="h-6 w-6 text-gray-300" />
                                                    )}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-black text-gray-900">{product.nombre}</div>
                                                    <div className="text-xs text-gray-400 font-mono font-bold tracking-tighter uppercase">{product.codigo}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">MIN</span>
                                                    <span className="text-sm font-bold text-gray-900">${product.precio_minorista.toLocaleString()}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black bg-blue-100 px-1.5 py-0.5 rounded text-blue-600">MAY</span>
                                                    <span className="text-sm font-bold text-blue-700">${product.precio_mayorista_curva.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className={`text-sm font-bold ${product.stock_total <= product.stock_minimo ? 'text-red-600' : 'text-gray-900'}`}>
                                                    {product.stock_total} unidades
                                                </span>
                                                <div className="flex gap-1 mt-1">
                                                    {product.producto_talles.slice(0, 4).map(t => (
                                                        <span key={t.id} title={`${t.talla_codigo}: ${t.stock}`} className="text-[9px] font-black bg-gray-50 border px-1 rounded text-gray-400">
                                                            {t.talla_codigo}
                                                        </span>
                                                    ))}
                                                    {product.producto_talles.length > 4 && <span className="text-[9px] text-gray-300">...</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                {product.visible_publico ? (
                                                    <span className="px-2.5 py-1 inline-flex text-[10px] font-black rounded-lg bg-green-100 text-green-700 border border-green-200 uppercase">Visible</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 inline-flex text-[10px] font-black rounded-lg bg-gray-100 text-gray-400 border border-gray-200 uppercase">Oculto</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-blue-100"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(product.id)}
                                                    className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-red-100"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                {/* BOTÓN DUPLICAR (Agregado) */}
                                                <button
                                                    id={`dup-btn-${product.id}`}
                                                    onClick={() => handleDuplicate(product)}
                                                    title="Duplicar Producto"
                                                    className="p-2.5 bg-gray-50 text-gray-400 hover:text-green-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-green-100"
                                                >
                                                    <Copy className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal de Creación/Edición */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl border border-white/20 animate-in zoom-in-95 duration-200">
                        {/* Header Modal */}
                        <div className="flex justify-between items-center p-8 border-b border-gray-50">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Configurar Producto</h2>
                                <p className="text-sm text-gray-400 font-medium">Control centralizado de todas las variantes del producto</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900 p-3 hover:bg-gray-50 rounded-full transition-all hover:rotate-90">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Tabs Style */}
                        <div className="flex gap-8 px-8 mt-4">
                            {(['general', 'variantes', 'precios'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-4 text-xs font-black uppercase tracking-widest transition-all relative ${activeTab === tab
                                        ? 'text-blue-600'
                                        : 'text-gray-300 hover:text-gray-500'
                                        }`}
                                >
                                    {tab}
                                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full" />}
                                </button>
                            ))}
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-10">
                            <form id="product-form" onSubmit={handleSubmit} className="space-y-12">

                                {activeTab === 'general' && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                        {/* Image Upload Area */}
                                        <div className="md:col-span-1">
                                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Fotos del Producto</label>
                                            <div className="aspect-[3/4] rounded-3xl border-4 border-dashed border-gray-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group hover:border-blue-100 transition-all">
                                                {formData.imagen_principal ? (
                                                    <>
                                                        <img src={formData.imagen_principal} className="absolute inset-0 w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => setFormData({ ...formData, imagen_principal: '', imagenes: [] })}
                                                                className="bg-red-500 text-white p-3 rounded-full"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {uploading ? (
                                                            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Upload className="h-10 w-10 text-gray-300 mb-4" />
                                                                <p className="text-xs font-bold text-gray-400 italic">Click para subir foto principal</p>
                                                            </>
                                                        )}
                                                        <input
                                                            type="file"
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={handleFileUpload}
                                                            accept="image/*"
                                                            disabled={uploading}
                                                        />
                                                    </>
                                                )}
                                            </div>

                                            {/* Proceso de Producción Removed as requested */}
                                        </div>

                                        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nombre Comercial</label>
                                                <input
                                                    required
                                                    type="text"
                                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-3.5 focus:bg-white focus:ring-blue-600 focus:border-blue-600 font-bold"
                                                    placeholder="Ej: Jean Mom Fit Nevado"
                                                    value={formData.nombre}
                                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Código SKU interno</label>
                                                <input
                                                    required
                                                    type="text"
                                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-3.5 focus:bg-white focus:ring-blue-600 focus:border-blue-600 font-mono font-bold"
                                                    placeholder="MOD-001"
                                                    value={formData.codigo}
                                                    onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Categoría</label>
                                                <select
                                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-3.5 focus:bg-white focus:ring-blue-600 focus:border-blue-600 font-bold"
                                                    value={formData.categoria_id}
                                                    onChange={e => setFormData({ ...formData, categoria_id: e.target.value })}
                                                >
                                                    <option value="">Seleccionar Categoría</option>
                                                    {categories.map(c => (
                                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                                    ))}
                                                </select>
                                                {categories.length === 0 && (
                                                    <p className="text-xs text-red-500 mt-1">No se cargaron categorías</p>
                                                )}
                                            </div>

                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Descripción Pública</label>
                                                <textarea
                                                    rows={4}
                                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 py-3.5 focus:bg-white focus:ring-blue-600 focus:border-blue-600"
                                                    placeholder="Describí los detalles de confección..."
                                                    value={formData.descripcion_publica}
                                                    onChange={e => setFormData({ ...formData, descripcion_publica: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'variantes' && (
                                    <div className="space-y-8">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Matriz de Talles y Stock</h4>
                                            <button
                                                type="button"
                                                onClick={addTallaField}
                                                className="text-xs font-black text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                            >
                                                <Plus className="h-4 w-4" /> AGREGAR TALLE
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="grid grid-cols-6 gap-4 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest mb-[-1rem]">
                                                <div className="col-span-1">Código</div>
                                                <div className="col-span-1">Etiqueta</div>
                                                <div className="col-span-1">Stock Actual</div>
                                                <div className="col-span-1">Stock Mín.</div>
                                                <div className="col-span-1 text-center">En Curva?</div>
                                                <div className="col-span-1 text-right">Acción</div>
                                            </div>

                                            {tallesForm.map((t, idx) => (
                                                <div key={idx} className="grid grid-cols-6 gap-4 items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-100 hover:bg-white hover:border-blue-100 transition-all">
                                                    <input
                                                        type="text"
                                                        className="w-full rounded-xl border-gray-200 font-bold py-2 px-3 text-sm focus:ring-blue-600"
                                                        placeholder="S, 38, etc"
                                                        value={t.talla_codigo}
                                                        onChange={e => updateTalla(idx, 'talla_codigo', e.target.value)}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="w-full rounded-xl border-gray-200 font-medium py-2 px-3 text-sm focus:ring-blue-600"
                                                        placeholder="Nombre"
                                                        value={t.talla_nombre}
                                                        onChange={e => updateTalla(idx, 'talla_nombre', e.target.value)}
                                                    />
                                                    <input
                                                        type="number"
                                                        className="w-full rounded-xl border-gray-200 font-black py-2 px-3 text-sm focus:ring-blue-600"
                                                        value={t.stock}
                                                        onChange={e => updateTalla(idx, 'stock', Number(e.target.value))}
                                                    />
                                                    <input
                                                        type="number"
                                                        className="w-full rounded-xl border-gray-200 font-bold py-2 px-3 text-sm focus:ring-blue-600 text-red-500"
                                                        value={t.stock_minimo}
                                                        onChange={e => updateTalla(idx, 'stock_minimo', Number(e.target.value))}
                                                    />
                                                    <div className="flex justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => updateTalla(idx, 'incluido_curva', !t.incluido_curva)}
                                                            className={`p-2 rounded-lg transition-all ${t.incluido_curva ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}
                                                        >
                                                            <Check className="h-4 w-4 stroke-[4]" />
                                                        </button>
                                                    </div>
                                                    <div className="text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setTallesForm(tallesForm.filter((_, i) => i !== idx))}
                                                            className="p-2 text-red-300 hover:text-red-500"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'precios' && (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                                        <ShoppingBag className="h-6 w-6" />
                                                    </div>
                                                    <h4 className="text-lg font-black text-gray-900">Estructura Minorista</h4>
                                                </div>

                                                <div className="p-8 bg-gray-50/50 border border-gray-100 rounded-[2rem] space-y-6">
                                                    <div>
                                                        <label className="block text-xs font-black text-gray-400 uppercase mb-2">Precio de Venta Final</label>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">$</span>
                                                            <input
                                                                type="number"
                                                                className="w-full rounded-2xl border-gray-200 pl-8 py-4 text-xl font-black text-gray-900 focus:ring-blue-600"
                                                                value={formData.precio_minorista}
                                                                onChange={e => setFormData({ ...formData, precio_minorista: Number(e.target.value) })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="dm"
                                                            checked={formData.disponible_minorista}
                                                            onChange={e => setFormData({ ...formData, disponible_minorista: e.target.checked })}
                                                            className="rounded-lg text-blue-600"
                                                        />
                                                        <label htmlFor="dm" className="text-sm font-bold text-gray-600">Visible en Tienda Minorista</label>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-3 bg-blue-600 text-white rounded-2xl">
                                                        <Package className="h-6 w-6" />
                                                    </div>
                                                    <h4 className="text-lg font-black text-gray-900">Estructura Mayorista</h4>
                                                </div>

                                                <div className="p-8 bg-blue-50/30 border border-blue-100 rounded-[2rem] space-y-6">
                                                    <div>
                                                        <label className="block text-xs font-black text-blue-400 uppercase mb-2">Precio por Curva Completa</label>
                                                        <div className="relative">
                                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-blue-400">$</span>
                                                            <input
                                                                type="number"
                                                                className="w-full rounded-2xl border-blue-200 pl-8 py-4 text-xl font-black text-blue-900 focus:ring-blue-600 bg-white"
                                                                value={formData.precio_mayorista_curva}
                                                                onChange={e => setFormData({ ...formData, precio_mayorista_curva: Number(e.target.value) })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="dmay"
                                                            checked={formData.disponible_mayorista}
                                                            onChange={e => setFormData({ ...formData, disponible_mayorista: e.target.checked })}
                                                            className="rounded-lg text-blue-600"
                                                        />
                                                        <label htmlFor="dmay" className="text-sm font-bold text-gray-600">Disponible para Mayoristas</label>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-4">
                                            <AlertCircle className="h-6 w-6 text-amber-600 shrink-0" />
                                            <div>
                                                <h5 className="font-black text-amber-900 text-sm uppercase">Advertencia de Stock</h5>
                                                <p className="text-sm text-amber-700 font-medium">
                                                    Si el producto es Mayorista, el sistema validará que haya stock de TODOS los talles de la curva antes de permitir la compra.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 rounded-b-[2rem]">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-8 py-3.5 rounded-2xl text-gray-500 hover:text-gray-900 font-black uppercase text-xs tracking-widest transition-all"
                            >
                                Descartar
                            </button>
                            <button
                                form="product-form"
                                type="submit"
                                className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 transition-all hover:-translate-y-1 flex items-center gap-2"
                            >
                                <Save className="h-5 w-5" />
                                Guardar Producto
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Internal imports needed for the pricing section UI icons
// Internal imports needed for the pricing section UI icons
import { ShoppingBag, Copy } from 'lucide-react'; // Agregamos 'Copy' aquí
