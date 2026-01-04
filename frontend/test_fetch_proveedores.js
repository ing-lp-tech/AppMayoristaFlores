import { createClient } from '@supabase/supabase-js'

// Using the keys from the user's previous context or env (assuming standard env vars for Vite)
// I'll grab them from the source code I previously saw or just use the ones I know.
// Previous fetch script used these:
const SUPABASE_URL = 'https://xmyuztkbevcsbcpxlyhf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_IkUtmLTzcxr-SVaLtE6XUw_0K0_42tK'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testFetch() {
    // Try to login if possible, or just test public access if that was the intent.
    // The user is authenticated in the app. Testing anon access first to see if that's the issue.
    // But providers is likely an admin-only table.

    console.log("Testing Anon Fetch...")
    const { data, error } = await supabase
        .from('proveedores')
        .select('*')

    if (error) {
        console.error('Anon Fetch Error:', error)
    } else {
        console.log('Anon Users found:', data.length)
    }
}

testFetch()
