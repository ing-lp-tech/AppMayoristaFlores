import React, { useState, useEffect } from "react";
import { supabase } from '../../lib/supabase';
import {
    Plus,
    Minus,
    Ruler,
    Box,
    Calculator,
    Shirt,
    Scissors,
    Percent,
    Weight,
    Calendar,
    Save,
    Search,
    FileText,
    Edit,
    Trash2
} from "lucide-react";

type InsumoItem = {
    id: string;
    tipo: "unidad" | "metro";
    nombre: string;
    cantidad: number;
    precio: number;
};

import { FormattedNumberInput } from '../../components/ui/FormattedNumberInput';

export const Costos = () => {
    // DB Data
    const [lotes, setLotes] = useState<any[]>([]);
    const [dbInsumos, setDbInsumos] = useState<any[]>([]);
    const [historial, setHistorial] = useState<any[]>([]);

    // Selection & Date
    const [selectedLoteId, setSelectedLoteId] = useState<string>("");
    const [fechaCalculo, setFechaCalculo] = useState<string>(new Date().toISOString().split('T')[0]);

    // Auto-filled / Manual Fields
    const [productName, setProductName] = useState<string>("");

    // Fabric Section
    const [fabricUnit, setFabricUnit] = useState<"metros" | "kilos">("metros");
    const [fabricQty, setFabricQty] = useState<number>(0);
    const [fabricPrice, setFabricPrice] = useState<number>(0);
    const [prendasTotales, setPrendasTotales] = useState<number>(0);

    // Sewing
    const [costoCostura, setCostoCostura] = useState<number>(0);

    // Insumos
    const [insumosList, setInsumosList] = useState<InsumoItem[]>([]);

    // New Insumo Form
    const [nuevoInsumo, setNuevoInsumo] = useState<{
        nombre: string;
        tipo: "unidad" | "metro";
        cantidadPorPrenda: number;
        precioUnitario: number;
    }>({
        nombre: "",
        tipo: "unidad",
        cantidadPorPrenda: 0,
        precioUnitario: 0
    });

    // Margin
    const [margenGanancia, setMargenGanancia] = useState<number>(30);

    // Results
    const [resultados, setResultados] = useState<{
        costoUnitario: number;
        precioVenta: number;
        costoTotal: number;
    } | null>(null);

    // Loading State
    const [guardando, setGuardando] = useState(false);

    // Filters
    const [filterFechaInicio] = useState("");
    const [filterFechaFin] = useState("");
    const [filterBusqueda, setFilterBusqueda] = useState("");

    useEffect(() => {
        fetchData();
        fetchHistorial();
    }, []);

    const fetchData = async () => {
        const [lotesRes, insumosRes] = await Promise.all([
            supabase.from('lotes_produccion')
                .select(`
                    *,
                    producto:productos(id, nombre, codigo),
                    lote_productos(
                        cantidad_producto,
                        producto:productos(id, nombre, codigo)
                    )
                `)
                .order('creado_en', { ascending: false }),
            supabase.from('insumos').select('*')
        ]);

        if (lotesRes.error) {
            console.error("Error fetching lotes:", lotesRes.error);
        }

        if (lotesRes.data) {
            setLotes(lotesRes.data);
            console.log("Lotes fetched:", lotesRes.data);
        }

        if (insumosRes.data) setDbInsumos(insumosRes.data);
    };

    const fetchHistorial = async () => {
        let query = supabase
            .from('calculos_costos')
            .select('*, lote:lotes_produccion(codigo, producto:productos(nombre))')
            .order('fecha', { ascending: false });

        const { data, error } = await query;
        if (error) console.error("Error fetching history:", error);
        if (data) setHistorial(data);
    };

    // State for selected specific product within a bucket
    const [selectedProductId, setSelectedProductId] = useState<string>("");

    const handleLoteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const loteId = e.target.value;
        setSelectedLoteId(loteId);
        setSelectedProductId(""); // Reset product selection

        if (!loteId) {
            setProductName("");
            setPrendasTotales(0);
            setFabricQty(0);
            setFabricPrice(0);
            return;
        }

        const lote = lotes.find(l => l.id === loteId);
        if (lote) {
            // Check if multiple products exist
            const hasMultipleProducts = lote.lote_productos && lote.lote_productos.length > 0;

            if (hasMultipleProducts) {
                // Determine which product to select default (first one)
                // or just wait for user. Let's select first one to be helpful.
                const firstProd = lote.lote_productos[0];
                setSelectedProductId(firstProd.producto.id);
                setProductName(firstProd.producto.nombre);
                setPrendasTotales(firstProd.cantidad_producto || 0);
            } else {
                // Fallback to main product
                setProductName(lote.producto?.nombre || "Producto Desconocido");
                setPrendasTotales(lote.cantidad_real || lote.cantidad_total || 0);
            }

            // Calculate Total Consumption from Rolls (Default behavior)
            if (lote.detalle_rollos && Array.isArray(lote.detalle_rollos)) {
                // Sum meters
                const totalMeters = lote.detalle_rollos.reduce((sum: number, r: any) => sum + (Number(r.metros) || 0), 0);
                setFabricQty(totalMeters);
                setFabricUnit("metros");
                setFabricPrice(0);
            }
        }
    };

    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const prodId = e.target.value;
        setSelectedProductId(prodId);

        const lote = lotes.find(l => l.id === selectedLoteId);
        if (lote && lote.lote_productos) {
            const prodDetail = lote.lote_productos.find((lp: any) => lp.producto.id === prodId);
            if (prodDetail) {
                setProductName(prodDetail.producto.nombre);
                setPrendasTotales(prodDetail.cantidad_producto || 0);
            }
        }
    };

    // --- Load Calculation from History ---
    const cargarCalculo = (item: any) => {
        // 1. Set general info
        setSelectedLoteId(item.lote_id);
        setFechaCalculo(item.fecha);

        // Find lote info to set derived display strings (like Product Name)
        const lote = lotes.find(l => l.id === item.lote_id);
        if (lote) {
            setProductName(lote.producto?.nombre || "Calculado desde Historial");
            setPrendasTotales(lote.cantidad_real || lote.cantidad_total || 0);
        }

        // 2. Set Fabric Params
        setFabricUnit(item.fabric_unit || "metros");
        setFabricQty(item.fabric_qty || 0);
        setFabricPrice(item.fabric_price || 0);

        // 3. Set Sewing Cost (Unitary)
        // We stored 'costo_costura_total'. We need unitary.
        const prendas = lote?.cantidad_real || lote?.cantidad_total || 1;
        if (prendas > 0 && item.costo_costura_total) {
            setCostoCostura(item.costo_costura_total / prendas);
        } else {
            setCostoCostura(0);
        }

        // 4. Insumos
        if (item.detalle_insumos && Array.isArray(item.detalle_insumos)) {
            setInsumosList(item.detalle_insumos);
        } else {
            setInsumosList([]);
        }

        // 5. Generic
        setMargenGanancia(item.margen_ganancia || 30);

        // 6. Results
        setResultados({
            costoUnitario: item.costo_unitario,
            precioVenta: item.precio_venta,
            costoTotal: item.costo_total
        });

        // Scroll top to see the form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const eliminarCalculo = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Avoid triggering row click
        if (!confirm("¿Está seguro de eliminar este cálculo?")) return;

        const { error } = await supabase.from('calculos_costos').delete().eq('id', id);

        if (error) {
            alert("Error al eliminar");
            console.error(error);
        } else {
            alert("Cálculo eliminado");
            fetchHistorial();
        }
    };

    const agregarInsumo = () => {
        if (!nuevoInsumo.nombre || nuevoInsumo.precioUnitario <= 0) return;

        setInsumosList([
            ...insumosList,
            {
                id: Date.now().toString(),
                tipo: nuevoInsumo.tipo,
                nombre: nuevoInsumo.nombre,
                cantidad: nuevoInsumo.cantidadPorPrenda,
                precio: nuevoInsumo.precioUnitario
            }
        ]);

        setNuevoInsumo({
            nombre: "",
            tipo: "unidad",
            cantidadPorPrenda: 0,
            precioUnitario: 0
        });
    };

    const eliminarInsumo = (id: string) => {
        setInsumosList(insumosList.filter(i => i.id !== id));
    };

    const calcularCostos = () => {
        if (prendasTotales <= 0) return;

        // 1. Fabric Cost (Total)
        const costoTelaTotal = fabricQty * fabricPrice;

        // 2. Sewing Cost (Total)
        const costoCosturaTotal = costoCostura * prendasTotales;

        // 3. Supplies Cost (Total)
        const costoInsumosTotal = insumosList.reduce((sum, item) => {
            return sum + (item.cantidad * item.precio * prendasTotales);
        }, 0);

        const costoTotal = costoTelaTotal + costoCosturaTotal + costoInsumosTotal;
        const costoUnitario = costoTotal / prendasTotales;
        const precioVenta = costoUnitario / (1 - margenGanancia / 100);

        setResultados({
            costoUnitario,
            costoTotal,
            precioVenta
        });
    };

    const guardarCalculo = async () => {
        if (!resultados || !selectedLoteId) return;
        setGuardando(true);
        try {
            const payload = {
                lote_id: selectedLoteId,
                producto_id: selectedProductId || null, // Guardar el producto específico
                fecha: fechaCalculo,
                fabric_unit: fabricUnit,
                fabric_qty: fabricQty,
                fabric_price: fabricPrice,
                costo_tela_total: fabricQty * fabricPrice,
                costo_costura_total: costoCostura * prendasTotales,
                costo_insumos_total: insumosList.reduce((sum, item) => sum + (item.cantidad * item.precio * prendasTotales), 0),
                costo_total: resultados.costoTotal,
                costo_unitario: resultados.costoUnitario,
                margen_ganancia: margenGanancia,
                precio_venta: resultados.precioVenta,
                detalle_insumos: insumosList
            };

            // Always Insert new history record
            const { error } = await supabase.from('calculos_costos').insert(payload);

            if (error) throw error;

            alert("Cálculo guardado correctamente");
            fetchHistorial();
        } catch (error) {
            console.error("Error al guardar:", error);
            alert("Error al guardar el cálculo");
        } finally {
            setGuardando(false);
        }
    };

    // Helper for selecting existing insumo
    const handleSelectInsumo = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (!id) return;
        const item = dbInsumos.find(i => i.id === id);
        if (item) {
            setNuevoInsumo({
                ...nuevoInsumo,
                nombre: item.nombre,
                precioUnitario: item.costo_unitario || 0,
                // Keep default qty or type? user can edit
            });
        }
    };

    // Filter Logic
    const filteredHistorial = historial.filter(item => {
        const matchFechaStart = filterFechaInicio ? item.fecha >= filterFechaInicio : true;
        const matchFechaEnd = filterFechaFin ? item.fecha <= filterFechaFin : true;
        const searchLower = filterBusqueda.toLowerCase();

        const loteCodigo = item.lote?.codigo?.toLowerCase() || "";
        const prodNombre = item.lote?.producto?.nombre?.toLowerCase() || "";

        const matchSearch = !filterBusqueda || loteCodigo.includes(searchLower) || prodNombre.includes(searchLower);

        return matchFechaStart && matchFechaEnd && matchSearch;
    });

    return (
        <section className="py-8 bg-gray-50 min-h-screen">
            <div className="max-w-5xl mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-3">
                        <Calculator className="text-blue-600" />
                        Calculadora de Costos
                    </h2>
                    <p className="text-gray-600">Basado en Lotes de Producción</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg run-in slide-in-from-bottom-5 duration-300 mb-12">

                    {/* 1. SELECCIÓN DE LOTE Y FECHA */}
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <Box className="text-blue-500" />
                            Datos Generales
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Lote de Producción</label>
                                <select
                                    className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 bg-white border"
                                    value={selectedLoteId}
                                    onChange={handleLoteChange}
                                >
                                    <option value="">Seleccione un lote...</option>
                                    {lotes.map(l => (
                                        <option key={l.id} value={l.id}>
                                            {l.codigo} - {l.producto?.nombre} ({new Date(l.fecha_creacion).toLocaleDateString()})
                                        </option>
                                    ))}
                                </select>

                                {/* Multiple Product Selector */}
                                {(() => {
                                    const selectedLote = lotes.find(l => l.id === selectedLoteId);
                                    if (selectedLote && selectedLote.lote_productos && selectedLote.lote_productos.length > 0) {
                                        return (
                                            <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                                <label className="block text-xs font-bold text-blue-700 mb-1 ml-1 flex items-center gap-1">
                                                    <Box className="w-3 h-3" />
                                                    Seleccionar Producto del Lote
                                                </label>
                                                <select
                                                    className="w-full border-blue-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2 bg-blue-50/50 border text-sm text-blue-900 font-medium"
                                                    value={selectedProductId}
                                                    onChange={handleProductChange}
                                                >
                                                    {selectedLote.lote_productos.map((lp: any) => (
                                                        <option key={lp.producto.id} value={lp.producto.id}>
                                                            {lp.producto.nombre} - Cant: {lp.cantidad_producto} un.
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha del Cálculo</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 p-2.5 bg-white border pl-10"
                                        value={fechaCalculo}
                                        onChange={(e) => setFechaCalculo(e.target.value)}
                                    />
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                </div>
                            </div>
                        </div>

                        {selectedLoteId && (
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-sm text-gray-500">Producto Relacionado</div>
                                    <div className="text-lg font-bold text-blue-900 truncate">{productName || "-"}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-1">Cantidad de Prendas (Lote)</div>
                                    <FormattedNumberInput
                                        value={prendasTotales}
                                        onChange={setPrendasTotales}
                                        className="w-full border-blue-200 border-2 p-2 rounded-lg text-xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-center bg-white"
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-gray-400 mt-1">Editable para calcular costos con menos cantidad</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 2. PARAMETROS DE TELA */}
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <Shirt className="text-blue-500" />
                            Material Principal (Tela)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-gray-700 mb-2">Unidad de Medida</label>
                                <div className="flex bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setFabricUnit('metros')}
                                        className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${fabricUnit === 'metros' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Ruler className="mr-2" /> Metros
                                    </button>
                                    <button
                                        onClick={() => setFabricUnit('kilos')}
                                        className={`flex-1 flex items-center justify-center py-2 text-sm font-medium rounded-md transition-all ${fabricUnit === 'kilos' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        <Weight className="mr-2" /> Kilos
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Total {fabricUnit === 'metros' ? 'Metros' : 'Kilos'} Utilizados
                                </label>
                                <FormattedNumberInput
                                    value={fabricQty}
                                    onChange={setFabricQty}
                                    placeholder="0"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    {fabricUnit === 'metros' ? 'Auto-calculado (editable)' : 'Ingrese peso total'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Precio por {fabricUnit === 'metros' ? 'Metro' : 'Kilo'}
                                </label>
                                <FormattedNumberInput
                                    value={fabricPrice}
                                    onChange={setFabricPrice}
                                    prefix="$"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. COSTOS DE CONFECCION */}
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Scissors className="text-blue-500" />
                            Confección
                        </h3>
                        <div className="max-w-md w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Costo de Costura (por prenda)</label>
                            <FormattedNumberInput
                                value={costoCostura}
                                onChange={setCostoCostura}
                                prefix="$"
                                placeholder="Ej: 500"
                            />
                        </div>
                    </div>

                    {/* 4. INSUMOS */}
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                            <Box className="text-blue-500" />
                            Insumos Adicionales
                        </h3>

                        {insumosList.length > 0 && (
                            <div className="space-y-3 mb-6">
                                {insumosList.map(item => (
                                    <div key={item.id} className="bg-gray-50 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center border border-gray-100 gap-2">
                                        <div>
                                            <span className="font-bold text-gray-800">{item.nombre}</span>
                                            <div className="text-sm text-gray-600">
                                                {item.cantidad} un/prenda × ${item.precio.toLocaleString("es-AR")} = <span className="font-semibold text-blue-600">${(item.cantidad * item.precio).toLocaleString("es-AR")} / prenda</span>
                                            </div>
                                        </div>
                                        <button onClick={() => eliminarInsumo(item.id)} className="text-red-500 hover:text-red-700 p-2 self-end sm:self-auto">
                                            <Minus />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100">
                            <h4 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wide">Agregar Insumo</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar Existente</label>
                                    <select
                                        className="w-full text-sm border-gray-300 rounded-lg p-2 border"
                                        onChange={handleSelectInsumo}
                                        value=""
                                    >
                                        <option value="">Seleccionar...</option>
                                        {dbInsumos.map(i => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-1">
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        className="w-full text-sm border-gray-300 rounded-lg p-2 border"
                                        value={nuevoInsumo.nombre}
                                        onChange={e => setNuevoInsumo({ ...nuevoInsumo, nombre: e.target.value })}
                                        placeholder="Ej: Botones"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Cant. por Prenda</label>
                                    <FormattedNumberInput
                                        value={nuevoInsumo.cantidadPorPrenda}
                                        onChange={val => setNuevoInsumo({ ...nuevoInsumo, cantidadPorPrenda: val })}
                                        className="text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Costo Unitario</label>
                                    <FormattedNumberInput
                                        value={nuevoInsumo.precioUnitario}
                                        onChange={val => setNuevoInsumo({ ...nuevoInsumo, precioUnitario: val })}
                                        prefix="$"
                                        className="text-sm"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={agregarInsumo}
                                className="mt-4 w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center justify-center gap-2"
                            >
                                <Plus /> Agregar
                            </button>
                        </div>
                    </div>

                    {/* 5. MARGEN Y RESULTADOS */}
                    <div className="p-6 bg-gray-50 rounded-b-xl">
                        <div className="max-w-xs mb-6 w-full">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Margen de Ganancia (%)</label>
                            <FormattedNumberInput
                                value={margenGanancia}
                                onChange={setMargenGanancia}
                                suffix={<Percent className="w-4 h-4 text-gray-400" />}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={calcularCostos}
                                disabled={prendasTotales <= 0}
                                className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-slate-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all active:scale-[0.99] flex items-center justify-center gap-3"
                            >
                                <Calculator /> CALCULAR
                            </button>

                            <button
                                onClick={guardarCalculo}
                                disabled={!resultados || guardando}
                                className="w-full bg-green-600 text-white py-4 rounded-xl font-black text-lg shadow-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all active:scale-[0.99] flex items-center justify-center gap-3"
                            >
                                <Save /> {guardando ? "GUARDANDO..." : "GUARDAR CÁLCULO"}
                            </button>
                        </div>

                        {resultados && (
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                                    <p className="text-gray-500 text-sm font-bold uppercase">Costo Total Lote</p>
                                    <p className="text-3xl font-black text-blue-900 mt-1">${resultados.costoTotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                                    <p className="text-gray-500 text-sm font-bold uppercase">Costo Unitario</p>
                                    <p className="text-3xl font-black text-purple-900 mt-1">${resultados.costoUnitario.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                                    <p className="text-gray-500 text-sm font-bold uppercase">Precio Sugerido</p>
                                    <p className="text-3xl font-black text-green-600 mt-1">${resultados.precioVenta.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* 6. HISTORIAL */}
                <div className="bg-white rounded-xl shadow-lg run-in slide-in-from-bottom-5 duration-300 p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <FileText className="text-blue-600" />
                        Historial de Cálculos
                    </h2>

                    {/* Filters */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar (Lote / Producto)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className="w-full text-sm border-gray-300 rounded-md pl-8"
                                    placeholder="Código lote, nombre producto..."
                                    value={filterBusqueda}
                                    onChange={e => setFilterBusqueda(e.target.value)}
                                />
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-100 text-gray-700 uppercase font-bold">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Fecha</th>
                                    <th className="px-4 py-3">Lote</th>
                                    <th className="px-4 py-3">Producto</th>
                                    <th className="px-4 py-3 text-right">Costo Unit.</th>
                                    <th className="px-4 py-3 text-right">Precio Sugerido</th>
                                    <th className="px-4 py-3 text-right">Margen</th>
                                    <th className="px-4 py-3 text-center rounded-tr-lg">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredHistorial.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                                            No se encontraron registros.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHistorial.map((item: any) => (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">{new Date(item.fecha).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 font-medium text-blue-600">{item.lote?.codigo || "-"}</td>
                                            <td className="px-4 py-3">{item.lote?.producto?.nombre || "-"}</td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-800">${Number(item.costo_unitario).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right font-bold text-green-600">${Number(item.precio_venta).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right text-gray-600">{item.margen_ganancia}%</td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => cargarCalculo(item)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Editar cálculo"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => eliminarCalculo(item.id, e)}
                                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Eliminar cálculo"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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
            </div>
        </section>
    );
};
