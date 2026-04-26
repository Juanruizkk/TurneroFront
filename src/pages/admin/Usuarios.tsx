import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ui/ModalPortal';
import {
  SearchIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  XIcon,
  UserCogIcon,
  ShieldCheckIcon,
  EyeOffIcon,
  CheckIcon,
  MailIcon,
  ClockIcon,
  CalendarIcon,
  Link2Icon,
} from 'lucide-react';
import { usuariosApi } from '../../api/usuarios';
import { ToastContainer } from '../../components/ui/Toast';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useAuth } from '../../contexts/AuthContext';
import { DisponibilidadDrawer } from '../../components/admin/DisponibilidadDrawer';
import type {
  Usuario,
  CrearUsuarioDto,
  ActualizarUsuarioDto,
  RolUsuario,
  EstadoUsuario,
  PermisoSistema,
} from '../../types';


// ─── Helpers visuales ────────────────────────────────────────────────────────

const ROL_CONFIG: Record<RolUsuario, { label: string; className: string }> = {
  Administrativo: { label: 'Administrativo', className: 'bg-purple-100 text-purple-700' },
  Profesional:    { label: 'Profesional',    className: 'bg-blue-100 text-blue-700'   },
  Caja:           { label: 'Caja',           className: 'bg-amber-100 text-amber-700' },
};

const PERMISO_LABELS: Record<PermisoSistema, string> = {
  AgendarTurnos:       'Agendar turnos',
  EditarTurnos:        'Editar turnos',
  CargarCobranzas:     'Cargar cobranzas',
  VerTelefonoClientes: 'Ver teléfonos',
  GestionarAjustes:    'Gestionar ajustes',
};

const TODOS_LOS_PERMISOS: PermisoSistema[] = [
  'AgendarTurnos',
  'EditarTurnos',
  'CargarCobranzas',
  'VerTelefonoClientes',
  'GestionarAjustes',
];

const ROLES: RolUsuario[] = ['Administrativo', 'Profesional', 'Caja'];

