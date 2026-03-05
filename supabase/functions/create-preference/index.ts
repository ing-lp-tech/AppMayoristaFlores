import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
        if (!accessToken) {
            throw new Error('MP_ACCESS_TOKEN no configurado');
        }

        const { items, payer, external_reference, back_urls, auto_return } = await req.json();

        // Llamada directa a la API REST de MercadoPago (sin SDK)
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'X-Idempotency-Key': external_reference || crypto.randomUUID(),
            },
            body: JSON.stringify({
                items,
                payer,
                external_reference,
                back_urls: back_urls || {
                    success: 'https://app-mayorista-flores.vercel.app/checkout/success',
                    failure: 'https://app-mayorista-flores.vercel.app/checkout/failure',
                    pending: 'https://app-mayorista-flores.vercel.app/checkout/pending',
                },
                auto_return: auto_return || 'approved',
            }),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(result));
        }

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('create-preference error:', error.message);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
    }
});
