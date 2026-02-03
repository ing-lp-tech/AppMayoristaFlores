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
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left">
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
                        <div>
                            <h3 className="text-sm font-bold text-gray-900 tracking-wider uppercase">Síguenos</h3>
                            <p className="mt-4 text-base text-gray-500 mb-4">
                                ¡Únete a nuestra comunidad para novedades exclusivas!
                            </p>
                            <div className="flex justify-center md:justify-start space-x-4">
                                {/* TikTok */}
                                <a href="https://www.tiktok.com/@scargo.jeans" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-black transition-colors">
                                    <span className="sr-only">TikTok</span>
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 1 0-1 13.6 6.84 6.84 0 0 0 6.82-6.85V7.97a9.68 9.68 0 0 0 3.41 1.73V6.69z" />
                                    </svg>
                                </a>
                                {/* Instagram */}
                                <a href="https://www.instagram.com/scargojeans.ok/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#E1306C] transition-colors">
                                    <span className="sr-only">Instagram</span>
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.8c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.8c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772 4.902 4.902 0 011.772-1.153c.636-.247 1.363-.416 2.427-.465C9.673 2.013 10.03 2 12.488 2h-1.74zm-2.546 1.916c-2.366.012-2.673.048-3.32.302-.564.221-.965.518-1.288.841-.323.323-.62.724-.84 1.288-.255.647-.291.954-.303 3.32-.012 2.366-.012 3.654 0 6.02.012 2.366.048 2.673.303 3.32.22.564.517.965.84 1.288.324.323.725.62 1.288.84.647.255.954.291 3.32.303 2.366.012 3.654.012 6.02 0 2.366-.012 2.673-.048 3.32-.303.564-.221.965-.518 1.288-.841.323-.323.62-.724.84-1.288.254-.647.29-1.084.302-3.45.012-2.366.012-3.654 0-6.02-.012-2.366-.048-2.673-.302-3.32-.221-.564-.518-.965-.841-1.288-.323-.323-.724-.62-1.288-.84-.647-.255-.954-.291-3.32-.303-2.366-.012-4.52-.012-6.887 0zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.916a3.219 3.219 0 100 6.438 3.219 3.219 0 000-6.438zM16.965 5.5a1.16 1.16 0 110 2.32 1.16 1.16 0 010-2.32z" clipRule="evenodd" />
                                    </svg>
                                </a>
                                {/* Facebook */}
                                <a href="https://www.facebook.com/p/Scargo-Jeans-100063442737076/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#1877F2] transition-colors">
                                    <span className="sr-only">Facebook</span>
                                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                                        <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Copyright & Designer - Distinct Section */}
                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <div className="flex flex-col md:flex-row justify-center items-center gap-8">
                            <p className="text-sm text-gray-400">
                                &copy; 2026 Todos los derechos reservados.
                            </p>
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-gray-500 font-medium">Diseñado por Ing. Luis Patty Mamani</span>
                                <a
                                    href="https://www.tiktok.com/@ingeniero_emprendedor"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-black transition-colors p-1 hover:bg-gray-100 rounded-full"
                                    aria-label="TikTok del Desarrollador"
                                >
                                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 1 0-1 13.6 6.84 6.84 0 0 0 6.82-6.85V7.97a9.68 9.68 0 0 0 3.41 1.73V6.69z" />
                                    </svg>
                                </a>
                            </div>
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
