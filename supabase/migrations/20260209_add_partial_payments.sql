-- Add columns for payment handling
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS pago_tipo text DEFAULT 'total', -- 'total', 'sena', 'a_convenir'
ADD COLUMN IF NOT EXISTS monto_pagado numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_pendiente numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS mercadopago_preference_id text,
ADD COLUMN IF NOT EXISTS mercadopago_status text;

COMMENT ON COLUMN public.pedidos.pago_tipo IS 'Tipo de pago seleccionado: total, sena (parcial) o a_convenir';
COMMENT ON COLUMN public.pedidos.monto_pagado IS 'Monto efectivamente abonado por el cliente';
COMMENT ON COLUMN public.pedidos.monto_pendiente IS 'Saldo restante a pagar';
