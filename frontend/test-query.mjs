import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'missing',
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || 'missing'
);

async function testQuery() {
    const { data, error } = await supabase
        .from('pedidos')
        .select(`
            *,
            items_minorista:pedido_items_minorista(
                *,
                producto:productos(nombre, codigo),
                talla:producto_tallas(talla_codigo, talla_nombre)
            ),
            items_mayorista:pedido_items_mayorista(
                *,
                producto:productos(nombre, codigo)
            )
        `)
        .order('creado_en', { ascending: false });

    if (error) {
        console.error('ERROR EN QUERY:', error);
    } else {
        console.log('QUERY OK. Total records:', data.length);
    }
}

testQuery();
