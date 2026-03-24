import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function repairStock() {
    console.log("Starting stock repair...");

    const { data: prod } = await supabase.from('productos').select('*').eq('codigo', 'D001').single();
    if (!prod) return console.log("Product D001 not found");
    console.log(`Found Product: ${prod.nombre} (ID: ${prod.id})`);

    const { data: lotes } = await supabase
        .from('lotes_produccion')
        .select('*')
        .eq('estado', 'terminado')
        .order('creado_en', { ascending: false });

    const loteD001 = lotes.find(l => {
        if (l.producto_id === prod.id) return true;
        if (l.productos && l.productos.some(p => p.producto?.id === prod.id || p.producto_id === prod.id)) return true;
        return false;
    });

    if (!loteD001) return console.log("No finished lot found for D001");
    console.log(`Found finished lot: ${loteD001.codigo}`);

    let distribution = null;
    if (loteD001.tallas_distribucion && Object.keys(loteD001.tallas_distribucion).length > 0) {
        distribution = loteD001.tallas_distribucion;
    } else if (loteD001.productos) {
        const prodData = loteD001.productos.find(p => p.producto?.id === prod.id || p.producto_id === prod.id);
        if (prodData && prodData.tallas_distribucion) distribution = prodData.tallas_distribucion;
    }

    if (!distribution) return console.log("No distribution found in lot");
    console.log("Distribution:", JSON.stringify(distribution, null, 2));

    const { data: talles } = await supabase.from('producto_talles').select('*').eq('producto_id', prod.id);

    for (const talle of talles) {
        let newStockPorColor = {};
        let talleTotal = 0;

        for (const [color, tallesDist] of Object.entries(distribution)) {
            if (tallesDist[talle.id]) {
                const qty = tallesDist[talle.id];
                newStockPorColor[color] = qty;
                talleTotal += qty;
            }
        }

        console.log(`Updating Talle ${talle.talla_codigo}: stock ${talleTotal}, colors:`, newStockPorColor);

        await supabase
            .from('producto_talles')
            .update({
                stock: talleTotal,
                stock_por_color: newStockPorColor
            })
            .eq('id', talle.id);
    }

    console.log(`Finished repairing D001.`);
}

repairStock().catch(console.error);
