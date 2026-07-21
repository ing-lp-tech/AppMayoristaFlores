import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { puedeVerModulo } from '../../lib/permissions';

interface ModuleGuardProps {
    moduloKey: string;
    children: ReactNode;
}

// Protege una ruta puntual del admin segun el permiso "ver" del modulo
// (ademas del gate general de sesion que ya hace ProtectedRoute).
export const ModuleGuard = ({ moduloKey, children }: ModuleGuardProps) => {
    const user = useAuthStore(state => state.user);

    if (!puedeVerModulo(user, moduloKey)) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
};
