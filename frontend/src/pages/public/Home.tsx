import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronRight, Truck, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { ProductCard } from '../../components/ecommerce/minorista/ProductCardMinorista/ProductCardMinorista';
import { productService } from '../../services/productService';
import type { Producto, ProductoTalla } from '../../types';

export const Home = () => {
    const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);
    const [products, setProducts] = useState<(Producto & { producto_talles: ProductoTalla[] })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadProducts = async () => {
            try {
                const data = await productService.getProducts(true);
                setProducts(data);
            } catch (error) {
                console.error("Error loading products:", error);
            } finally {
                setLoading(false);
            }
        };
        loadProducts();
    }, []);

    return (
        <div className="bg-gray-50 pb-20">
            {/* Hero Carousel */}
            <div className="relative bg-white overflow-hidden shadow-xl" ref={emblaRef}>
                <div className="flex">
                    {/* Slide 1 */}
                    <div className="flex-[0_0_100%] min-w-0 relative h-[500px] flex items-center justify-center bg-blue-900 text-white">
                        <img
                            src="https://images.unsplash.com/photo-1470309864661-68328b2cd0a5?auto=format&fit=crop&q=80&w=1600"
                            className="absolute inset-0 w-full h-full object-cover opacity-40"
                            alt="Hero 1"
                        />
                        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
                            <h2 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight">Venta Minorista y Mayorista</h2>
                            <p className="text-xl md:text-2xl mb-8 font-light text-blue-100 italic">
                                La mejor calidad textil, ahora a un click de distancia.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <button className="bg-white text-blue-900 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-all transform hover:scale-105 shadow-2xl">
                                    Ver Catálogo
                                </button>
                                <button className="bg-blue-600 text-white border-2 border-blue-400 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-700 transition-all transform hover:scale-105 shadow-2xl">
                                    Sección Mayorista
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Features Strip */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center bg-white">
                        <div className="flex flex-col items-center p-4">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-4">
                                <Truck className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tighter">Envíos a Todo el País</h3>
                            <p className="text-gray-500 mt-2 text-sm">Logística integrada para que recibas en tiempo récord.</p>
                        </div>
                        <div className="flex flex-col items-center p-4">
                            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-600 mb-4">
                                <ShieldCheck className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tighter">Fábrica Directa</h3>
                            <p className="text-gray-500 mt-2 text-sm">Sin intermediarios. Calidad premium al mejor costo del mercado.</p>
                        </div>
                        <div className="flex flex-col items-center p-4">
                            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center text-purple-600 mb-4">
                                <Clock className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 uppercase tracking-tighter">Atención Personalizada</h3>
                            <p className="text-gray-500 mt-2 text-sm">Nuestro equipo de ventas te asesora en cada paso.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Featured Products */}
            <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between mb-12 border-b border-gray-100 pb-8">
                    <div>
                        <span className="text-blue-600 font-bold tracking-widest uppercase text-xs">Catálogo de Temporada</span>
                        <h2 className="text-4xl font-black text-gray-900 mt-2">Productos Destacados</h2>
                    </div>
                    <button className="hidden md:flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold transition-colors">
                        Ver todo el catálogo <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                        <p className="text-gray-500 font-medium">Cargando colección...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                        <p className="text-gray-400 text-lg">No encontramos productos disponibles por el momento.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}

                {!loading && products.length > 0 && (
                    <div className="mt-20 text-center">
                        <button className="bg-gray-900 text-white px-12 py-5 rounded-full font-black text-lg hover:bg-blue-600 transition-all shadow-xl hover:shadow-blue-200 transform hover:-translate-y-1">
                            Explorar Colección Completa
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
