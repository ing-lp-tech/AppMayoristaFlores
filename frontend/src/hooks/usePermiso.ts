import { useAuthStore } from '../store/useAuthStore';
import { getPermiso } from '../lib/permissions';
import type { Accion } from '../types';

export function usePermiso(moduloKey: string, accion: Accion): boolean {
    const user = useAuthStore(state => state.user);
    return getPermiso(user, moduloKey, accion);
}
