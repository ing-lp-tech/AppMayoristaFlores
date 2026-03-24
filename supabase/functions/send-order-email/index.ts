import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const OWNER_EMAIL = Deno.env.get('OWNER_EMAIL') || 'ing.lp.tech@gmail.com';
    const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';
    const STORE_NAME = Deno.env.get('STORE_NAME') || 'SCARGO';

    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY no configurado');

    const { pedido_id } = await req.json();
    if (!pedido_id) throw new Error('pedido_id requerido');

    // Fetch order data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .select(`
        *,
        items_minorista:pedido_items_minorista(*, producto:productos(nombre, codigo)),
        items_mayorista:pedido_items_mayorista(*, producto:productos(nombre, codigo))
      `)
      .eq('id', pedido_id)
      .single();

    if (error || !pedido) throw new Error('Pedido no encontrado');

    const isMayorista = pedido.tipo_cliente_pedido === 'mayorista';
    const items = isMayorista ? (pedido.items_mayorista || []) : (pedido.items_minorista || []);

    // Build items HTML rows
    const itemsRows = items.map((item: any) => {
      const nombre = item.producto?.nombre || 'Producto';
      if (isMayorista) {
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${nombre}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.cantidad_curvas} u.</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">$${item.subtotal?.toLocaleString('es-AR')}</td>
        </tr>`;
      } else {
        const color = item.color_nombre ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${item.color_hex || '#ccc'};margin-right:4px;"></span>${item.color_nombre}` : '-';
        return `<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;">${nombre}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${color}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${item.cantidad}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">$${item.subtotal?.toLocaleString('es-AR')}</td>
        </tr>`;
      }
    }).join('');

    const tableHeader = isMayorista
      ? '<tr style="background:#f9fafb;"><th style="padding:10px 12px;text-align:left;">Producto</th><th style="padding:10px 12px;text-align:center;">Cantidad</th><th style="padding:10px 12px;text-align:right;">Subtotal</th></tr>'
      : '<tr style="background:#f9fafb;"><th style="padding:10px 12px;text-align:left;">Producto</th><th style="padding:10px 12px;text-align:center;">Color</th><th style="padding:10px 12px;text-align:center;">Cant.</th><th style="padding:10px 12px;text-align:right;">Subtotal</th></tr>';

    // ── Email HTML template ──────────────────────────────────────────────────
    const baseHtml = (title: string, intro: string, extra = '') => `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px;">${STORE_NAME}</h1>
          <p style="margin:8px 0 0;color:#bfdbfe;font-size:14px;font-weight:600;">${title}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px 40px;">
          <p style="margin:0 0 24px;color:#374151;font-size:16px;line-height:1.6;">${intro}</p>
          <!-- Order info -->
          <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
            <p style="margin:0 0 8px;font-size:13px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Detalle del Pedido</p>
            <p style="margin:0 0 4px;font-size:22px;font-weight:900;color:#111827;">#${pedido.codigo_pedido}</p>
            <p style="margin:0;font-size:13px;color:#6b7280;">${pedido.cliente_nombre} &nbsp;·&nbsp; ${pedido.ciudad_envio}</p>
          </div>
          <!-- Items table -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px;">
            <thead>${tableHeader}</thead>
            <tbody>${itemsRows}</tbody>
          </table>
          <!-- Total -->
          <div style="background:#1d4ed8;border-radius:12px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#bfdbfe;font-weight:700;font-size:14px;">TOTAL DEL PEDIDO</span>
            <span style="color:#fff;font-size:24px;font-weight:900;">$${pedido.total?.toLocaleString('es-AR')}</span>
          </div>
          ${extra}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">${STORE_NAME} &copy; ${new Date().getFullYear()} &nbsp;·&nbsp; Este es un correo automático, no respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    // ── Customer email ───────────────────────────────────────────────────────
    const customerExtra = `
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px 20px;margin-top:20px;">
        <p style="margin:0 0 6px;font-weight:800;color:#1e40af;font-size:14px;">📋 Estado de tu pago</p>
        <p style="margin:0;color:#1d4ed8;font-size:14px;line-height:1.6;">
          Verificaremos la transferencia y confirmaremos tu pedido a la brevedad. 
          Te notificaremos por este mismo correo o por WhatsApp cuando esté confirmado.
        </p>
      </div>`;

    const customerHtml = baseHtml(
      '¡Pedido Registrado!',
      `Hola <strong>${pedido.cliente_nombre?.split(' ')[0]}</strong>, recibimos tu pedido correctamente. A continuación encontrás el resumen de tu compra:`,
      customerExtra
    );

    // ── Owner email ──────────────────────────────────────────────────────────
    const ownerExtra = `
      <div style="background:#fef3c7;border-radius:12px;padding:16px 20px;margin-top:20px;">
        <p style="margin:0 0 6px;font-weight:800;color:#92400e;font-size:14px;">Datos del Cliente</p>
        <p style="margin:0;color:#78350f;font-size:13px;line-height:1.8;">
          📧 ${pedido.cliente_email || 'Sin email'}<br>
          📱 ${pedido.cliente_telefono || '-'}<br>
          📍 ${pedido.direccion_envio || '-'}, ${pedido.ciudad_envio || '-'}<br>
          💳 Tipo: <strong>${isMayorista ? 'MAYORISTA' : 'MINORISTA'}</strong>
        </p>
      </div>`;

    const ownerHtml = baseHtml(
      '🛍️ Nuevo Pedido Recibido',
      `Se registró un nuevo pedido de <strong>${pedido.cliente_nombre}</strong>. Verificá la transferencia y confirmá el pedido desde el panel de administración.`,
      ownerExtra
    );

    // ── Send emails via Resend ───────────────────────────────────────────────
    const sendEmails = [];

    // Always send to owner
    sendEmails.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${STORE_NAME} <${FROM_EMAIL}>`,
          to: [OWNER_EMAIL],
          subject: `🛍️ Nuevo pedido #${pedido.codigo_pedido} — $${pedido.total?.toLocaleString('es-AR')}`,
          html: ownerHtml,
        }),
      })
    );

    // Send to customer only if they provided an email
    if (pedido.cliente_email) {
      sendEmails.push(
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: `${STORE_NAME} <${FROM_EMAIL}>`,
            to: [pedido.cliente_email],
            subject: `✅ Tu pedido #${pedido.codigo_pedido} fue registrado`,
            html: customerHtml,
          }),
        })
      );
    }

    const results = await Promise.all(sendEmails);
    const failed = results.filter(r => !r.ok);

    if (failed.length > 0) {
      const errText = await failed[0].text();
      console.error('Resend error:', errText);
      throw new Error(`Error enviando email: ${errText}`);
    }

    return new Response(JSON.stringify({ success: true, emails_sent: sendEmails.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('send-order-email error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
