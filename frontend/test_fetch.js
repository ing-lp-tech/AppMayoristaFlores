
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xmyuztkbevcsbcpxlyhf.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_IkUtmLTzcxr-SVaLtE6XUw_0K0_42tK'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testFetch() {
    const { data, error } = await supabase
        .from('productos')
        .select('*, producto_talles(*)')
        .eq('visible_publico', true)

    if (error) {
        console.error('Error fetching:', error)
    } else {
        console.log('Products found:', data.length)
        if (data.length > 0) {
            console.log('First product:', data[0].nombre)
        }
    }
}

testFetch()
