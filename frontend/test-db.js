import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split(/\r?\n/).forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
});
const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_ANON_KEY;
const headers = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function check() {
    let res = await fetch(`${URL}/rest/v1/productos?codigo=eq.D001&select=colores`, { headers });
    let prod = (await res.json())[0];
    console.log(prod.colores);
}
check();
