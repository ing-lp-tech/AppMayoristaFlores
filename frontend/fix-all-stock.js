import fs from 'fs';

// Read .env file for credentials
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
const headers = {
    'apikey': KEY,
    'Authorization': `Bearer ${KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

async function fixAllProducts() {
    try {
        console.log("Obteniendo todos los productos y sus talles...");

        // Fetch all products that have colores configured
        const res = await fetch(`${URL}/rest/v1/productos?select=id,codigo,nombre,colores,producto_talles(id,talla_codigo,stock)&stock_total=gt.0`, { headers });
        const products = await res.json();

        console.log(`Encontrados ${products.length} productos con stock > 0.`);

        let tallesUpdated = 0;

        for (const prod of products) {
            // Check if product has valid 'colores' array
            if (!prod.colores || !Array.isArray(prod.colores) || prod.colores.length === 0) {
                console.log(`[Saltando] Producto ${prod.codigo} - ${prod.nombre} no tiene colores definidos.`);
                continue;
            }

            const colorNames = prod.colores.map(c => c.nombre).filter(Boolean);
            if (colorNames.length === 0) {
                continue;
            }

            console.log(`[Procesando] Producto ${prod.codigo} - ${prod.colores.length} colores.`);

            // Distribute stock across talles
            for (const talle of prod.producto_talles) {
                if (!talle.stock || talle.stock <= 0) continue;

                // Split stock evenly among all colors
                const stockPerColor = Math.floor(talle.stock / colorNames.length);
                const remainder = talle.stock % colorNames.length;

                const newStockPorColor = {};
                for (let i = 0; i < colorNames.length; i++) {
                    const colorName = colorNames[i];
                    newStockPorColor[colorName] = stockPerColor + (i === 0 ? remainder : 0); // Give remainder to the first color
                }

                // Make the update
                const patchRes = await fetch(`${URL}/rest/v1/producto_talles?id=eq.${talle.id}`, {
                    method: 'PATCH',
                    headers,
                    body: JSON.stringify({ stock_por_color: newStockPorColor })
                });

                if (patchRes.ok) {
                    tallesUpdated++;
                } else {
                    console.error(`Error actualizando talle ${talle.id} del prod ${prod.codigo}`);
                }
            }
        }
        console.log(`✅ ¡Reparación completada! Se inyectó stock por color en ${tallesUpdated} talles diferentes.`);
    } catch (e) {
        console.error("Critical error:", e);
    }
}

fixAllProducts();
