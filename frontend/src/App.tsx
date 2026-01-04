import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { Equipo } from './pages/admin/Equipo';
import { ProcessManager } from './pages/admin/ProcessManager';
import { useAuthStore } from './store/useAuthStore';
import { supabase } from './lib/supabase';
import { PublicLayout } from './components/layout/PublicLayout';
import { Home } from './pages/public/Home';
import { AdminProducts } from './pages/admin/Products';
import { Proveedores } from './pages/admin/Proveedores';
import { Inventario } from './pages/admin/Inventario';
import { Produccion } from './pages/admin/Produccion';
import { Costos } from './pages/admin/Costos';
import { Ventas } from './pages/admin/Ventas';
import { Checkout } from './pages/public/Checkout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

function App() {
  const { session, loading, setLoading, setSession, setUser } = useAuthStore();

  useEffect(() => {
    // Helper to fetch profile
    const fetchProfile = async (currentSession: any) => {
      if (!currentSession) {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('usuarios_internos')
          .select('*')
          .eq('id', currentSession.user.id)
          .single();

        if (error) {
          console.error('Error fetching profile:', error);
          setUser(null);
        } else {
          // Normalize roles just in case
          const safeUser = {
            ...data,
            roles: Array.isArray(data.roles) ? data.roles : (data.rol ? [data.rol] : ['cliente'])
          };
          setUser(safeUser);
        }
      } catch (error) {
        console.error('Unexpected error fetching profile:', error);
      } finally {
        setSession(currentSession);
        setLoading(false);
      }
    };

    // Initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      fetchProfile(session);
    });

    // Auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // We can optimize this, but for now simple is safe
      fetchProfile(session);
    });

    return () => subscription.unsubscribe();
  }, [setSession, setLoading, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Storefront */}
        <Route path="/" element={<PublicLayout />}>
          <Route index element={<Home />} />
          <Route path="checkout" element={<Checkout />} />
        </Route>

        {/* Auth */}
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/admin" replace />} />

        {/* Admin CRM - Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['owner', 'admin', 'ventas', 'produccion', 'inventario', 'contador', 'repositor', 'cortador', 'doblador']} />}>
          <Route path="/admin" element={<Layout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="productos" element={<AdminProducts />} />
            <Route path="produccion" element={<Produccion />} />
            <Route path="procesos" element={<ProcessManager />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="ventas" element={<Ventas />} />
            <Route path="proveedores" element={<Proveedores />} />
            <Route path="costos" element={<Costos />} />
            <Route path="equipo" element={<Equipo />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
