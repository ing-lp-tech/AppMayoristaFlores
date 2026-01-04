import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from "./Sidebar/AdminSidebar";
import { Menu, Scissors, X } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import {
    LayoutDashboard,
    Package,
    ShoppingCart,
    Users,
    Factory,
    Layers,
    FileText,
    LogOut
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export const Layout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { signOut, user } = useAuthStore();

    const navItems = [
        { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/productos', icon: Package, label: 'Productos' },
        { to: '/produccion', icon: Factory, label: 'Producción' },
        { to: '/inventario', icon: Layers, label: 'Inventario' },
        { to: '/ventas', icon: ShoppingCart, label: 'Ventas' },
        { to: '/clientes', icon: Users, label: 'Clientes' },
        { to: '/compras', icon: FileText, label: 'Compras' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Desktop Sidebar */}
            <AdminSidebar />

            {/* Mobile Header */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b z-30 px-4 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <Scissors className="h-6 w-6 text-blue-600" />
                    <span className="font-bold text-lg">Textil Pymes</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 -mr-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-40 md:hidden">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
                        <div className="p-4 border-b flex items-center gap-2">
                            <Scissors className="h-6 w-6 text-blue-600" />
                            <span className="font-bold text-lg">Textil Pymes</span>
                        </div>

                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setIsMobileMenuOpen(false)}
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
                        </nav>

                        <div className="p-4 border-t">
                            <div className="flex items-center gap-3 mb-4 px-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                    {user?.nombre?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="text-sm">
                                    <p className="font-medium text-gray-900">{user?.nombre || 'Usuario'}</p>
                                    <p className="text-xs text-gray-500 capitalize">{user?.rol || 'Rol'}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    signOut();
                                    setIsMobileMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 mt-14 md:mt-0 transition-all">
                <Outlet />
            </main>
        </div>
    );
};
