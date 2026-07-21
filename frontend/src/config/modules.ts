import type { UserRole } from '../types';

export interface ModuloDef {
    key: string;
    label: string;
    // Roles que tienen acceso total (ver+editar+eliminar) por defecto a este modulo.
    // Este es el comportamiento "legacy": si un usuario no tiene una entrada
    // propia en su columna `permisos`, se usa esta lista.
    roles: UserRole[];
}

export const MODULOS: ModuloDef[] = [
    { key: 'dashboard', label: 'Dashboard', roles: ['owner', 'admin', 'ventas', 'produccion', 'inventario'] },
    { key: 'productos', label: 'Productos', roles: ['owner', 'admin', 'ventas', 'produccion'] },
    { key: 'produccion', label: 'Producción', roles: ['owner', 'admin', 'produccion'] },
    { key: 'inventario', label: 'Inventario Tel/Ins', roles: ['owner', 'admin', 'inventario', 'produccion'] },
    { key: 'stock', label: 'Stock Productos', roles: ['owner', 'admin', 'ventas', 'produccion', 'repositor'] },
    { key: 'costos', label: 'Costos', roles: ['owner', 'admin', 'contador'] },
    { key: 'ventas', label: 'Ventas', roles: ['owner', 'admin', 'ventas'] },
    { key: 'proveedores', label: 'Proveedores', roles: ['owner', 'admin', 'inventario'] },
    { key: 'duenos', label: 'Dueños/Socios', roles: ['owner', 'admin'] },
    { key: 'finanzas', label: 'Finanzas', roles: ['owner', 'admin'] },
    { key: 'equipo', label: 'Equipo', roles: ['owner', 'admin'] },
    { key: 'cupones', label: 'Cupones', roles: ['owner', 'admin'] },
    { key: 'configuracion', label: 'Configuración', roles: ['owner', 'admin'] },
    { key: 'papelera', label: 'Papelera', roles: ['owner', 'admin'] },
];
