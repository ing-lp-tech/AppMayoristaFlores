import { supabase } from '../lib/supabase';

export const paymentService = {
    async createPaymentPreference(
        items: any[],
        payer: any,
        externalReference: string,
        amount: number, // Monto a cobrar (puede ser total o seña)
        isDeposit: boolean = false // Si es seña
    ) {
        try {
            // Estructuramos los items para MP
            // Si es seña, creamos un item único que representa la seña del pedido
            let mpItems;

            if (isDeposit) {
                mpItems = [{
                    id: 'SENA',
                    title: `Seña Pedido #${externalReference}`,
                    quantity: 1,
                    currency_id: 'ARS',
                    unit_price: amount
                }];
            } else {
                // Si es total, mapeamos los productos
                mpItems = items.map(item => ({
                    id: item.producto.id,
                    title: item.producto.nombre,
                    quantity: item.cantidad || item.cantidad_curvas, // Ajustar según estructura
                    currency_id: 'ARS',
                    unit_price: item.precio_unitario || item.precio_curva // Ajustar según estructura
                }));
            }

            const { data, error } = await supabase.functions.invoke('create-preference', {
                body: {
                    items: mpItems,
                    payer: payer,
                    external_reference: externalReference,
                    back_urls: {
                        success: `${window.location.origin}/checkout/success`,
                        failure: `${window.location.origin}/checkout/failure`,
                        pending: `${window.location.origin}/checkout/pending`
                    },
                    auto_return: 'approved'
                }
            });

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Error creating payment preference:', error);
            throw error;
        }
    }
};
