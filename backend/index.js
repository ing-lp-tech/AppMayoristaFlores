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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
