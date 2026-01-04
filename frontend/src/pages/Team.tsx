import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { UsuarioInterno, UserRole } from '../types';
import { User as UserIcon, Check, X, Search } from 'lucide-react';
import clsx from 'clsx';

export const Team = () => {
    const [users, setUsers] = useState<UsuarioInterno[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', nombre: '', rol: 'ventas' as UserRole });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .order('creado_en', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { createClient } = await import('@supabase/supabase-js');
            const scopedClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            const { data: authData, error: authError } = await scopedClient.auth.signUp({
                email: newUser.email,
                password: newUser.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario");

            await new Promise(r => setTimeout(r, 1000));

            const { error: updateError } = await supabase
                .from('usuarios')
                .update({
                    nombre: newUser.nombre,
                    rol: newUser.rol
                })
                .eq('id', authData.user.id);

            if (updateError) {
                console.error("Error updating profile details:", updateError);
                alert("Usuario creado, pero hubo un error actualizando sus datos.");
            } else {
                alert("¡Usuario creado exitosamente!");
                setIsModalOpen(false);
                setNewUser({ email: '', password: '', nombre: '', rol: 'ventas' });
                fetchUsers();
            }

        } catch (error: any) {
            console.error(error);
            alert(error.message || 'Error al crear usuario');
        }
    };

    const updateUserRole = async (userId: string, newRole: UserRole) => {
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ rol: newRole })
                .eq('id', userId);

            if (error) throw error;
            setUsers(users.map(u => u.id === userId ? { ...u, rol: newRole } : u));
        } catch (error) {
            console.error('Error updating role:', error);
            alert('Error al actualizar el rol');
        }
    };

    const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ activo: !currentStatus })
                .eq('id', userId);

            if (error) throw error;
            setUsers(users.map(u => u.id === userId ? { ...u, activo: !currentStatus } : u));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al cambiar estado');
        }
    };

    const filteredUsers = users.filter(u =>
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const roles: { value: UserRole; label: string; desc: string }[] = [
        { value: 'admin', label: 'Administrador', desc: 'Acceso total' },
        { value: 'repositor', label: 'Repositor', desc: 'Manejo de stock de telas e insumos' },
        { value: 'cortador', label: 'Cortador', desc: 'Registro de cortes y uso de rollos' },
        { value: 'doblador', label: 'Doblador', desc: 'Control de calidad y producto terminado' },
        { value: 'ventas', label: 'Vendedor', desc: 'Punto de venta y clientes' },
    ];

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">Cargando equipo...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 uppercase">Gestión de Equipo</h1>
                    <p className="text-gray-500 font-medium">Administra los roles y accesos de los trabajadores</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 font-black uppercase text-xs"
                >
                    <UserIcon className="h-4 w-4" />
                    Nuevo Miembro
                </button>
            </div>

            {/* Add User Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-in zoom-in duration-300">
                        <h2 className="text-2xl font-black text-gray-900 mb-6 uppercase">Agregar Miembro</h2>
                        <form onSubmit={createUser} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border-gray-100 bg-gray-50 rounded-xl p-3 font-bold focus:bg-white focus:ring-blue-600"
                                    value={newUser.nombre}
                                    onChange={e => setNewUser({ ...newUser, nombre: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full border-gray-100 bg-gray-50 rounded-xl p-3 font-bold focus:bg-white focus:ring-blue-600"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full border-gray-100 bg-gray-50 rounded-xl p-3 font-bold focus:bg-white focus:ring-blue-600"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Rol Operativo</label>
                                <select
                                    className="w-full border-gray-100 bg-gray-50 rounded-xl p-3 font-bold focus:bg-white focus:ring-blue-600"
                                    value={newUser.rol}
                                    onChange={e => setNewUser({ ...newUser, rol: e.target.value as UserRole })}
                                >
                                    {roles.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-3 text-gray-400 font-bold hover:bg-gray-100 rounded-xl transition-colors uppercase text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black uppercase text-xs shadow-lg shadow-blue-100"
                                >
                                    Crear Miembro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300" />
                        <input
                            type="text"
                            placeholder="Buscar miembro..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border-gray-100 bg-gray-50/50 rounded-2xl focus:bg-white focus:ring-blue-600 font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em]">
                            <tr>
                                <th className="px-8 py-4">Usuario</th>
                                <th className="px-8 py-4">Rol en Planta</th>
                                <th className="px-8 py-4">Disponibilidad</th>
                                <th className="px-8 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50/30 transition-colors group">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-blue-600 font-black text-lg border border-blue-200">
                                                {user.nombre?.[0]?.toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-black text-gray-900">{user.nombre}</div>
                                                <div className="text-xs text-gray-400 font-bold">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <select
                                            value={user.rol}
                                            onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                                            className="block w-full max-w-[200px] text-sm border-gray-100 bg-gray-50 rounded-xl font-bold p-2 focus:ring-blue-600 focus:bg-white"
                                        >
                                            {roles.map(role => (
                                                <option key={role.value} value={role.value}>
                                                    {role.label}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={clsx(
                                            "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                                            user.activo ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                        )}>
                                            {user.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => toggleUserStatus(user.id, user.activo)}
                                            className={clsx(
                                                "p-3 rounded-xl transition-all",
                                                user.activo
                                                    ? "text-red-400 hover:bg-red-50 hover:text-red-600"
                                                    : "text-green-400 hover:bg-green-50 hover:text-green-600"
                                            )}
                                        >
                                            {user.activo ? <X className="h-6 w-6" /> : <Check className="h-6 w-6" />}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                            <Search className="h-8 w-8 text-gray-200" />
                        </div>
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">No se encontraron miembros del equipo</p>
                    </div>
                )}
            </div>
        </div>
    );
};
