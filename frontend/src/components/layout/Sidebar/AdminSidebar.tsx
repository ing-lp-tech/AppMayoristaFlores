import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Box,
    Package,
    ShoppingCart,
    Users,
    LogOut,
    Factory,
    Layers,
    FileText,
    Shield,
    ShoppingBag,
    UsersRound,
    DollarSign
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
            to: '/admin/duenos',
            icon: UsersRound,
            label: 'Dueños/Socios',
            allowed: ['owner', 'admin']
        },
        {
            to: '/admin/finanzas',
            icon: DollarSign,
            label: 'Finanzas',
            allowed: ['owner', 'admin']
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
                <div className="flex items-center gap-3 mb-3 px-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {user?.nombre?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="text-sm flex-1">
                        <p className="font-medium text-gray-900">{user?.nombre || 'Usuario'}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                </div>

                {/* Role Badge */}
                <div className="mb-4 px-4">
                    {user?.roles?.includes('admin') ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
                            <Shield className="h-4 w-4 text-purple-600" />
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-purple-900">Super Admin</p>
                                <p className="text-[10px] text-purple-600">Acceso total</p>
                            </div>
                        </div>
                    ) : user?.roles?.includes('owner') ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                            <UsersRound className="h-4 w-4 text-blue-600" />
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-blue-900">Dueño/Socio</p>
                                <p className="text-[10px] text-blue-600">Gestión completa</p>
                            </div>
                        </div>
                    ) : user?.roles?.includes('ventas') ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                            <ShoppingCart className="h-4 w-4 text-green-600" />
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-green-900">Vendedor</p>
                                <p className="text-[10px] text-green-600">Ventas y productos</p>
                            </div>
                        </div>
                    ) : user?.roles?.includes('produccion') ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                            <Factory className="h-4 w-4 text-orange-600" />
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-orange-900">Producción</p>
                                <p className="text-[10px] text-orange-600">Fabricación</p>
                            </div>
                        </div>
                    ) : user?.roles?.includes('inventario') ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <Layers className="h-4 w-4 text-amber-600" />
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-amber-900">Inventario</p>
                                <p className="text-[10px] text-amber-600">Stock y materiales</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                            <Users className="h-4 w-4 text-gray-600" />
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-gray-900">Usuario</p>
                                <p className="text-[10px] text-gray-600 capitalize">
                                    {user?.roles?.join(', ') || 'Invitado'}
                                </p>
                            </div>
                        </div>
                    )}
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
