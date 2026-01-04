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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
});
