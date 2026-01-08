import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShoppingCart, User } from 'lucide-react';
import { useCartDualStore } from '../../store/cartDualStore';
import { ModeSelector } from '../ecommerce/dual/ModeSelector/ModeSelector';
import { CartDrawer } from '../ecommerce/cart/CartDrawer';

export const PublicLayout = () => {
    const { getTotals } = useCartDualStore();
    const { count: itemCount } = getTotals();

    // Local state for cart drawer since toggleCart wasn't in the new store yet
    const [isCartOpen, setIsCartOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-white">
            <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
            {/* Navbar */}
            <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        {/* Logo */}
                        <Link to="/admin/dashboard" className="flex-shrink-0 flex items-center gap-2">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                                T
                            </div>
                            <span className="font-bold text-xl text-gray-900">Textil Pymes</span>
                        </Link>

                        {/* DESKTOP: Mode Selector & Menu */}
                        <div className="hidden md:flex flex-1 justify-center items-center px-8">
                            <ModeSelector />
                        </div>

                        {/* Icons */}
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => setIsCartOpen(true)}
                                className="p-2 text-gray-600 hover:text-blue-600 relative transition-transform hover:scale-110"
                            >
                                <ShoppingCart className="h-6 w-6" />
                                {itemCount > 0 && (
                                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-600 border-2 border-white rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-bounce">
                                        {itemCount}
                                    </span>
                                )}
                            </button>
                            <Link
                                to="/login"
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors text-sm font-medium"
                            >
                                <User className="h-4 w-4" />
                                <span className="hidden sm:inline">Ingresar</span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* MOBILE: Mode Selector Row - Visible only on mobile */}
                <div className="md:hidden border-t border-gray-100 bg-gray-50/50 py-2 flex justify-center">
                    <ModeSelector />
                </div>
            </nav>

            {/* Content */}
            <main className="flex-grow">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase">Textil Pymes</h3>
                            <p className="mt-4 text-base text-gray-500">
                                Calidad y confección directa de fábrica.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase">Atención</h3>
                            <p className="mt-4 text-base text-gray-500">
                                Lunes a Viernes<br />
                                9:00 AM - 6:00 PM
                            </p>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase">Contacto</h3>
                            <p className="mt-4 text-base text-gray-500">
                                ventas@textilpymes.com<br />
                                WhatsApp: +54 9 11 1234 5678
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};
