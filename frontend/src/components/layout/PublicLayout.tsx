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
                            <img src="/scargo_logo_v2.png" alt="SCARGO" className="h-16 w-auto object-contain py-1" />
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
            {/* Floating WhatsApp Button */}
            <a
                href="https://wa.me/5491126879409"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-6 left-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:scale-110 hover:shadow-[0_6px_16px_rgba(37,211,102,0.4)] transition-all duration-300 flex items-center justify-center group"
                aria-label="Contactar por WhatsApp"
            >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <div className="absolute left-full ml-4 bg-white px-4 py-2 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap text-sm font-bold text-gray-700 -translate-x-2 group-hover:translate-x-0 hidden md:block border border-gray-100">
                    ¡Hablemos! 👋
                    <div className="absolute top-1/2 right-full -mt-1.5 border-8 border-transparent border-r-white"></div>
                </div>
            </a>
        </div>
    );
};
