import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { productService } from '../../services/productService';
import type { LoteProduccion, Producto } from '../../types';
import { Plus, CheckCircle, Package, Trash2, X, Settings, Scissors } from 'lucide-react';
import clsx from 'clsx';
import { FormattedNumberInput } from '../../components/ui/FormattedNumberInput';

export const Produccion = () => {
    const navigate = useNavigate();
    const [lotes, setLotes] = useState<LoteProduccion[]>([]);
    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [debugError, setDebugError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showRealQtyModal, setShowRealQtyModal] = useState<LoteProduccion | null>(null);
    const [realQtyPerProduct, setRealQtyPerProduct] = useState<Record<string, number>>({});

    // Nuevo estado para el "Stepper"
    const [selectedBatch, setSelectedBatch] = useState<LoteProduccion | null>(null);
    const [procesos, setProcesos] = useState<any[]>([]); // Store processes with steps

    // New Batch State
    const [newBatch, setNewBatch] = useState<Partial<LoteProduccion> & { selectedProcessId?: string; productos_ids?: string[] }>({
        codigo: '',
        producto_id: '',
        productos_ids: [''], // NUEVO: Array de productos seleccionados
        modelo_corte: '',
        detalle_rollos: [{ color: '', kg_consumido: 0 }],
        estado: 'planificado',
        fecha_inicio: new Date().toISOString().split('T')[0],
        propietario: '',
        selectedProcessId: ''
    });

    const [rollos, setRollos] = useState<any[]>([]);
    const [availableRolls, setAvailableRolls] = useState<any[]>([]);
    const [rollFilters, setRollFilters] = useState({ tipo: '', metros: '' });
    const [typeOptions, setTypeOptions] = useState<string[]>([]);

    const [rollDetailsForBatch, setRollDetailsForBatch] = useState<Record<string, any>>({});

    useEffect(() => {
        if (!selectedBatch) {
            setRollDetailsForBatch({});
            return;
        }

        const fetchRolls = async () => {
            const prods = selectedBatch.detalle_rollos || [];
            const ids = prods.map((r: any) => r.rollo_id).filter(Boolean);
            if (ids.length === 0) return;

            const { data } = await supabase.from('rollos_tela').select('*').in('id', ids);
            if (data) {
                const map: any = {};
                data.forEach((r: any) => map[r.id] = r);
                setRollDetailsForBatch(map);
            }
        };
        fetchRolls();
    }, [selectedBatch]);



    useEffect(() => {
        fetchData();
    }, []);

    // Filter rolls when data or filters change
    useEffect(() => {
        let filtered = rollos;
        if (rollFilters.tipo) {
            filtered = filtered.filter(r => r.tipo_tela === rollFilters.tipo);
        }
        if (rollFilters.metros) {
            const minMeters = parseFloat(rollFilters.metros);
            if (!isNaN(minMeters)) {
                // Approximate match +/- 10% or explicit >= if needed.
                // User said "distingo por cantidad de metros", often meaning exact value.
                // Let's allow finding rolls that have AT LEAST this amount, or maybe close to it?
                // Plan said "search for meters". Let's do exact match or within 5 meters range for ease
                filtered = filtered.filter(r => Math.abs(r.metros_restantes - minMeters) < 5 || r.metros_restantes >= minMeters);
            }
        }
        setAvailableRolls(filtered);
    }, [rollos, rollFilters]);

    const fetchData = async () => {
        try {
            const [lotesRes, prodRes, rollosRes, procesosRes] = await Promise.all([
                supabase.from('lotes_produccion').select(`
                    *, 
                    producto:productos(nombre, codigo, producto_talles(*)),
                    productos:lote_productos(
                        id,
                        orden,
                        tallas_distribucion,
                        cantidad_producto,
                        producto:productos(id, nombre, codigo, producto_talles(*))
                    )
                `).order('creado_en', { ascending: false }),
                supabase.from('productos').select('id, nombre, codigo, proceso_produccion_id, producto_talles(*)').order('nombre', { ascending: true }),
                supabase.from('rollos_tela').select('*').or('metros_restantes.gt.0.5,peso_restante.gt.0.01'),
                supabase.from('procesos_templates').select('*, pasos:pasos_proceso(*)')
            ]);

            setLotes(lotesRes.data || []);
            // @ts-ignore
            setProductos(prodRes.data || []);
            setRollos(rollosRes.data || []);
            // @ts-ignore
            setProcesos(procesosRes.data || []);

            // ERROR DEBUGGING
            if (lotesRes.error) setDebugError("Error Lotes: " + lotesRes.error.message + " (" + lotesRes.error.details + ")");
            if (prodRes.error) setDebugError("Error Porductos: " + prodRes.error.message);
            if (rollosRes.error) setDebugError("Error Rollos: " + rollosRes.error.message);

            // Extract unique types
            const rules = rollosRes.data || [];
            const types = Array.from(new Set(rules.map((r: any) => r.tipo_tela)));
            setTypeOptions(types);
        } catch (error: any) {
            console.error(error);
            setDebugError("Exception: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRollo = () => {
        setNewBatch({
            ...newBatch,
            detalle_rollos: [...(newBatch.detalle_rollos || []), { color: '', kg_consumido: 0 }]
        });
    };

    const handleRemoveRollo = (index: number) => {
        const list = [...(newBatch.detalle_rollos || [])];
        list.splice(index, 1);
        setNewBatch({ ...newBatch, detalle_rollos: list });
    };

    const handleRolloSelect = (index: number, rolloId: string) => {
        // Find the selected roll from available options
        const selectedRoll = availableRolls.find(r => r.id === rolloId);
        if (!selectedRoll) return;

        const list = [...(newBatch.detalle_rollos || [])];
        // Auto-fill with total available kg from the selected roll
        list[index] = {
            rollo_id: selectedRoll.id,
            color: selectedRoll.color || 'Sin color',
            kg_consumido: Number(selectedRoll.peso_restante) || 0  // Auto-complete with available kg
        } as any;
        setNewBatch({ ...newBatch, detalle_rollos: list });
    };

    const updateRollo = (index: number, field: 'color' | 'kg_consumido', value: string | number) => {
        const list = [...(newBatch.detalle_rollos || [])];
        const val = field === 'kg_consumido' ? Number(value) : value;

        list[index] = {
            ...list[index],
            [field]: val
        };
        setNewBatch({ ...newBatch, detalle_rollos: list });
    };

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Validar que hay al menos 1 producto seleccionado
            const productosValidos = (newBatch.productos_ids || []).filter(id => id !== '');
            if (productosValidos.length === 0) {
                alert('Debes seleccionar al menos un producto');
                return;
            }

            // 1. Prepare Batch Data with Snapshot
            let snapshot = null;
            let firstState = 'planificado';

            // Usar el primer producto para determinar el proceso
            const selectedProd = productos.find(p => p.id === productosValidos[0]);

            if (selectedProd?.proceso_produccion_id) {
                // Fetch the dynamic process steps
                const { data: steps } = await supabase
                    .from('pasos_proceso')
                    .select('*')
                    .eq('proceso_id', selectedProd.proceso_produccion_id)
                    .order('orden', { ascending: true });

                if (steps && steps.length > 0) {
                    snapshot = { pasos: steps };
                    firstState = steps[0].nombre;
                }
            }

            // If no custom process, use default snapshot for consistency
            if (!snapshot) {
                snapshot = {
                    pasos: [
                        { nombre: 'planificado', orden: 0, requiere_input: false },
                        { nombre: 'corte', orden: 1, requiere_input: false },
                        { nombre: 'taller', orden: 2, requiere_input: false },
                        { nombre: 'terminado', orden: 3, requiere_input: true }
                    ]
                };
            }

            // 2. Create Batch (mantener producto_id con el primero por compatibilidad)
            const { data: batchData, error: batchError } = await supabase.from('lotes_produccion').insert([{
                codigo: newBatch.codigo,
                producto_id: productosValidos[0], // Primer producto
                modelo_corte: newBatch.modelo_corte,
                detalle_rollos: newBatch.detalle_rollos,
                propietario: newBatch.propietario,
                fecha_inicio: newBatch.fecha_inicio,
                cantidad_total: 0,
                estado: firstState,
                proceso_snapshot: snapshot,
                paso_actual_index: 0
            }]).select().single();

            if (batchError) throw batchError;

            // 3. Insertar relaciones de productos en lote_productos
            const loteProductos = productosValidos.map((prodId, index) => ({
                lote_id: batchData.id,
                producto_id: prodId,
                orden: index + 1
            }));

            const { error: loteProductosError } = await supabase
                .from('lote_productos')
                .insert(loteProductos);

            if (loteProductosError) {
                console.error('Error insertando productos del lote:', loteProductosError);
                throw loteProductosError;
            }

            // 4. CONSUME FABRIC ROLLS IMMEDIATELY (so they show as 'usado/agotado' in inventory)
            const rollsToConsume = newBatch.detalle_rollos
                ?.filter((r: any) => r.rollo_id && r.kg_consumido > 0)
                .map((r: any) => ({
                    rollo_id: r.rollo_id,
                    kg_consumido: r.kg_consumido
                }));

            if (rollsToConsume && rollsToConsume.length > 0) {
                console.log('🧵 Consumiendo rollos al crear lote:', rollsToConsume);
                const { error: rpcError } = await supabase.rpc('consume_rolls_for_batch', {
                    p_batch_id: batchData.id,
                    p_rolls: rollsToConsume
                });

                if (rpcError) {
                    console.error('❌ Error consumiendo rollos:', rpcError);
                    alert(`Lote creado, pero hubo un error al descontar la tela.\n\nDetalle: ${rpcError.message}`);
                } else {
                    console.log('✅ Rollos consumidos exitosamente al crear el lote');
                }
            }

            fetchData();
            setIsModalOpen(false);
            setNewBatch({
                codigo: '',
                producto_id: '',
                productos_ids: [''],
                modelo_corte: '',
                detalle_rollos: [{ color: '', metros: 0 }],
                estado: 'planificado',
                fecha_inicio: new Date().toISOString().split('T')[0],
                propietario: '',
                selectedProcessId: ''
            });
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const handleFinalizeProduction = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showRealQtyModal) return;

        const lote = showRealQtyModal;

        try {
            // Calculate total quantity produced (sum of all products)
            const totalQty = Object.values(realQtyPerProduct).reduce((sum, qty) => sum + qty, 0);

            const { error } = await supabase.from('lotes_produccion').update({
                cantidad_real: totalQty,
                estado: 'terminado',
                progreso_porcentaje: 100,
                fecha_fin: new Date().toISOString()
            }).eq('id', lote.id);

            if (error) throw error;

            // 1. FABRIC ROLLS ALREADY CONSUMED AT BATCH CREATION - Nothing to do here
            console.log('ℹ️ Rollos ya fueron consumidos al crear el lote. Saltando consumo...');

            // 2. ADD FINISHED PRODUCTS TO STOCK (increment producto_talles stock)
            // Now we handle multiple products per lot using lote_productos
            const lotProducts = lote.productos || [];

            if (lotProducts.length > 0) {
                console.log('🏭 Processing lot products:', lotProducts.length);

                // Process each product's cutting plan
                for (const lp of lotProducts) {
                    const prod = lp.producto;
                    if (!prod) continue;

                    console.log('🔍 Processing product:', prod.nombre, prod.id);

                    const distribution = lp.tallas_distribucion;
                    const productQty = realQtyPerProduct[prod.id] || 0;

                    console.log('  Distribution exists?', !!distribution, 'Keys:', distribution ? Object.keys(distribution).length : 0);
                    console.log('  Product Qty from modal:', productQty);
                    console.log('  Cantidad producto from DB:', lp.cantidad_producto);

                    if (distribution && Object.keys(distribution).length > 0) {
                        // Use the per-product distribution matrix
                        console.log('✅ Using distribution-based stock increment');
                        await productService.addStockFromBatch(prod.id, distribution);

                        // 🎨 AUTO-REGISTER COLORS FROM BATCH TO PRODUCT
                        // Extract unique colors from the cutting matrix
                        const colorsInBatch = Object.keys(distribution); // ["Crema melange", "Vison melange", ...]

                        if (colorsInBatch.length > 0) {
                            // Fetch current product colors
                            const { data: currentProduct } = await supabase
                                .from('productos')
                                .select('colores')
                                .eq('id', prod.id)
                                .single();

                            const existingColors = (currentProduct?.colores || []) as { nombre: string; hex?: string }[];
                            const existingColorNames = existingColors.map(c => c.nombre.toLowerCase());

                            // 🎨 Function to auto-assign hex color based on Spanish/Latin American color names
                            const getColorHex = (colorName: string): string | null => {
                                const name = colorName.toLowerCase();

                                // Common Latin American fabric colors
                                if (name.includes('negro') || name.includes('black')) return '#000000';
                                if (name.includes('blanco') || name.includes('white')) return '#FFFFFF';
                                if (name.includes('rojo') || name.includes('red')) return '#DC2626';
                                if (name.includes('azul') || name.includes('blue')) return '#2563EB';
                                if (name.includes('marino') || name.includes('navy')) return '#1E3A8A';
                                if (name.includes('verde') || name.includes('green')) return '#16A34A';
                                if (name.includes('amarillo') || name.includes('yellow')) return '#EAB308';
                                if (name.includes('naranja') || name.includes('orange')) return '#F97316';
                                if (name.includes('rosa') || name.includes('pink')) return '#EC4899';
                                if (name.includes('morado') || name.includes('violeta') || name.includes('purple')) return '#A855F7';
                                if (name.includes('gris') || name.includes('gray') || name.includes('grey')) return '#6B7280';
                                if (name.includes('beige') || name.includes('arena')) return '#F5F5DC';
                                if (name.includes('crema') || name.includes('cream')) return '#FAEBD7';
                                if (name.includes('café') || name.includes('marrón') || name.includes('brown')) return '#92400E';
                                if (name.includes('chocolate')) return '#7C2D12';
                                if (name.includes('camel')) return '#C19A6B';
                                if (name.includes('vison') || name.includes('visón')) return '#8B7355';
                                if (name.includes('nude')) return '#E8BEAC';
                                if (name.includes('coral')) return '#FF7F50';
                                if (name.includes('turquesa') || name.includes('turquoise')) return '#14B8A6';
                                if (name.includes('celeste') || name.includes('sky')) return '#7DD3FC';
                                if (name.includes('bordo') || name.includes('burgundy') || name.includes('borgoña')) return '#7F1D1D';
                                if (name.includes('mostaza') || name.includes('mustard')) return '#D97706';
                                if (name.includes('oliva') || name.includes('olive')) return '#65A30D';

                                // Melange/mixed colors (lighter versions)
                                if (name.includes('melange')) {
                                    if (name.includes('gris')) return '#9CA3AF';
                                    if (name.includes('azul')) return '#60A5FA';
                                    if (name.includes('verde')) return '#4ADE80';
                                }

                                return null; // No match - user will set it manually
                            };

                            // Add new colors that don't exist yet WITH automatic hex assignment
                            const newColors = colorsInBatch
                                .filter(colorName => !existingColorNames.includes(colorName.toLowerCase()))
                                .map(colorName => ({
                                    nombre: colorName,
                                    hex: getColorHex(colorName) // Auto-assign hex based on name
                                }));

                            if (newColors.length > 0) {
                                const updatedColors = [...existingColors, ...newColors];

                                await supabase
                                    .from('productos')
                                    .update({ colores: updatedColors })
                                    .eq('id', prod.id);

                                console.log(`✅ Se agregaron ${newColors.length} colores nuevos al producto ${prod.nombre}:`, newColors.map(c => c.nombre).join(', '));
                            }
                        }
                    } else if (productQty > 0) {
                        // Fallback: use realQtyPerProduct if no distribution
                        console.log('⚠️ No distribution found, using fallback increment_stock with qty:', productQty);
                        await supabase.rpc('increment_stock', {
                            p_id: prod.id,
                            quantity: productQty
                        });
                    } else if (lp.cantidad_producto && lp.cantidad_producto > 0) {
                        // Fallback 2: use cantidad_producto from lote_productos
                        console.log('⚠️ Using fallback cantidad_producto:', lp.cantidad_producto);
                        await supabase.rpc('increment_stock', {
                            p_id: prod.id,
                            quantity: lp.cantidad_producto
                        });
                    }
                }
            } else if (lote.producto_id) {
                // Legacy fallback for old lots without lote_productos relation
                if (lote.tallas_distribucion && Object.keys(lote.tallas_distribucion).length > 0) {
                    await productService.addStockFromBatch(lote.producto_id, lote.tallas_distribucion);
                } else {
                    const legacyQty = Object.values(realQtyPerProduct)[0] || totalQty;
                    await supabase.rpc('increment_stock', { p_id: lote.producto_id, quantity: legacyQty });
                }
            }

            setShowRealQtyModal(null);
            setRealQtyPerProduct({});
            fetchData();
        } catch (error: any) {
            alert('Error al finalizar: ' + error.message);
        }
    };

    const updateStatus = async (id: string, targetStatus: string) => {
        const lote = lotes.find(l => l.id === id);
        if (!lote) return;

        // Get Steps
        const steps = lote.proceso_snapshot?.pasos || [
            { nombre: 'planificado' }, { nombre: 'corte' }, { nombre: 'taller' }, { nombre: 'terminado', requiere_input: true }
        ];

        const targetIndex = steps.findIndex((s: any) => s.nombre === targetStatus);
        const targetStep = steps[targetIndex];
        // const isLastStep = targetIndex === steps.length - 1; // Unused
        const requiresInput = targetStep?.requiere_input || (targetStatus === 'terminado'); // Fallback for old

        // 1. Check if we need Real Quantity
        if (requiresInput) {
            // Pass the full lote object so we have access to all products
            setShowRealQtyModal(lote);
            // Initialize quantities to 0 for each product
            const initialQty: Record<string, number> = {};
            if (lote.productos && lote.productos.length > 0) {
                lote.productos.forEach(lp => {
                    if (lp.producto?.id) {
                        // Calculate total from distribution if exists
                        let distTotal = 0;
                        if (lp.tallas_distribucion) {
                            Object.values(lp.tallas_distribucion).forEach((sizes: any) => {
                                Object.values(sizes).forEach((q: any) => distTotal += Number(q) || 0);
                            });
                        }

                        initialQty[lp.producto.id] = distTotal > 0 ? distTotal : (lp.cantidad_producto || 0);
                    }
                });
            } else if (lote.producto_id) {
                // Legacy fallback calculation
                let distTotal = 0;
                if (lote.tallas_distribucion) {
                    Object.values(lote.tallas_distribucion).forEach((sizes: any) => {
                        Object.values(sizes).forEach((q: any) => distTotal += Number(q) || 0);
                    });
                }
                initialQty[lote.producto_id] = distTotal > 0 ? distTotal : 0;
            }
            setRealQtyPerProduct(initialQty);
            setSelectedBatch(null);
            return;
        }

        // 2. Calculate Progress
        // Standard logic: 0% at start, 100% at end. 
        // Steps: 4. Index 0 = 0%, Index 1 = 33%, Index 2 = 66%, Index 3 = 100%.
        // Formula: (targetIndex / (totalSteps - 1)) * 100
        const totalSteps = steps.length;
        const percentage = totalSteps > 1 ? Math.round((targetIndex / (totalSteps - 1)) * 100) : 0;

        try {
            const { error } = await supabase.from('lotes_produccion').update({
                estado: targetStatus,
                paso_actual_index: targetIndex,
                progreso_porcentaje: percentage
            }).eq('id', id);

            if (error) throw error;

            if (selectedBatch && selectedBatch.id === id) {
                setSelectedBatch({
                    ...selectedBatch,
                    estado: targetStatus,
                    paso_actual_index: targetIndex,
                    progreso_porcentaje: percentage
                });
            }

            fetchData();
        } catch (error: any) {
            alert('Error: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase.from('lotes_produccion').delete().eq('id', id);
            if (error) throw error;
            fetchData();
        } catch (error: any) {
            alert("Error al eliminar: " + error.message);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando producción...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    {debugError && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                            <h3 className="font-bold">Error de Depuración:</h3>
                            <p className="font-mono text-sm">{debugError}</p>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-gray-900 font-serif">Producción</h1>
                    <p className="text-gray-500">Gestión de lotes y tendido de tela</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/admin/procesos')}
                        className="bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-50 shadow-sm transition-all active:scale-95 font-medium"
                    >
                        <Settings className="h-5 w-5" /> Gestionar Procesos
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 shadow-sm transition-all active:scale-95 font-medium"
                    >
                        <Plus className="h-5 w-5" /> Iniciar Lote
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {lotes.map((lote: any) => (
                    <div
                        key={lote.id}
                        onClick={() => {
                            setSelectedBatch(lote);
                        }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all cursor-pointer group active:scale-[0.98]"
                    >
                        <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center group-hover:bg-indigo-50/30 transition-colors">
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-600 bg-white px-2 py-1 rounded-md border text-sm shadow-sm">{lote.codigo}</span>
                                {lote.propietario && (
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-white text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-100 shadow-sm">
                                        {lote.propietario}
                                    </span>
                                )}
                            </div>
                            <span className={clsx(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm",
                                lote.estado === 'planificado' && "bg-gray-100 text-gray-600 border border-gray-200",
                                lote.estado === 'corte' && "bg-amber-100 text-amber-700 border border-amber-200",
                                lote.estado === 'taller' && "bg-blue-100 text-blue-700 border border-blue-200",
                                lote.estado === 'terminado' && "bg-emerald-100 text-emerald-700 border border-emerald-200",
                            )}>
                                {lote.estado}
                            </span>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg leading-tight">
                                    {/* Mostrar múltiples productos si existen */}
                                    {lote.productos && lote.productos.length > 0
                                        ? lote.productos.map((lp: any) => lp.producto?.nombre).filter(Boolean).join(' + ')
                                        : (lote.producto?.nombre || 'Producto Desconocido')
                                    }
                                </h3>
                                <div className="mt-2 space-y-1">
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Scissors className="h-3 w-3" /> Modelo: <span className="font-medium">{lote.modelo_corte || 'N/A'}</span>
                                    </p>
                                    <p className="text-sm text-gray-600 flex items-center gap-1">
                                        <Package className="h-3 w-3" />
                                        {lote.estado === 'terminado'
                                            ? `Final: ${lote.cantidad_real} prendas`
                                            : `Tela Consumida: ${(lote.detalle_rollos || []).reduce((a: number, c: any) => a + (c.kg_consumido || 0), 0).toFixed(2)}kg`
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div
                                    className={clsx(
                                        "h-2 rounded-full transition-all duration-700",
                                        lote.estado === 'terminado' ? "bg-emerald-500" : "bg-indigo-600"
                                    )}
                                    // Si es terminado 100%, sino usamos el calculado o un default visual
                                    style={{ width: lote.estado === 'terminado' ? '100%' : `${lote.progreso_porcentaje || 10}%` }}
                                ></div>
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-400 italic">
                                <span>Click para gestionar etapas</span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm("¿Estás seguro de eliminar este lote? Se devolverá el stock de tela si es posible (no implementado en reverso automatico aún).")) {
                                            handleDelete(lote.id);
                                        }
                                    }}
                                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition-colors"
                                    title="Eliminar Lote"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal: Stepper Management */}
            {selectedBatch && (
                <div
                    className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
                    onClick={(e) => { if (e.target === e.currentTarget) setSelectedBatch(null); }}
                >
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900">Control de Etapas</h2>
                                <p className="text-sm text-gray-500 font-bold">{selectedBatch.producto?.nombre} - <span className="text-indigo-600">{selectedBatch.codigo}</span></p>
                            </div>
                            <button onClick={() => setSelectedBatch(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-400">
                                <X className="h-6 w-6" /> {/* Make sure X is imported if not already */}
                            </button>
                        </div>

                        <div className="p-10 overflow-y-auto">
                            {/* Stepper UI */}
                            <div className="relative flex justify-between items-center mb-12">
                                {/* Connecting Line */}
                                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 -z-0 rounded-full"></div>

                                {/* Steps */}
                                {/* Steps */}
                                {(() => {
                                    // Determine steps from snapshot or legacy fallback
                                    const steps = selectedBatch.proceso_snapshot?.pasos || [
                                        { nombre: 'planificado', orden: 0 },
                                        { nombre: 'corte', orden: 1 },
                                        { nombre: 'taller', orden: 2 },
                                        { nombre: 'terminado', orden: 3, requiere_input: true }
                                    ];

                                    // Find current index
                                    // We can use paso_actual_index if available, or find by name
                                    let currentIdx = selectedBatch.paso_actual_index ?? -1;
                                    if (currentIdx === -1) {
                                        currentIdx = steps.findIndex((s: any) => s.nombre.toLowerCase() === (selectedBatch.estado || '').toLowerCase());
                                    }
                                    if (currentIdx === -1 && selectedBatch.estado) currentIdx = 0; // Fallback

                                    return steps.map((step: any, idx: number) => {
                                        const isCompleted = idx <= currentIdx;
                                        const isCurrent = idx === currentIdx;
                                        // const isLast = idx === steps.length - 1; // Unused

                                        return (
                                            <button
                                                key={idx}
                                                // Only allow clicking if not already finished (or allow reverting?)
                                                // Let's allow clicking any previous or next step for flexibility
                                                onClick={() => updateStatus(selectedBatch.id, step.nombre)}
                                                className="relative z-10 flex flex-col items-center gap-3 group"
                                            >
                                                <div className={clsx(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center border-4 transition-all duration-300 shadow-sm",
                                                    isCurrent ? "bg-indigo-600 border-indigo-100 text-white scale-110 shadow-indigo-200" :
                                                        isCompleted ? "bg-indigo-100 border-indigo-50 text-indigo-600" :
                                                            "bg-white border-gray-100 text-gray-300 group-hover:border-gray-200"
                                                )}>
                                                    {/* Dynamic Icons based on name or index? */}
                                                    {/* Simple logic for standard names, generic for others */}
                                                    {step.nombre.toLowerCase().includes('planif') && <Package className="h-5 w-5" />}
                                                    {step.nombre.toLowerCase().includes('corte') && <Scissors className="h-5 w-5" />}
                                                    {step.nombre.toLowerCase().includes('taller') && <div className="font-black text-xs">MAQ</div>}
                                                    {step.nombre.toLowerCase().includes('terminado') && <CheckCircle className="h-5 w-5" />}
                                                    {/* Generic Icon for custom steps */}
                                                    {!['planificado', 'corte', 'taller', 'terminado'].some(k => step.nombre.toLowerCase().includes(k)) && (
                                                        <div className="font-black text-xs">{idx + 1}</div>
                                                    )}
                                                </div>
                                                <span className={clsx(
                                                    "text-xs font-black uppercase tracking-wider transition-colors max-w-[80px] text-center truncate",
                                                    isCurrent ? "text-indigo-600" :
                                                        isCompleted ? "text-indigo-400" : "text-gray-300"
                                                )} title={step.nombre}>
                                                    {step.nombre}
                                                </span>
                                            </button>
                                        );
                                    });
                                })()}
                            </div>


                            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 text-center">
                                <p className="text-blue-800 text-sm font-medium">
                                    💡 Haz click en cualquier etapa para mover el lote a ese estado.
                                    <br /><span className="text-xs opacity-70">Si seleccionas "Terminado", se te pedirá la cantidad final producida.</span>
                                </p>
                            </div>

                            {/* ROLLOS UTILIZADOS (EDITABLE) */}
                            {selectedBatch.detalle_rollos && selectedBatch.detalle_rollos.length > 0 && (
                                <div className="mt-8 bg-orange-50 rounded-2xl p-6 border border-orange-100 relative group/section">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-xs font-black uppercase text-orange-800 tracking-wider flex items-center gap-2">
                                            <div className="bg-orange-200 p-1.5 rounded-lg text-orange-700">
                                                <Package className="w-4 h-4" />
                                            </div>
                                            Rollos de Tela Utilizados
                                        </h3>
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                try {
                                                    const { error } = await supabase
                                                        .from('lotes_produccion')
                                                        .update({ detalle_rollos: selectedBatch.detalle_rollos }) // Save current state
                                                        .eq('id', selectedBatch.id);
                                                    if (error) throw error;
                                                    alert('Consumo actualizado correctamente');
                                                    fetchData(); // Refresh to be sure
                                                } catch (err: any) {
                                                    alert('Error: ' + err.message);
                                                }
                                            }}
                                            className="bg-orange-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase hover:bg-orange-700 shadow-sm transition-all active:scale-95 opacity-0 group-hover/section:opacity-100"
                                        >
                                            Guardar Consumo
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {selectedBatch.detalle_rollos.map((r: any, idx: number) => {
                                            const roll = rollDetailsForBatch[r.rollo_id];

                                            return (
                                                <div key={idx} className="bg-white p-3 rounded-xl border border-orange-200/60 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full group">
                                                    <div className="mb-2">
                                                        <div className="flex justify-between items-start">
                                                            <span className="block font-bold text-gray-800 text-sm leading-tight">{r.color || 'Sin Color'}</span>
                                                            <div className="h-2 w-2 rounded-full border border-gray-100" style={{ backgroundColor: r.color?.toLowerCase() }}></div>
                                                        </div>
                                                        {r.rollo_codigo && (
                                                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono mt-1 inline-block border border-gray-100">
                                                                {r.rollo_codigo}
                                                            </span>
                                                        )}
                                                        {/* Available context for user reference */}
                                                        {roll && (
                                                            <div className="text-[9px] text-gray-400 mt-1">
                                                                Disp: {roll.metros_restantes}m / {roll.peso_restante}kg
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="pt-2 border-t border-gray-100 grid grid-cols-1 gap-2 text-[10px] items-end">
                                                        <div>
                                                            <span className="text-gray-400 font-medium uppercase block mb-1">Kilogramos Consumidos</span>
                                                            <input
                                                                type="number"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-full font-bold text-orange-600 border-b-2 border-orange-200 bg-transparent focus:border-orange-500 outline-none p-0 text-lg hover:bg-orange-50 rounded"
                                                                value={r.kg_consumido || 0}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    const list = [...(selectedBatch.detalle_rollos || [])];
                                                                    list[idx] = { ...list[idx], kg_consumido: val };
                                                                    setSelectedBatch({ ...selectedBatch, detalle_rollos: list });
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 flex justify-end items-center gap-4 border-t border-orange-200 pt-3">
                                        <div className="text-right">
                                            <span className="text-xs text-orange-600 font-bold uppercase block">Peso Total Consumido</span>
                                            <span className="text-xl font-black text-orange-700">
                                                {selectedBatch.detalle_rollos.reduce((a: number, r: any) => a + Number(r.kg_consumido || 0), 0).toFixed(2)}kg
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PLANILLAS DE CORTE POR PRODUCTO */}
                            {(() => {
                                const lotProducts = selectedBatch.productos || [];
                                // If legacy single product or no relation, fallback? 
                                // Actually, we should try to show for all items found.

                                if (lotProducts.length === 0 && selectedBatch.producto) {
                                    // Fallback for lots without lote_productos rows (legacy)
                                    // We won't handle this complex case now to avoid bugs, assuming user ran the fix script.
                                    return <div className="text-gray-400 text-sm mt-4">No hay productos vinculados para desglosar corte.</div>;
                                }

                                const colors = Array.from(new Set(selectedBatch.detalle_rollos?.map(r => r.color || 'Sin Color') || [])).filter(Boolean);
                                if (colors.length === 0) return null;

                                return (
                                    <div className="mt-8 space-y-8">
                                        {lotProducts.map((lp: any) => {
                                            const prod = lp.producto;
                                            if (!prod || !prod.producto_talles) return null;

                                            // Sort sizes
                                            const sizes = (prod.producto_talles || []).sort((a: any, b: any) => a.orden - b.orden);

                                            // Local state for this specific matrix is tricky inside a map if we want to edit.
                                            // OPTION: We use the STATE from 'selectedBatch' which we loaded.
                                            // When we edit a cell, we update 'selectedBatch' state in memory (optimistic) and can save later.
                                            // OR give each block its own small logic. Let's use direct updates to a local map of changes or just update the main selectedBatch state.

                                            const currentDist = lp.tallas_distribucion || {};

                                            const cellValue = (color: string, talleId: string) => currentDist[color]?.[talleId] || 0;

                                            // Calculate total for this product
                                            const totalProd = Object.values(currentDist).reduce((acc: any, row: any) =>
                                                acc + Object.values(row).reduce((s: any, q: any) => Number(s) + Number(q), 0)
                                                , 0);

                                            return (
                                                <div key={lp.id} className="pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-700">
                                                                <Scissors className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <h3 className="font-bold text-gray-900 leading-tight">{prod.nombre}</h3>
                                                                <p className="text-xs text-gray-500 font-mono">{prod.codigo}</p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={async () => {
                                                                try {
                                                                    const { error } = await supabase
                                                                        .from('lote_productos')
                                                                        .update({
                                                                            tallas_distribucion: currentDist,
                                                                            cantidad_producto: totalProd
                                                                        })
                                                                        .eq('id', lp.id);

                                                                    if (error) throw error;

                                                                    // Also update parent lot total!
                                                                    // We need to sum ALL products totals.
                                                                    // This is a bit heavy, let's just alert success for now or refresh.
                                                                    alert(`Guardado ${prod.nombre}`);
                                                                    fetchData();
                                                                } catch (err: any) {
                                                                    alert('Error: ' + err.message);
                                                                }
                                                            }}
                                                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                                                        >
                                                            Guardar Cambios
                                                        </button>
                                                    </div>

                                                    <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
                                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                            <thead className="bg-gray-50">
                                                                <tr>
                                                                    <th className="px-4 py-3 text-left font-black text-gray-500 uppercase text-xs">Color \ Talle</th>
                                                                    {sizes.map((t: any) => (
                                                                        <th key={t.id} className="px-2 py-3 text-center font-bold text-gray-700 min-w-[50px]">
                                                                            {t.talla_codigo}
                                                                        </th>
                                                                    ))}
                                                                    <th className="px-4 py-3 text-right font-black text-gray-500 uppercase text-xs">Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-200 bg-white">
                                                                {colors.map((color: any) => {
                                                                    const rowTotal = sizes.reduce((sum: number, t: any) => sum + cellValue(color, t.id), 0);
                                                                    return (
                                                                        <tr key={color} className="hover:bg-gray-50/50">
                                                                            <td className="px-4 py-2 font-bold text-gray-900 break-words max-w-[120px]">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: color !== 'Sin Color' && color.toLowerCase() }}></div>
                                                                                    {color}
                                                                                </div>
                                                                            </td>
                                                                            {sizes.map((t: any) => (
                                                                                <td key={t.id} className="p-1">
                                                                                    <input
                                                                                        type="number"
                                                                                        min="0"
                                                                                        className="w-full text-center border-gray-200 bg-gray-50 rounded-lg py-1.5 focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-gray-700 transition-all"
                                                                                        value={cellValue(color, t.id) || ''}
                                                                                        onChange={e => {
                                                                                            const val = parseInt(e.target.value) || 0;
                                                                                            // UPDATE STATE DEEPLY
                                                                                            const newJson = { ...currentDist };
                                                                                            if (!newJson[color]) newJson[color] = {};
                                                                                            newJson[color][t.id] = val;

                                                                                            // Update selectedBatch state in memory
                                                                                            const newProds = selectedBatch?.productos?.map((p: any) => {
                                                                                                if (p.id === lp.id) {
                                                                                                    return { ...p, tallas_distribucion: newJson };
                                                                                                }
                                                                                                return p;
                                                                                            }) || [];
                                                                                            setSelectedBatch({ ...selectedBatch!, productos: newProds });
                                                                                        }}
                                                                                        placeholder="-"
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                            <td className="px-4 py-2 text-right font-black text-indigo-600">
                                                                                {rowTotal}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                            <tfoot className="bg-gray-50 font-bold">
                                                                <tr>
                                                                    <td className="px-4 py-3 text-gray-500 text-xs uppercase">Total {prod.nombre}</td>
                                                                    {sizes.map((t: any) => {
                                                                        const colTotal = colors.reduce((sum: number, c: any) => sum + cellValue(c, t.id), 0);
                                                                        return <td key={t.id} className="text-center py-3">{colTotal || '-'}</td>;
                                                                    })}
                                                                    <td className="px-4 py-3 text-right text-indigo-700 text-lg">
                                                                        {Number(totalProd)}
                                                                    </td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Create New Batch Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex-shrink-0">
                            <h2 className="text-2xl font-black text-gray-900">Iniciar Lote</h2>
                            <p className="text-sm text-gray-500 mt-1">Gestión de múltiples productos por lote</p>
                        </div>

                        <form onSubmit={handleCreateBatch} className="p-8 overflow-y-auto max-h-[calc(90vh-200px)] space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Código Lote</label>
                                    <input
                                        required
                                        className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={newBatch.codigo}
                                        onChange={e => setNewBatch({ ...newBatch, codigo: e.target.value })}
                                        placeholder="I-000XXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Modelo de Corte</label>
                                    <input
                                        required
                                        className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                        value={newBatch.modelo_corte}
                                        onChange={e => setNewBatch({ ...newBatch, modelo_corte: e.target.value })}
                                        placeholder="Ej: Slim Fit 2024"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Propietario del Lote (Socio)</label>
                                <select
                                    className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-bold text-indigo-900"
                                    value={newBatch.propietario || ''}
                                    onChange={e => setNewBatch({ ...newBatch, propietario: e.target.value })}
                                >
                                    <option value="">-- Todos / Empresa --</option>
                                    <option value="Soledad">Soledad</option>
                                    <option value="Tatiana">Tatiana</option>
                                    <option value="Florinda">Florinda</option>
                                </select>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Producto(s) a Confeccionar</label>
                                    <span className="text-[10px] text-gray-400">(Min: 1, Máx: 3)</span>
                                </div>

                                {/* Array de productos seleccionables */}
                                {(newBatch.productos_ids || ['']).map((prodId, index) => {
                                    // Filtrar productos ya seleccionados en otros índices
                                    const otherSelectedIds = (newBatch.productos_ids || [])
                                        .filter((id, i) => i !== index && id !== '');

                                    return (
                                        <div key={index} className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <select
                                                    required={index === 0} // Solo el primero es obligatorio
                                                    className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                                                    value={prodId}
                                                    onChange={e => {
                                                        const newProds = [...(newBatch.productos_ids || [''])];
                                                        newProds[index] = e.target.value;

                                                        // Auto-generar modelo_corte combinando códigos de todos los productos
                                                        const codigos = newProds
                                                            .filter(id => id !== '')
                                                            .map(id => {
                                                                const p = productos.find(prod => prod.id === id);
                                                                return p?.codigo || '';
                                                            })
                                                            .filter(Boolean);

                                                        const modeloCorteGenerado = codigos.length > 0
                                                            ? codigos.join('+')
                                                            : '';

                                                        setNewBatch({
                                                            ...newBatch,
                                                            productos_ids: newProds,
                                                            modelo_corte: modeloCorteGenerado
                                                        });
                                                    }}
                                                >
                                                    <option value="">Seleccionar producto {index + 1}...</option>
                                                    {productos
                                                        .filter(p => !otherSelectedIds.includes(p.id))
                                                        .map(p => (
                                                            <option key={p.id} value={p.id}>{p.nombre}</option>
                                                        ))
                                                    }
                                                </select>
                                            </div>

                                            {/* Botón para quitar producto (no mostrar en el primero o si solo hay 1) */}
                                            {(newBatch.productos_ids || []).length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newProds = (newBatch.productos_ids || ['']).filter((_, i) => i !== index);

                                                        // Regenerar modelo_corte después de quitar producto
                                                        const codigos = newProds
                                                            .filter(id => id !== '')
                                                            .map(id => {
                                                                const p = productos.find(prod => prod.id === id);
                                                                return p?.codigo || '';
                                                            })
                                                            .filter(Boolean);

                                                        const modeloCorteGenerado = codigos.length > 0
                                                            ? codigos.join('+')
                                                            : '';

                                                        setNewBatch({
                                                            ...newBatch,
                                                            productos_ids: newProds,
                                                            modelo_corte: modeloCorteGenerado
                                                        });
                                                    }}
                                                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                                    title="Quitar producto"
                                                >
                                                    <X className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Botón para agregar producto (máximo 3) */}
                                {(newBatch.productos_ids || ['']).length < 3 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewBatch({
                                                ...newBatch,
                                                productos_ids: [...(newBatch.productos_ids || ['']), '']
                                            });
                                        }}
                                        className="w-full border-2 border-dashed border-indigo-200 text-indigo-600 p-3 rounded-xl hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2 font-bold text-sm"
                                    >
                                        <Plus className="h-4 w-4" /> Agregar Producto (máx. 3)
                                    </button>
                                )}
                            </div>


                            {/* Selector de Proceso */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Proceso / Receta</label>
                                <select
                                    className="w-full border-gray-200 border-2 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-medium text-gray-700"
                                    // @ts-ignore
                                    value={newBatch.selectedProcessId || ''}
                                    onChange={e => setNewBatch({ ...newBatch, selectedProcessId: e.target.value })}
                                >
                                    <option value="">Proceso Estándar (Por Defecto)</option>
                                    {procesos.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.nombre} ({p.pasos?.length || 0} pasos)</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-gray-400 mt-1 ml-1">
                                    * Se seleccionó automáticamente el proceso del producto, pero puedes cambiarlo aquí.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Carga de Rollos (Tendido)</label>
                                    <button type="button" onClick={handleAddRollo} className="text-indigo-600 font-bold text-xs flex items-center gap-1 hover:underline">
                                        <Plus className="h-3 w-3" /> Agregar Rollo
                                    </button>
                                </div>

                                {/* Filtros de Rollos */}
                                <div className="bg-indigo-50 p-3 rounded-xl grid grid-cols-2 gap-3 mb-2">
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-indigo-800 block mb-1">Filtrar por Tela</label>
                                        <select
                                            className="w-full text-xs p-2 rounded-lg border-indigo-200 focus:ring-indigo-500"
                                            value={rollFilters.tipo}
                                            onChange={e => setRollFilters({ ...rollFilters, tipo: e.target.value })}
                                        >
                                            <option value="">Todas</option>
                                            {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase font-bold text-indigo-800 block mb-1">Buscar Metros (Aprox)</label>
                                        <FormattedNumberInput
                                            className="w-full text-xs p-2 rounded-lg border-indigo-200 focus:ring-indigo-500"
                                            placeholder="Ej: 50"
                                            value={Number(rollFilters.metros) || 0}
                                            onChange={val => setRollFilters({ ...rollFilters, metros: val.toString() })}
                                        />
                                    </div>
                                </div>

                                <div className="max-h-56 overflow-y-auto space-y-2 pr-2">
                                    {newBatch.detalle_rollos?.map((r, i) => {
                                        // Filter out rolls selected in other rows
                                        const otherSelectedIds = newBatch.detalle_rollos
                                            ?.map((val, idx) => idx !== i ? val.rollo_id : null)
                                            .filter(Boolean) as string[];

                                        const rowOptions = availableRolls.filter(ar =>
                                            ar.id === r.rollo_id || !otherSelectedIds.includes(ar.id)
                                        );

                                        return (
                                            <div key={i} className="flex flex-col gap-2 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                <div className="flex gap-2 items-center">
                                                    <div className="flex-1">
                                                        <select
                                                            className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            value={r.rollo_id || ''}
                                                            onChange={e => handleRolloSelect(i, e.target.value)}
                                                        >
                                                            <option value="">-- Seleccionar Rollo --</option>
                                                            {rowOptions.map((ar: any) => (
                                                                <option key={ar.id} value={ar.id}>
                                                                    {`${ar.color || 'S/C'} (${ar.peso_restante || 0}kg disp) - ${ar.tipo_tela}`}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    {i > 0 && (
                                                        <button type="button" onClick={() => handleRemoveRollo(i)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="flex gap-3 items-center">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 px-2">
                                                            <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: r.color?.toLowerCase() }}></div>
                                                            <span className="text-xs font-bold text-gray-500">{r.color || '-'}</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-32">
                                                        <div className="relative">
                                                            <label className="text-[9px] font-bold text-gray-400 uppercase absolute -top-3 left-1">Consumo (Kg)</label>
                                                            <FormattedNumberInput
                                                                placeholder="0"
                                                                className="w-full bg-white border border-gray-200 p-2 rounded-lg text-sm font-bold text-right text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                                                                value={Number(r.kg_consumido)}
                                                                onChange={val => updateRollo(i, 'kg_consumido', val)}
                                                                suffix={<span className="text-[10px] text-gray-400 font-bold ml-1">kg</span>}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>




                            <div className="flex justify-end gap-3 mt-8">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all">Crear Lote</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Finalizar Lote (Cantidad Real) */}
            {showRealQtyModal && (() => {
                const lote = showRealQtyModal;
                const lotProducts = lote.productos || [];
                const hasMultipleProducts = lotProducts.length > 1;
                const hasAnyProducts = lotProducts.length > 0;

                return (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">
                            <h2 className="text-xl font-black mb-2">Finalizar Producción</h2>
                            <p className="text-gray-500 text-sm mb-6">
                                {hasMultipleProducts
                                    ? `Ingresa la cantidad real producida para cada producto del lote ${lote.codigo}:`
                                    : `¿Cuántas prendas se cortaron finalmente?`}
                            </p>

                            <form onSubmit={handleFinalizeProduction} className="space-y-6">
                                {hasAnyProducts ? (
                                    <div className="space-y-4">
                                        {lotProducts.map((lp) => {
                                            const prod = lp.producto;
                                            if (!prod) return null;

                                            return (
                                                <div key={prod.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <div>
                                                            <span className="font-bold text-gray-900">{prod.nombre}</span>
                                                            <span className="ml-2 text-xs text-gray-500 font-mono">{prod.codigo}</span>
                                                        </div>
                                                    </div>
                                                    <FormattedNumberInput
                                                        value={realQtyPerProduct[prod.id] || 0}
                                                        onChange={(val) => setRealQtyPerProduct({
                                                            ...realQtyPerProduct,
                                                            [prod.id]: val
                                                        })}
                                                        className="w-full border-gray-200 border-2 p-3 rounded-xl text-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-center"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            );
                                        })}

                                        {/* Total Summary */}
                                        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex justify-between items-center">
                                            <span className="font-bold text-emerald-800">Total Producido:</span>
                                            <span className="text-2xl font-black text-emerald-600">
                                                {Object.values(realQtyPerProduct).reduce((sum, qty) => sum + qty, 0)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    /* Legacy: Single product */
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                            Cantidad Real Producida ({lote.producto?.nombre || 'Producto'})
                                        </label>
                                        <FormattedNumberInput
                                            value={realQtyPerProduct[lote.producto_id] || 0}
                                            onChange={(val) => setRealQtyPerProduct({
                                                ...realQtyPerProduct,
                                                [lote.producto_id]: val
                                            })}
                                            className="w-full border-gray-200 border-2 p-4 rounded-xl text-2xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                            placeholder="0"
                                        />
                                    </div>
                                )}

                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setShowRealQtyModal(null)} className="px-5 py-2 text-gray-500 font-bold">Cancelar</button>
                                    <button type="submit" className="px-8 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:scale-95 transition-all">Terminar Lote</button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};
