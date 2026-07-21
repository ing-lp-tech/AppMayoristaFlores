import { Fragment, useState, useEffect, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { Plus, Mail, Shield, Check, X, Edit2, UserX, UserCheck, RefreshCw } from 'lucide-react';
import type { UserRole, ModuloPermiso } from '../../types';
import { useAuthStore } from '../../store/useAuthStore';
import { MODULOS } from '../../config/modules';
import { getPermiso } from '../../lib/permissions';

// Roles disponibles para asignar
const AVAILABLE_ROLES: UserRole[] = ['owner', 'admin', 'produccion', 'ventas', 'inventario', 'contador', 'repositor', 'cortador', 'doblador', 'cliente'];
const ACCIONES = ['ver', 'editar', 'eliminar'] as const;

const generarPasswordTemporal = () => Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4).toUpperCase();

const emptyInviteForm = () => ({
    nombre: '',
    apellido: '',
    email: '',
    password: generarPasswordTemporal(),
    roles: ['cliente'] as UserRole[],
});

export const Equipo = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
    const [selectedPermisos, setSelectedPermisos] = useState<Record<string, ModuloPermiso>>({});
    const currentUser = useAuthStore(state => state.user);

    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState(emptyInviteForm());
    const [inviteLoading, setInviteLoading] = useState(false);
    const [inviteError, setInviteError] = useState('');

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
                roles: Array.isArray(u.roles) ? u.roles : (u.rol ? [u.rol] : ['cliente']),
                permisos: u.permisos || {},
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
        // Se parte de los permisos efectivos actuales (propios si existen, si no el
        // default por rol) para que los checkboxes reflejen el acceso real de hoy.
        const snapshot: Record<string, ModuloPermiso> = {};
        MODULOS.forEach(modulo => {
            snapshot[modulo.key] = {
                ver: getPermiso(member, modulo.key, 'ver'),
                editar: getPermiso(member, modulo.key, 'editar'),
                eliminar: getPermiso(member, modulo.key, 'eliminar'),
            };
        });
        setSelectedPermisos(snapshot);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setSelectedRoles([]);
        setSelectedPermisos({});
    };

    const handleSaveRoles = async (memberId: string) => {
        try {
            const { error } = await supabase
                .from('usuarios_internos')
                .update({ roles: selectedRoles, permisos: selectedPermisos })
                .eq('id', memberId);

            if (error) throw error;

            // Optimistic update
            setMembers(members.map(m => m.id === memberId ? { ...m, roles: selectedRoles, permisos: selectedPermisos } : m));
            setEditingId(null);
        } catch (error) {
            console.error('Error updating roles:', error);
            alert('Error al actualizar roles y permisos');
        }
    };

    const toggleRole = (role: UserRole) => {
        if (selectedRoles.includes(role)) {
            setSelectedRoles(selectedRoles.filter(r => r !== role));
        } else {
            setSelectedRoles([...selectedRoles, role]);
        }
    };

    const togglePermiso = (moduloKey: string, accion: typeof ACCIONES[number]) => {
        setSelectedPermisos(prev => ({
            ...prev,
            [moduloKey]: {
                ...prev[moduloKey],
                [accion]: !prev[moduloKey]?.[accion],
            },
        }));
    };

    const toggleActivo = async (member: any) => {
        const nuevoEstado = !member.activo;
        const confirmMsg = nuevoEstado
            ? `¿Reactivar a ${member.nombre}? Podrá volver a iniciar sesión.`
            : `¿Desactivar a ${member.nombre}? No podrá acceder al sistema hasta que lo reactives.`;
        if (!confirm(confirmMsg)) return;

        try {
            const { error } = await supabase
                .from('usuarios_internos')
                .update({ activo: nuevoEstado })
                .eq('id', member.id);

            if (error) throw error;
            setMembers(members.map(m => m.id === member.id ? { ...m, activo: nuevoEstado } : m));
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Error al cambiar el estado del usuario');
        }
    };

    const toggleInviteRole = (role: UserRole) => {
        setInviteForm(prev => ({
            ...prev,
            roles: prev.roles.includes(role) ? prev.roles.filter(r => r !== role) : [...prev.roles, role],
        }));
    };

    const handleInvite = async (e: FormEvent) => {
        e.preventDefault();
        setInviteError('');
        setInviteLoading(true);
        try {
            // Usamos un cliente separado (sin persistir sesión) para que el alta
            // del nuevo usuario no reemplace la sesión del admin logueado.
            const scopedClient = createClient(
                import.meta.env.VITE_SUPABASE_URL,
                import.meta.env.VITE_SUPABASE_ANON_KEY,
                { auth: { persistSession: false } }
            );

            const { data: authData, error: authError } = await scopedClient.auth.signUp({
                email: inviteForm.email,
                password: inviteForm.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('No se pudo crear el usuario.');

            const roles = inviteForm.roles.length ? inviteForm.roles : ['cliente'];
            const { error: insertError } = await supabase.from('usuarios_internos').insert({
                id: authData.user.id,
                email: inviteForm.email,
                nombre: inviteForm.nombre,
                apellido: inviteForm.apellido || null,
                rol: roles[0],
                roles,
                activo: true,
                permisos: {},
            });

            if (insertError) throw insertError;

            alert(`Miembro creado. Compartile estas credenciales para el primer inicio de sesión:\n\nEmail: ${inviteForm.email}\nContraseña temporal: ${inviteForm.password}`);
            setIsInviteOpen(false);
            setInviteForm(emptyInviteForm());
            fetchMembers();
        } catch (error: any) {
            console.error('Error inviting member:', error);
            setInviteError(error.message || 'Error al crear el miembro.');
        } finally {
            setInviteLoading(false);
        }
    };

    // Helper to check if current user is owner/admin
    const canManageUsers = currentUser?.roles?.includes('owner') || currentUser?.roles?.includes('admin');
    const editingIsSuperRole = selectedRoles.includes('owner') || selectedRoles.includes('admin');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Equipo</h1>
                    <p className="text-sm text-gray-500">Gestiona los usuarios y roles del sistema.</p>
                </div>
                <button
                    onClick={() => setIsInviteOpen(true)}
                    disabled={!canManageUsers}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={canManageUsers ? undefined : 'Solo un Owner/Admin puede invitar miembros'}
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
                                <Fragment key={member.id}>
                                    <tr className="hover:bg-gray-50">
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
                                                            title="Editar Roles y Permisos"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    {canManageUsers && member.id !== currentUser?.id && (
                                                        <button
                                                            onClick={() => toggleActivo(member)}
                                                            className={member.activo ? 'text-gray-400 hover:text-red-600 transition-colors' : 'text-gray-400 hover:text-green-600 transition-colors'}
                                                            title={member.activo ? 'Desactivar usuario' : 'Reactivar usuario'}
                                                        >
                                                            {member.activo ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    {editingId === member.id && (
                                        <tr key={`${member.id}-permisos`} className="bg-blue-50/40">
                                            <td colSpan={4} className="px-6 py-4">
                                                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Permisos por sección</p>
                                                {editingIsSuperRole ? (
                                                    <p className="text-sm text-gray-500">Este usuario tiene rol Owner/Admin: acceso total a todo el sistema. Los permisos por sección no aplican.</p>
                                                ) : (
                                                    <div className="overflow-x-auto">
                                                        <table className="text-sm">
                                                            <thead>
                                                                <tr className="text-left text-gray-500">
                                                                    <th className="py-1 pr-6 font-medium">Sección</th>
                                                                    <th className="py-1 px-3 font-medium text-center">Ver</th>
                                                                    <th className="py-1 px-3 font-medium text-center">Editar</th>
                                                                    <th className="py-1 px-3 font-medium text-center">Eliminar</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {MODULOS.map(modulo => (
                                                                    <tr key={modulo.key} className="border-t border-blue-100">
                                                                        <td className="py-1.5 pr-6 text-gray-700">{modulo.label}</td>
                                                                        {ACCIONES.map(accion => (
                                                                            <td key={accion} className="py-1.5 px-3 text-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={!!selectedPermisos[modulo.key]?.[accion]}
                                                                                    onChange={() => togglePermiso(modulo.key, accion)}
                                                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                                />
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {isInviteOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Invitar Miembro</h2>
                        <form onSubmit={handleInvite} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Nombre</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={inviteForm.nombre}
                                        onChange={e => setInviteForm({ ...inviteForm, nombre: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Apellido</label>
                                    <input
                                        type="text"
                                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                        value={inviteForm.apellido}
                                        onChange={e => setInviteForm({ ...inviteForm, apellido: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    value={inviteForm.email}
                                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contraseña temporal</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        minLength={6}
                                        className="w-full border border-gray-200 rounded-lg p-2 text-sm font-mono focus:ring-blue-500 focus:border-blue-500"
                                        value={inviteForm.password}
                                        onChange={e => setInviteForm({ ...inviteForm, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setInviteForm({ ...inviteForm, password: generarPasswordTemporal() })}
                                        className="px-3 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"
                                        title="Generar otra contraseña"
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">Se la vas a tener que compartir vos al empleado luego de crearlo.</p>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Roles</label>
                                <div className="flex flex-wrap gap-2">
                                    {AVAILABLE_ROLES.map(role => (
                                        <button
                                            type="button"
                                            key={role}
                                            onClick={() => toggleInviteRole(role)}
                                            className={`px-2 py-1 text-xs rounded-full border ${inviteForm.roles.includes(role)
                                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {role}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">Los permisos finos (ver/editar/eliminar por sección) se ajustan después, editando al miembro ya creado.</p>
                            </div>
                            {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsInviteOpen(false); setInviteError(''); }}
                                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviteLoading}
                                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {inviteLoading ? 'Creando...' : 'Crear Miembro'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-1">Nota para el Dueño</h3>
                <p className="text-sm text-blue-600">
                    Hacé clic en el lápiz para editar los roles y los permisos por sección (ver / editar / eliminar) de cualquier usuario. Un rol Owner o Admin siempre tiene acceso total. Para el resto, si no le tocás los permisos de una sección, mantiene el acceso que le da su rol por defecto.
                </p>
            </div>
        </div>
    );
};
