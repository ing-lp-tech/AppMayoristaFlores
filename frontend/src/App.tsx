import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Equipo } from "./pages/admin/Equipo";
import { ProcessManager } from "./pages/admin/ProcessManager";
import { useAuthStore } from "./store/useAuthStore";
import { supabase } from "./lib/supabase";
import { PublicLayout } from "./components/layout/PublicLayout";
import { Home } from "./pages/public/Home";
import { AdminProducts } from "./pages/admin/Products";
import { Proveedores } from "./pages/admin/Proveedores";
import { Inventario } from "./pages/admin/Inventario";
import { Produccion } from "./pages/admin/Produccion";
import { Costos } from "./pages/admin/Costos";
import { Ventas } from "./pages/admin/Ventas";
import { Stock } from "./pages/admin/Stock";
import { Checkout } from "./pages/public/Checkout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { Duenos } from "./pages/admin/Duenos";
import { Finanzas } from "./pages/admin/Finanzas";
import Cupones from "./pages/admin/Cupones";
import ConfiguracionSistema from "./pages/admin/ConfiguracionSistema";
import { Papelera } from "./pages/admin/Papelera";
import { ModuleGuard } from "./components/auth/ModuleGuard";

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
          .from("usuarios_internos")
          .select("*")
          .eq("id", currentSession.user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
          setUser(null);
        } else {
          // Normalize roles just in case
          const safeUser = {
            ...data,
            roles: Array.isArray(data.roles)
              ? data.roles
              : data.rol
                ? [data.rol]
                : ["cliente"],
          };
          setUser(safeUser);
        }
      } catch (error) {
        console.error("Unexpected error fetching profile:", error);
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
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/admin" replace />}
        />

        {/* Admin CRM - Protected Routes */}
        <Route
          element={
            <ProtectedRoute
              allowedRoles={[
                "owner",
                "admin",
                "ventas",
                "produccion",
                "inventario",
                "contador",
                "repositor",
                "cortador",
                "doblador",
              ]}
            />
          }
        >
          <Route path="/admin" element={<Layout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<ModuleGuard moduloKey="dashboard"><Dashboard /></ModuleGuard>} />
            <Route path="productos" element={<ModuleGuard moduloKey="productos"><AdminProducts /></ModuleGuard>} />
            <Route path="produccion" element={<ModuleGuard moduloKey="produccion"><Produccion /></ModuleGuard>} />
            <Route path="procesos" element={<ModuleGuard moduloKey="produccion"><ProcessManager /></ModuleGuard>} />
            <Route path="inventario" element={<ModuleGuard moduloKey="inventario"><Inventario /></ModuleGuard>} />
            <Route path="stock" element={<ModuleGuard moduloKey="stock"><Stock /></ModuleGuard>} />
            <Route path="ventas" element={<ModuleGuard moduloKey="ventas"><Ventas /></ModuleGuard>} />
            <Route path="proveedores" element={<ModuleGuard moduloKey="proveedores"><Proveedores /></ModuleGuard>} />
            <Route path="costos" element={<ModuleGuard moduloKey="costos"><Costos /></ModuleGuard>} />
            <Route path="duenos" element={<ModuleGuard moduloKey="duenos"><Duenos /></ModuleGuard>} />
            <Route path="finanzas" element={<ModuleGuard moduloKey="finanzas"><Finanzas /></ModuleGuard>} />
            <Route path="equipo" element={<ModuleGuard moduloKey="equipo"><Equipo /></ModuleGuard>} />
            <Route path="cupones" element={<ModuleGuard moduloKey="cupones"><Cupones /></ModuleGuard>} />
            <Route path="configuracion" element={<ModuleGuard moduloKey="configuracion"><ConfiguracionSistema /></ModuleGuard>} />
            <Route path="papelera" element={<ModuleGuard moduloKey="papelera"><Papelera /></ModuleGuard>} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