function getInitials(nombre: string, apellido: string) {
  return `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();
}

// ─── Formulario vacío ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nombre:   '',
  apellido: '',
  email:    '',
  telefono: '',
  rol:      'Profesional' as RolUsuario,
  estado:   'Activo' as EstadoUsuario,
  permisos: [] as PermisoSistema[],
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function Usuarios() {
  const { user } = useAuth();
  const sucursalId = user?.sucursalId ?? '';
  const esAdmin = user?.esOwner || user?.rol === 'Administrativo';
  const { toasts, addToast, dismiss } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filtroRol, setFiltroRol] = useState<RolUsuario | ''>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]   = useState<Usuario | null>(null);
  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [dispUsuario, setDispUsuario] = useState<Usuario | null>(null);
  const [invitacionLinks, setInvitacionLinks] = useState<Record<string, string>>({});

  const cargar = () => {
    if (!sucursalId) return;
    setLoading(true);
    usuariosApi
      .listar(sucursalId)
      .then(setUsuarios)
      .catch(() => addToast('error', 'No se pudieron cargar los usuarios.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  // ── Filtros ──────────────────────────────────────────────────────────────────

  const filtrados = usuarios.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      u.nombre.toLowerCase().includes(q) ||
      u.apellido.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.telefono.includes(q);
    const matchRol = filtroRol === '' || u.rol === filtroRol;
    return matchSearch && matchRol;
  });

  const { page, setPage, totalPages, paginated, total, pageSize } = usePagination(filtrados, 10);

  // ── Modal helpers ─────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModalOpen(true);
  };

  const openEdit = (u: Usuario) => {
    setEditing(u);
    setForm({
      nombre:   u.nombre,
      apellido: u.apellido,
      email:    u.email,
      telefono: u.telefono,
      rol:      u.rol,
      estado:   u.estado,
      permisos: [...u.permisos],
    });
    setModalOpen(true);
  };

  const handleReenviar = async (u: Usuario) => {
    try {
      const { link } = await usuariosApi.reenviarInvitacion(u.id);
      setInvitacionLinks((prev) => ({ ...prev, [u.id]: link }));
      addToast('success', `Invitación reenviada a ${u.email}.`);
    } catch {
      addToast('error', 'No se pudo reenviar la invitación.');
    }
  };

  const handleCopiarLink = async (id: string) => {
    const link = invitacionLinks[id];
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      addToast('success', 'Link copiado al portapapeles.');
    } catch {
      addToast('error', 'No se pudo copiar el link.');
    }
  };

  const togglePermiso = (p: PermisoSistema) => {
    setForm((prev) => ({
      ...prev,
      permisos: prev.permisos.includes(p)
        ? prev.permisos.filter((x) => x !== p)
        : [...prev.permisos, p],
    }));
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.nombre || !form.apellido || !form.email || !form.telefono) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      addToast('error', 'El email no tiene un formato válido.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const dto: ActualizarUsuarioDto = {
          nombre:       form.nombre,
          apellido:     form.apellido,
          email:        form.email,
          telefono:     form.telefono,
          passwordHash: editing.nombreCompleto, // campo requerido por el DTO; se reemplaza por hashing real
          rol:          form.rol,
          estado:       form.estado,
          permisos:     form.permisos,
        };
        const updated = await usuariosApi.actualizar(editing.id, dto);
        setUsuarios((prev) => prev.map((u) => (u.id === editing.id ? updated : u)));
        addToast('success', 'Usuario actualizado.');
      } else {
        const dto: CrearUsuarioDto = {
          sucursalId: sucursalId,
          nombre:     form.nombre,
          apellido:   form.apellido,
          email:      form.email,
          telefono:   form.telefono,
          rol:        form.rol,
          permisos:   form.permisos,
        };
        const nuevo = await usuariosApi.crear(dto);
        setUsuarios((prev) => [nuevo, ...prev]);
        if (nuevo.invitacionLink) {
          setInvitacionLinks((prev) => ({ ...prev, [nuevo.id]: nuevo.invitacionLink! }));
        }
        addToast('success', 'Usuario creado.');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (u: Usuario) => {
    const ok = await confirm({
      title: `¿Desactivar a ${u.nombre} ${u.apellido}?`,
      description: 'El usuario quedará inactivo y no podrá acceder al sistema.',
      confirmLabel: 'Sí, desactivar',
    });
    if (!ok) return;
    try {
      await usuariosApi.eliminar(u.id);
      setUsuarios((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, estado: 'Inactivo' } : x))
      );
      addToast('success', 'Usuario desactivado.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'No se pudo desactivar el usuario.');
    }
  };

  const handleHardDelete = async (u: Usuario) => {
    const ok = await confirm({
      title: `¿Eliminar definitivamente a ${u.nombre} ${u.apellido}?`,
      description: 'Esta acción no se puede deshacer. Se eliminarán todos sus datos de configuración.',
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      await usuariosApi.hardEliminar(u.id);
      setUsuarios((prev) => prev.filter((x) => x.id !== u.id));
      addToast('success', 'Usuario eliminado.');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'No se pudo eliminar.');
    }
  };

  const canSave =
    !!form.nombre &&
    !!form.apellido &&
    !!form.email &&
    !!form.telefono;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Equipo</h2>
          <p className="text-text-secondary text-sm mt-1">
            {usuarios.filter((u) => u.estado === 'Activo').length} usuarios activos
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={openCreate}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-button text-sm font-medium transition-colors flex items-center gap-2 self-start"
          >
            <PlusIcon className="w-4 h-4" />
            Nuevo usuario
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o teléfono..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            autoComplete="off"
            className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          {(['', ...ROLES] as (RolUsuario | '')[]).map((rol) => (
            <button
              key={rol}
              onClick={() => { setFiltroRol(rol); setPage(1); }}
              className={`px-3 py-2 rounded-button text-sm font-medium transition-colors whitespace-nowrap ${
                filtroRol === rol
                  ? 'bg-primary text-white'
                  : 'bg-surface border border-border text-text-secondary hover:bg-surface-background'
              }`}
            >
              {rol === '' ? 'Todos' : ROL_CONFIG[rol as RolUsuario].label}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-surface-background rounded-full flex items-center justify-center mb-4">
              <UserCogIcon className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="font-heading font-bold text-text-primary mb-1">
              {search || filtroRol ? 'Sin resultados' : 'Sin usuarios'}
            </h3>
            <p className="text-text-secondary text-sm">
              {search || filtroRol ? 'Intentá con otra búsqueda.' : 'Creá el primer usuario del equipo.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-background border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary">Usuario</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary hidden md:table-cell">Contacto</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary">Rol</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary hidden lg:table-cell">Permisos</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary">Estado</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((u) => {
                  const rolCfg = ROL_CONFIG[u.rol];
                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-surface-background/50 transition-colors ${
                        u.estado === 'Inactivo' ? 'opacity-50' : ''
                      }`}
                    >
                      {/* Avatar + nombre */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {getInitials(u.nombre, u.apellido)}
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{u.nombre} {u.apellido}</p>
                            <p className="text-xs text-text-muted hidden sm:block">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="px-6 py-4 text-text-secondary hidden md:table-cell">
                        <p>{u.telefono}</p>
                        <p className="text-xs text-text-muted">{u.email}</p>
                      </td>

                      {/* Rol */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${rolCfg.className}`}>
                          {rolCfg.label}
                        </span>
                      </td>

                      {/* Permisos */}
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {u.permisos.length === 0 ? (
                          <span className="text-text-muted text-xs">Sin permisos extra</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {u.permisos.map((p) => (
                              <span
                                key={p}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-background border border-border rounded-full text-xs text-text-secondary"
                              >
                                <ShieldCheckIcon className="w-3 h-3 text-primary" />
                                {PERMISO_LABELS[p]}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-6 py-4">
                        {u.estado === 'Activo' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckIcon className="w-3 h-3" />Activo
                          </span>
                        )}
                        {u.estado === 'PendienteInvitacion' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                            <ClockIcon className="w-3 h-3" />Invitación pendiente
                          </span>
                        )}
                        {u.estado === 'Inactivo' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-background text-text-muted border border-border">
                            <EyeOffIcon className="w-3 h-3" />Inactivo
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-6 py-4">
                        {esAdmin && (
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="Editar"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            {(u.rol === 'Profesional' || u.rol === 'Administrativo') && (
                              <button
                                onClick={() => setDispUsuario(u)}
                                className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                title="Disponibilidad"
                              >
                                <CalendarIcon className="w-4 h-4" />
                              </button>
                            )}
                            {u.estado === 'PendienteInvitacion' && (
                              <>
                                <button
                                  onClick={() => handleReenviar(u)}
                                  className="p-1.5 text-text-secondary hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                                  title="Reenviar invitación"
                                >
                                  <MailIcon className="w-4 h-4" />
                                </button>
                                {invitacionLinks[u.id] && (
                                  <button
                                    onClick={() => handleCopiarLink(u.id)}
                                    className="p-1.5 text-text-secondary hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                    title="Copiar enlace de invitación"
                                  >
                                    <Link2Icon className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}
                            {u.estado === 'Activo' && (
                              <button
                                onClick={() => handleDelete(u)}
                                disabled={u.esOwner}
                                className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title={u.esOwner ? 'El dueño no puede desactivarse' : 'Desactivar'}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                            {u.estado === 'PendienteInvitacion' && !u.esOwner && (
                              <button
                                onClick={() => handleHardDelete(u)}
                                className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors"
                                title="Eliminar definitivamente"
                              >
                                <TrashIcon className="w-4 h-4 text-error/70" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-6 pb-4">
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-card shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-surface z-10">
                <h3 className="font-heading font-bold text-xl text-text-primary">
                  {editing ? 'Editar usuario' : 'Nuevo usuario'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-primary">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Datos personales */}
                <section>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Datos personales
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { key: 'nombre',   label: 'Nombre *',   type: 'text',  placeholder: 'María',            col: 1, maxLength: 100 },
                      { key: 'apellido', label: 'Apellido *', type: 'text',  placeholder: 'López',            col: 1, maxLength: 100 },
                      { key: 'email',    label: 'Email *',    type: 'email', placeholder: 'maria@ejemplo.com', col: 2, maxLength: 100 },
                      { key: 'telefono', label: 'Teléfono *', type: 'tel',   placeholder: '11 4567 8901',     col: 1, maxLength: 15  },
                    ].map(({ key, label, type, placeholder, col, maxLength }) => (
                      <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                        <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
                        <input
                          type={type}
                          value={form[key as keyof typeof form] as string}
                          onChange={(e) => {
                            const val = key === 'telefono'
                              ? e.target.value.replace(/[^0-9\s\-\+\(\)]/g, '')
                              : e.target.value;
                            setForm({ ...form, [key]: val });
                          }}
                          maxLength={maxLength}
                          placeholder={placeholder}
                          autoComplete="off"
                          className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </section>

                {/* Aviso invitación (solo en creación) */}
                {!editing && (
                  <div className="flex gap-2.5 p-3 bg-blue-50 border border-blue-200 rounded-input text-sm text-blue-700">
                    <MailIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>Se enviará un email de invitación. El usuario elegirá su contraseña al aceptarla.</p>
                  </div>
                )}

                {/* Acceso */}
                <section>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                    Acceso
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1">Rol *</label>
                      <select
                        value={form.rol}
                        onChange={(e) => setForm({ ...form, rol: e.target.value as RolUsuario })}
                        className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>{ROL_CONFIG[r].label}</option>
                        ))}
                      </select>
                    </div>
                    {editing && (
                      <div>
                        <label className="block text-sm font-medium text-text-primary mb-1">Estado</label>
                        <select
                          value={form.estado}
                          onChange={(e) => setForm({ ...form, estado: e.target.value as EstadoUsuario })}
                          className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                        >
                          <option value="Activo">Activo</option>
                          <option value="Inactivo">Inactivo</option>
                        </select>
                      </div>
                    )}
                  </div>
                </section>

                {/* Permisos */}
                <section>
                  <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                    Permisos adicionales
                  </h4>
                  <p className="text-xs text-text-muted mb-3">
                    Otorgá acceso a funciones específicas independientemente del rol.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {TODOS_LOS_PERMISOS.map((p) => {
                      const activo = form.permisos.includes(p);
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => togglePermiso(p)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-input border text-sm transition-all text-left ${
                            activo
                              ? 'border-primary bg-primary/5 text-primary font-medium'
                              : 'border-border bg-surface-background text-text-secondary hover:border-primary/40'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                              activo ? 'bg-primary border-primary' : 'border-border'
                            }`}
                          >
                            {activo && <CheckIcon className="w-3 h-3 text-white" />}
                          </div>
                          {PERMISO_LABELS[p]}
                        </button>
                      );
                    })}
                  </div>
                </section>
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 px-6 pb-6">
                <button
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!canSave || saving}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear usuario'}
                </button>
              </div>
            </motion.div>
          </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {ConfirmDialog}

      <DisponibilidadDrawer
        usuario={dispUsuario}
        sucursalId={sucursalId}
        onClose={() => setDispUsuario(null)}
        onSaved={() => addToast('success', 'Disponibilidad actualizada.')}
      />
    </div>
  );
}
