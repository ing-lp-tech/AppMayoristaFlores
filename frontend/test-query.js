import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmyuztkbevcsbcpxlyhf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhteXV6dGtiZXZjc2JjcHhseWhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzQ4MDgsImV4cCI6MjA4MjU1MDgwOH0.5WGa0VLdIp1fJsgmKnqswemWt3e2gian3v2YYOdVNps';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    // Verificamos producto_talles
    const { data: d1 } = await supabase.from('producto_talles').select('*').limit(1);
    console.log("producto_talles:", Object.keys(d1?.[0] || {}));

    const { data: d2 } = await supabase.from('productos').select('*').limit(1);
    console.log("productos:", Object.keys(d2?.[0] || {}));
}
checkSchema();
