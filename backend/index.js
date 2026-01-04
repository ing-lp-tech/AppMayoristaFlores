const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permitir que el frontend nos llame
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({
        mensaje: "¡Hola! Soy tu Servidor Node.js Manual",
        estado: "Funcionando correctamente",
        timestamp: new Date().toISOString()
    });
});

// Ruta para el Widget Visual del Frontend
app.get('/api/status', (req, res) => {
    // Simulamos un estado
    const estados = [
        { text: 'Sistema Operativo', color: 'bg-green-500', message: 'El backend manual responde correctamente.' },
    ];

    const estadoActual = estados[0];

    res.json({
        online: true,
        ...estadoActual,
        timestamp: new Date().toLocaleTimeString()
    });
});

app.post('/procesar-pedido', (req, res) => {
    const { pedidoId } = req.body;
    console.log(`Procesando pedido ${pedidoId}...`);
    res.json({ success: true, mensaje: `Pedido ${pedidoId} recibido en el servidor manual.` });
});

// ==========================================
// FEATURE: Generador de QR para Lotes
// ==========================================
const QRCode = require('qrcode');

app.get('/api/lotes/qr', async (req, res) => {
    try {
        const { loteId, texto } = req.query;

        if (!loteId) {
            return res.status(400).json({ error: 'Falta el parámetro loteId' });
        }

        // El texto que irá en el QR (puede ser una URL o solo el ID)
        const qrData = JSON.stringify({
            tipo: 'lote_produccion',
            id: loteId,
            info: texto || ''
        });

        // Generar el QR como Data URL (imagen en base64)
        const qrImage = await QRCode.toDataURL(qrData);

        res.json({
            success: true,
            loteId,
            qrImage: qrImage // Esto se pone directo en un tags <img src="..." />
        });

    } catch (error) {
        console.error('Error generando QR:', error);
        res.status(500).json({ error: 'Error interno generando el código QR' });
    }
});

// ==========================================
// CONFIGURACIÓN SUPABASE (Backend)
// ==========================================
const { createClient } = require('@supabase/supabase-js');

// Estas variables deben configurarse en el panel de Vercel
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ¡Cuidado! Usar la Service Role Key, no la Anon Key

const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

// ==========================================
// FEATURE: Duplicador de Productos
// ==========================================
app.post('/api/products/duplicate', async (req, res) => {
    try {
        if (!supabase) {
            return res.status(500).json({ error: 'Supabase no está configurado en el backend.' });
        }

        const { productId, newName } = req.body;

        if (!productId) return res.status(400).json({ error: 'Falta productId' });

        // 1. Obtener el producto original
        const { data: original, error: fetchError } = await supabase
            .from('productos')
            .select('*')
            .eq('id', productId)
            .single();

        if (fetchError || !original) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        // 2. Preparar el nuevo objeto (Limpiamos ID y fechas)
        const { id, creado_en, actualizado_en, ...productData } = original;

        const newProductData = {
            ...productData,
            nombre: newName || `${original.nombre} (Copia)`,
            codigo: `${original.codigo}-COPY-${Date.now().toString().slice(-4)}`, // Generar código único temporal
            stock_total: 0, // Resetear stock por seguridad
            slug: null // Dejar que la DB o el frontend genere uno nuevo si es necesario
        };

        // 3. Insertar el nuevo producto
        const { data: newProduct, error: insertError } = await supabase
            .from('productos')
            .insert(newProductData)
            .select()
            .single();

        if (insertError) {
            console.error('Error insertando copia:', insertError);
            return res.status(500).json({ error: 'Error creando la copia del producto' });
        }

        // 4. (Opcional) Aquí deberíamos copiar también los "talles" (ProductoTalla)
        // consultando la tabla 'producto_talles' y re-insertándolos con el nuevo ID.
        // Por simplicidad en este ejemplo, solo copiamos el producto base.

        res.json({
            success: true,
            message: 'Producto duplicado correctamente',
            originalId: productId,
            newProduct: newProduct
        });

    } catch (error) {
        console.error('Error duplicando:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});
