import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Mail, Shield, Check, X, Edit2 } from 'lucide-react';
import type { UserRole } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';

// Roles disponibles para asignar
const AVAILABLE_ROLES: UserRole[] = ['owner', 'admin', 'produccion', 'ventas', 'inventario', 'contador', 'repositor', 'cortador', 'doblador', 'cliente'];

export const Equipo = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
    const currentUser = useAuthStore(state => state.user);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const { data, error } = await supabase
                .from('usuarios_internos')
                .select('*')
                .order('creado_en', { ascending: false });

            if (error) throw error;
            // Ensure roles is always an array (handling migration period)
            const sanitizedData = (data || []).map(u => ({
                ...u,
                roles: Array.isArray(u.roles) ? u.roles : (u.rol ? [u.rol] : ['cliente'])
            }));
            setMembers(sanitizedData);
        } catch (error) {
            console.error('Error fetching team:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (member: any) => {
        setEditingId(member.id);
        setSelectedRoles(member.roles || []);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setSelectedRoles([]);
    };

    const handleSaveRoles = async (memberId: string) => {
        try {
            const { error } = await supabase
                .from('usuarios_internos')
                .update({ roles: selectedRoles })
                .eq('id', memberId);

            if (error) throw error;

            // Optimistic update
            setMembers(members.map(m => m.id === memberId ? { ...m, roles: selectedRoles } : m));
            setEditingId(null);
        } catch (error) {
            console.error('Error updating roles:', error);
            alert('Error al actualizar roles');
        }
    };

    const toggleRole = (role: UserRole) => {
        if (selectedRoles.includes(role)) {
            setSelectedRoles(selectedRoles.filter(r => r !== role));
        } else {
            setSelectedRoles([...selectedRoles, role]);
        }
    };

    // Helper to check if current user is owner/admin
    const canManageUsers = currentUser?.roles?.includes('owner') || currentUser?.roles?.includes('admin');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Equipo</h1>
                    <p className="text-sm text-gray-500">Gestiona los usuarios y roles del sistema.</p>
                </div>
                <button
                    disabled
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Funcionalidad disponible próximamente"
                >
                    <Plus className="h-4 w-4" />
                    Invitar Miembro
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Usuario</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Roles</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Estado</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center">Cargando...</td></tr>
                        ) : members.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center text-gray-500">No hay miembros registrados.</td></tr>
                        ) : (
                            members.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {member.nombre?.[0] || member.email?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">{member.nombre} {member.apellido}</p>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Mail className="h-3 w-3" />
                                                    {member.email}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {editingId === member.id ? (
                                            <div className="flex flex-wrap gap-2 max-w-md">
                                                {AVAILABLE_ROLES.map(role => (
                                                    <button
                                                        key={role}
                                                        onClick={() => toggleRole(role)}
                                                        className={`px-2 py-1 text-xs rounded-full border ${selectedRoles.includes(role)
                                                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                                                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                            }`}
                                                    >
                                                        {role}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-wrap gap-1">
                                                {member.roles?.map((rol: string) => (
                                                    <span key={rol} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 capitalize">
                                                        <Shield className="h-3 w-3" />
                                                        {rol}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${member.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {member.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {editingId === member.id ? (
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleSaveRoles(member.id)} className="text-green-600 hover:text-green-800 bg-green-50 p-1 rounded">
                                                    <Check className="h-4 w-4" />
                                                </button>
                                                <button onClick={handleCancelEdit} className="text-gray-400 hover:text-gray-600 p-1">
                                                    <X className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex justify-end gap-2">
                                                {canManageUsers && (
                                                    <button
                                                        onClick={() => handleEditClick(member)}
                                                        className="text-blue-400 hover:text-blue-600 transition-colors"
                                                        title="Editar Roles"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button className="text-gray-400 hover:text-red-600 transition-colors">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-1">Nota para el Dueño</h3>
                <p className="text-sm text-blue-600">
                    Ahora puedes editar los roles de cualquier usuario haciendo clic en el lápiz. El rol 'cliente' es el predeterminado para nuevos registros.
                </p>
            </div>
        </div>
    );
};
