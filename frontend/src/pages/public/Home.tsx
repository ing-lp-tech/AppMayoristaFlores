import { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Truck, ShieldCheck, Clock, Loader2 } from 'lucide-react';
import { ProductCard } from '../../components/ecommerce/minorista/ProductCardMinorista/ProductCardMinorista';
import { supabase } from '../../lib/supabase';
import { productService } from '../../services/productService';
import type { Producto, ProductoTalla } from '../../types';

export const Home = () => {
    const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);
    const [products, setProducts] = useState<(Producto & { producto_talles: ProductoTalla[] })[]>([]);
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Hero Images Data
    const heroSlides = [
        {
            id: 1,
            image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=80&w=1920",
            title: "Pequeños Momentos, Gran Estilo",
            subtitle: "Descubre nuestra colección de ropa suave y divertida.",
            color: "bg-blue-100"
        },
        {
            id: 2,
            image: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&q=80&w=1920", // Kids Playing
            title: "Aventuras con Comodidad",
            subtitle: "Prendas pensadas para jugar, saltar y reír.",
            color: "bg-yellow-100"
        },
        {
            id: 3,
            image: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&q=80&w=1920", // Baby (Updated stable URL)
            title: "Dulzura para tu Bebé",
            subtitle: "Tejidos hipoalergénicos para cuidar su piel.",
            color: "bg-pink-100"
        }
    ];

    useEffect(() => {
        const loadData = async () => {
            try {
                // Fetch Products
                const prods = await productService.getProducts(true);
                setProducts(prods);

                // Fetch Categories
                const { data: cats } = await supabase.from('categorias').select('*').order('orden');
                if (cats) setCategories(cats);

            } catch (error) {
                console.error("Error loading home data:", error);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // Filter Logic
    const filteredProducts = selectedCategory
        ? products.filter(p => p.categoria_id === selectedCategory)
        : products;

    const scrollToCatalog = () => {
        const catalogSection = document.getElementById('catalogo');
        catalogSection?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="bg-white min-h-screen font-sans pb-20">
            {/* Hero Carousel */}
            <div className="relative overflow-hidden mb-8" ref={emblaRef}>
                <div className="flex">
                    {heroSlides.map((slide) => (
                        <div key={slide.id} className="flex-[0_0_100%] min-w-0 relative h-[80vh] md:h-[650px] flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/30 z-10" />
                            <img
                                src={slide.image}
                                className="absolute inset-0 w-full h-full object-cover"
                                alt={slide.title}
                            />
                            <div className="relative z-20 text-center px-4 max-w-5xl mx-auto text-white drop-shadow-md">
                                <h2 className="text-4xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-tight" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.3)' }}>
                                    {slide.title}
                                </h2>
                                <p className="text-lg md:text-2xl lg:text-3xl mb-10 font-bold opacity-90 max-w-2xl mx-auto">
                                    {slide.subtitle}
                                </p>
                                <button
                                    onClick={scrollToCatalog}
                                    className="bg-white text-gray-900 px-8 py-4 md:px-12 md:py-5 rounded-full font-black text-lg md:text-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
                                >
                                    ✨ Ver Catálogo
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Decorative Wave Bottom */}
                <div className="absolute bottom-0 left-0 right-0 z-20 translate-y-1">
                    <svg viewBox="0 0 1440 320" className="w-full text-white fill-current">
                        <path fillOpacity="1" d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                    </svg>
                </div>
            </div>

            {/* Features Strip - Soft Design */}
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 mb-16 relative z-30 -mt-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-blue-50 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-blue-50">
                        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4 transform -rotate-3">
                            <Truck className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">Envíos Rápidos</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">Llegamos a cada rincón del país con mucho cuidado.</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-green-50 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-green-50">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 transform rotate-3">
                            <ShieldCheck className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">Calidad Premium</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">Telas suaves y seguras para la piel de los más peques.</p>
                    </div>
                    <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-purple-50 flex flex-col items-center text-center hover:-translate-y-2 transition-transform duration-300 border border-purple-50">
                        <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mb-4 transform -rotate-2">
                            <Clock className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">Compra Fácil</h3>
                        <p className="text-gray-500 font-medium leading-relaxed">Atención personalizada por WhatsApp al instante.</p>
                    </div>
                </div>
            </div>

            {/* Catalog Section */}
            <div id="catalogo" className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <span className="inline-block py-1 px-4 rounded-full bg-yellow-100 text-yellow-700 font-bold text-sm uppercase tracking-wider mb-4">
                        Colección 2026
                    </span>
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                        Explora nuestro Catálogo 🧸
                    </h2>
                </div>

                {/* Category Filters */}
                <div className="flex flex-wrap justify-center gap-3 mb-10">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all border ${selectedCategory === null
                            ? 'bg-gray-900 text-white border-gray-900 shadow-lg scale-105'
                            : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                    >
                        Todos
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-6 py-2.5 rounded-full font-bold text-sm transition-all border ${selectedCategory === cat.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-105'
                                : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200 hover:text-blue-600'
                                }`}
                        >
                            {cat.nombre}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                        <p className="text-gray-500 font-bold">Buscando ropita...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-24 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                        <p className="text-gray-400 text-xl font-bold">No encontramos prendas en esta categoría 😢</p>
                        <button onClick={() => setSelectedCategory(null)} className="mt-4 text-blue-600 font-bold hover:underline">
                            Ver todos los productos
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
                        {filteredProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>

            {/* Buying Process Section */}
            <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 mb-10">
                <div className="text-center mb-16">
                    <span className="text-pink-600 font-black tracking-widest text-xs uppercase mb-2 block">Cómo Funciona</span>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-900 mb-4">Nuestro Proceso de Compra</h2>
                    <p className="text-gray-500 text-lg max-w-2xl mx-auto">
                        Comprar nunca fue tan fácil. Sigue estos simples pasos.
                    </p>
                </div>

                <div className="relative">
                    {/* Connection Line (Desktop) */}
                    <div className="hidden md:block absolute top-[2.5rem] left-0 right-0 h-0.5 border-t-2 border-dashed border-gray-200 -z-10" aria-hidden="true"></div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Step 01 */}
                        <div className="flex flex-col items-center text-center group">
                            <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-black mb-6 shadow-xl shadow-pink-200 group-hover:scale-110 transition-transform duration-300 border-4 border-white">
                                01
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Explora el Catálogo</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Navega por nuestra colección y encuentra lo que buscas
                            </p>
                        </div>

                        {/* Step 02 */}
                        <div className="flex flex-col items-center text-center group">
                            <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-black mb-6 shadow-xl shadow-pink-200 group-hover:scale-110 transition-transform duration-300 border-4 border-white">
                                02
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Agrega al Carrito</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Selecciona tus productos favoritos con un solo clic
                            </p>
                        </div>

                        {/* Step 03 */}
                        <div className="flex flex-col items-center text-center group">
                            <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-black mb-6 shadow-xl shadow-pink-200 group-hover:scale-110 transition-transform duration-300 border-4 border-white">
                                03
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Checkout Seguro</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Paga de forma segura con múltiples métodos de pago
                            </p>
                        </div>

                        {/* Step 04 */}
                        <div className="flex flex-col items-center text-center group">
                            <div className="w-20 h-20 bg-pink-600 rounded-full flex items-center justify-center text-white text-2xl font-black mb-6 shadow-xl shadow-pink-200 group-hover:scale-110 transition-transform duration-300 border-4 border-white">
                                04
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Recibe en Casa</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">
                                Envío rápido y seguimiento en tiempo real
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Newsletter / Call to Action */}
            <div className="max-w-5xl mx-auto mt-20 px-4 mb-20">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-400 rounded-[3rem] p-10 md:p-16 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3" />

                    <h2 className="text-3xl md:text-4xl font-black mb-6 relative z-10">¿Buscas precios mayoristas?</h2>
                    <p className="text-xl mb-8 relative z-10 text-blue-50 font-medium max-w-2xl mx-auto">
                        Regístrate como comercio y accede a precios exclusivos de fábrica para tu negocio.
                    </p>
                    <button className="bg-white text-blue-600 px-10 py-4 rounded-full font-black text-lg hover:bg-blue-50 transition-all shadow-xl">
                        Solicitar Cuenta Mayorista
                    </button>
                </div>
            </div>

        </div>
    );
};
