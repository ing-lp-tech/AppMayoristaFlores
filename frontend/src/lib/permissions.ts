import type { Accion, User } from '../types';
import { MODULOS } from '../config/modules';

/**
 * Resuelve si un usuario puede hacer `accion` sobre `moduloKey`.
 *
 * Orden de resolucion:
 * 1. owner/admin => acceso total siempre.
 * 2. Si el usuario tiene una entrada propia en `permisos[moduloKey]`, esa entrada manda
 *    (permite, por ejemplo, dar ver+editar sin eliminar a un empleado puntual).
 * 3. Si no tiene entrada propia, se cae al acceso por rol (comportamiento legacy: el rol
 *    da acceso total ver+editar+eliminar al modulo).
 */
export function getPermiso(user: User | null | undefined, moduloKey: string, accion: Accion): boolean {
    if (!user) return false;
    if (user.roles?.includes('owner') || user.roles?.includes('admin')) return true;

    const permisoCustom = user.permisos?.[moduloKey];
    if (permisoCustom && accion in permisoCustom) {
        return !!permisoCustom[accion];
    }

    const modulo = MODULOS.find(m => m.key === moduloKey);
    if (!modulo) return false;
    return !!user.roles?.some(r => modulo.roles.includes(r));
}

export function puedeVerModulo(user: User | null | undefined, moduloKey: string): boolean {
    return getPermiso(user, moduloKey, 'ver');
}
