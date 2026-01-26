
// List of colors with Spanish names
const colorNames: { hex: string; name: string }[] = [
    { hex: "#000000", name: "Negro" },
    { hex: "#FFFFFF", name: "Blanco" },
    { hex: "#FF0000", name: "Rojo" },
    { hex: "#00FF00", name: "Verde" },
    { hex: "#0000FF", name: "Azul" },
    { hex: "#FFFF00", name: "Amarillo" },
    { hex: "#00FFFF", name: "Cian" },
    { hex: "#FF00FF", name: "Magenta" },
    { hex: "#C0C0C0", name: "Plata" },
    { hex: "#808080", name: "Gris" },
    { hex: "#800000", name: "Maroon" },
    { hex: "#808000", name: "Oliva" },
    { hex: "#008000", name: "Verde Oscuro" },
    { hex: "#800080", name: "Púrpura" },
    { hex: "#008080", name: "Verde Azulado" },
    { hex: "#000080", name: "Azul Marino" },
    { hex: "#FFA500", name: "Naranja" },
    { hex: "#A52A2A", name: "Marrón" },
    { hex: "#F5F5DC", name: "Beige" },
    { hex: "#FFC0CB", name: "Rosa" },
    { hex: "#FF69B4", name: "Rosa Chicle" },
    { hex: "#4B0082", name: "Índigo" },
    { hex: "#ADD8E6", name: "Azul Claro" },
    { hex: "#90EE90", name: "Verde Claro" },
    { hex: "#FFB6C1", name: "Rosa Claro" },
    { hex: "#FFA07A", name: "Salmón" },
    { hex: "#40E0D0", name: "Turquesa" },
    { hex: "#EE82EE", name: "Violeta" },
    { hex: "#D2B48C", name: "Bronceado" },
    { hex: "#87CEEB", name: "Azul Cielo" },
    { hex: "#FF6347", name: "Tomate" },
    { hex: "#FFD700", name: "Dorado" },
    { hex: "#A0522D", name: "Siena" },
    { hex: "#8B4513", name: "Marrón Silla" },
    { hex: "#FA8072", name: "Salmón" },
    { hex: "#2E8B57", name: "Verde Mar" }
];

export const getColorName = (inputHex: string): string => {
    // Remove # if present
    const hex = inputHex.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return "Color Personalizado";

    let minDistance = Infinity;
    let nearestColor = "Personalizado";

    for (const color of colorNames) {
        const targetHex = color.hex.replace('#', '');
        const tr = parseInt(targetHex.substring(0, 2), 16);
        const tg = parseInt(targetHex.substring(2, 4), 16);
        const tb = parseInt(targetHex.substring(4, 6), 16);

        const distance = Math.sqrt(
            Math.pow(r - tr, 2) +
            Math.pow(g - tg, 2) +
            Math.pow(b - tb, 2)
        );

        if (distance < minDistance) {
            minDistance = distance;
            nearestColor = color.name;
        }
    }

    return nearestColor;
};
