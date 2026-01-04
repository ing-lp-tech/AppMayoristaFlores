import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import type { UserRole } from '../../types';

interface ProtectedRouteProps {
    allowedRoles?: UserRole[];
    redirectPath?: string;
}

export const ProtectedRoute = ({ allowedRoles, redirectPath = '/' }: ProtectedRouteProps) => {
    const { user, session, loading } = useAuthStore();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // 1. Must be logged in
    if (!session || !user) {
        return <Navigate to="/login" replace />;
    }

    // 2. Check allowed roles if specified
    if (allowedRoles && allowedRoles.length > 0) {
        const hasPermission = user.roles?.some((role: UserRole) => allowedRoles.includes(role));
        if (!hasPermission) {
            // Redirect unauthorized users to home/store
            return <Navigate to={redirectPath} replace />;
        }
    }

    return <Outlet />;
};
