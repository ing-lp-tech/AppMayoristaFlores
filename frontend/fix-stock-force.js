import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
const headers = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' };

async function fix() {
    try {
        console.log("Getting D001...");
        let res = await fetch(`${URL}/rest/v1/productos?codigo=eq.D001&select=id`, { headers });
        let prod = (await res.json())[0];

        console.log("Getting Talles...");
        res = await fetch(`${URL}/rest/v1/producto_talles?producto_id=eq.${prod.id}&select=id,talla_codigo`, { headers });
        let talles = await res.json();

        const newStockPorColor = {
            "Vizon melange": 10,
            "Chocolate melange": 11,
            "Crema melange": 11,
            "Marino": 10
        };

        for (const t of talles) {
            console.log(`Patching talle ${t.talla_codigo}...`);
            await fetch(`${URL}/rest/v1/producto_talles?id=eq.${t.id}`, {
                method: 'PATCH',
                headers,
                body: JSON.stringify({ stock_por_color: newStockPorColor })
            });
        }
        console.log("✅ Repair complete!");
    } catch (e) { console.error(e); }
}
fix();
