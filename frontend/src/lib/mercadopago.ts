// Hook para integrar MercadoPago Checkout Pro SDK
// El SDK se carga desde index.html (https://sdk.mercadopago.com/js/v2)
// La Public Key viene de VITE_MP_PUBLIC_KEY en el .env

declare global {
    interface Window {
        MercadoPago: any;
    }
}

let mpInstance: any = null;

/**
 * Obtiene (o crea) la instancia de MercadoPago con la Public Key.
 * El SDK debe estar cargado en el HTML para que esto funcione.
 */
export const getMPInstance = () => {
    const publicKey = import.meta.env.VITE_MP_PUBLIC_KEY;
    if (!publicKey || publicKey === 'TU_PUBLIC_KEY_AQUI') {
        console.warn('[MP] VITE_MP_PUBLIC_KEY no configurada en .env');
        return null;
    }
    if (!window.MercadoPago) {
        console.warn('[MP] SDK de MercadoPago no cargado aún');
        return null;
    }
    if (!mpInstance) {
        mpInstance = new window.MercadoPago(publicKey, { locale: 'es-AR' });
    }
    return mpInstance;
};

/**
 * Abre el Checkout Pro de MercadoPago dado un preference_id.
 * En mobile abre la app de MP directamente.
 * En desktop muestra el modal de pago.
 */
export const openCheckoutPro = (preferenceId: string, callbacks?: {
    onReady?: () => void;
    onError?: (error: any) => void;
}) => {
    const mp = getMPInstance();
    if (!mp) {
        // Fallback: redirigir a init_point si el SDK no está disponible
        console.error('[MP] No se pudo inicializar el SDK');
        return false;
    }

    const bricksBuilder = mp.bricks();

    bricksBuilder.create('wallet', 'mp-wallet-container', {
        initialization: {
            preferenceId: preferenceId,
            redirectMode: 'modal', // 'modal' en desktop, app en mobile automático
        },
        callbacks: {
            onReady: callbacks?.onReady || (() => { }),
            onError: callbacks?.onError || ((error: any) => console.error('[MP Brick] Error:', error)),
        },
        customization: {
            texts: {
                action: 'pay',
                valueProp: 'smart_option',
            },
        },
    });

    return true;
};
