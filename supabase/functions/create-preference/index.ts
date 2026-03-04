import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { MercadoPagoConfig, Preference } from 'npm:mercadopago';

// Configuración de CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Obtener Access Token de las variables de entorno
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            throw new Error('MP_ACCESS_TOKEN no configurado');
        }

        // 2. Inicializar cliente de MercadoPago
        const client = new MercadoPagoConfig({ accessToken: accessToken });
        const preference = new Preference(client);

        // 3. Parsear body del request
        const { items, payer, external_reference, back_urls, auto_return } = await req.json();

        // 4. Crear preferencia
        const body = {
            items: items,
            payer: payer,
            external_reference: external_reference,
            back_urls: back_urls || {
                success: 'http://localhost:5173/checkout/success', // Reemplazar con URL real en prod
                failure: 'http://localhost:5173/checkout/failure',
                pending: 'http://localhost:5173/checkout/pending'
            },
            auto_return: auto_return || 'approved',
        };

        const result = await preference.create({ body });

        return new Response(
            JSON.stringify(result),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
