import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Box,
    Package,
    Scissors,
    ShoppingCart,
    Users,
    LogOut,
    Factory,
    Layers,
    FileText,
    Shield,
    ShoppingBag
} from 'lucide-react';
import { useAuthStore } from '../../../store/useAuthStore';
import clsx from 'clsx';
import type { UserRole } from '../../../types';

export const AdminSidebar = () => {
    const { signOut, user } = useAuthStore();

    // Define items with required roles
    const allNavItems = [
        {
            to: '/admin/dashboard',
            icon: LayoutDashboard,
            label: 'Dashboard',
            allowed: ['owner', 'admin', 'ventas', 'produccion', 'inventario']
        },
        {
            to: '/admin/productos',
            icon: Package,
            label: 'Productos',
            allowed: ['owner', 'admin', 'ventas', 'produccion']
        },
        {
            to: '/admin/produccion',
            icon: Factory,
            label: 'Producción',
            allowed: ['owner', 'admin', 'produccion']
        },
        {
            to: '/admin/inventario',
            icon: Layers,
            label: 'Inventario Tel/Ins',
            allowed: ['owner', 'admin', 'inventario', 'produccion']
        },
        {
            to: '/admin/stock',
            icon: Box,
            label: 'Stock Productos',
            allowed: ['owner', 'admin', 'ventas', 'produccion', 'repositor']
        },
        {
            to: '/admin/costos',
            icon: FileText,
            label: 'Costos',
            allowed: ['owner', 'admin', 'contador']
        },
        {
            to: '/admin/ventas',
            icon: ShoppingCart,
            label: 'Ventas',
            allowed: ['owner', 'admin', 'ventas']
        },
        {
            to: '/admin/proveedores',
            icon: Users,
            label: 'Proveedores',
            allowed: ['owner', 'admin', 'inventario']
        },
        {
            to: '/admin/equipo',
            icon: Shield,
            label: 'Equipo',
            allowed: ['owner', 'admin']
        },
    ];

    const visibleItems = allNavItems.filter(item =>
        // If no user, hide all. If user has any of the allowed roles, show.
        user?.roles?.some((userRole: UserRole) => item.allowed.includes(userRole))
    );

    // Store link helper
    const StoreLink = () => (
        <a
            href="/"
            target="_blank"
            className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors mt-4 border-t border-gray-100"
        >
            <ShoppingBag className="h-5 w-5" />
            Ir a la Tienda
        </a>
    );

    return (
        <aside className="w-64 bg-white border-r h-screen fixed left-0 top-0 flex flex-col z-20 hidden md:flex">
            <NavLink to="/admin/dashboard" className="p-6 border-b flex items-center gap-2 hover:bg-gray-50 transition-colors group">
                <img src="/scargo_logo_v2.png" alt="SCARGO" className="h-14 w-auto object-contain" />
            </NavLink>

            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {visibleItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                            clsx(
                                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                isActive
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            )
                        }
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </NavLink>
                ))}
                <StoreLink />
            </nav>

            <div className="p-4 border-t">
                <div className="flex items-center gap-3 mb-4 px-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {user?.nombre?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="text-sm">
                        <p className="font-medium text-gray-900">{user?.nombre || 'Usuario'}</p>
                        <p className="text-xs text-gray-500 capitalize truncate max-w-[120px]" title={user?.roles?.join(', ')}>
                            {user?.roles?.slice(0, 2).join(', ') || 'Invitado'}
                            {(user?.roles?.length || 0) > 2 ? '...' : ''}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <LogOut className="h-5 w-5" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};
