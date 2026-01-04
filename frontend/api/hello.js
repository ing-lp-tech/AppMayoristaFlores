export default function handler(req, res) {
    // Esta función se ejecuta en el SERVIDOR de Vercel, no en el navegador del usuario.
    // Aquí podrías conectarte a bases de datos secretas, procesar pagos, etc.

    const currentTime = new Date().toISOString();

    res.status(200).json({
        message: "¡Hola desde el Backend de Vercel!",
        server_time: currentTime,
        secret_message: "Este mensaje fue generado en el servidor."
    });
}
