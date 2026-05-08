import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ui/ModalPortal';
import {
  SearchIcon,
  PlusIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  EditIcon,
  TrashIcon,
  XIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  StarIcon,
  AlertCircleIcon,
  CalendarIcon,
} from 'lucide-react';
import { clientesApi } from '../../api/clientes';
import { ClienteFichaDrawer } from '../../components/admin/ClienteFichaDrawer';
import { ToastContainer } from '../../components/ui/Toast';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { usePagination } from '../../hooks/usePagination';
import { useAuth, tienePermiso } from '../../contexts/AuthContext';
import type { Cliente, CrearClienteDto } from '../../types';

type Tab = 'activos' | 'archivados';

const EMPTY_FORM: CrearClienteDto = {
  sucursalId: '',
  nombre: '',
  apellido: '',
  telefono: '',
  email: '',
  observaciones: '',
};

export function Clientes() {
  const { toasts, addToast, dismiss } = useToast();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const { user } = useAuth();
  const sucursalId = user?.sucursalId ?? '';
  const puedeVerTelefono = tienePermiso(user, 'VerTelefonoClientes');

  const [tab, setTab] = useState<Tab>('activos');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [archivados, setArchivados] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState<CrearClienteDto>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fichaCliente, setFichaCliente] = useState<Cliente | null>(null);

  const cargar = () => {
    setLoading(true);
    Promise.all([
      clientesApi.listar(sucursalId),
      clientesApi.listarArchivados(sucursalId),
    ])
      .then(([activos, arch]) => {
        setClientes(activos);
        setArchivados(arch);
      })
      .catch(() => addToast('error', 'No se pudieron cargar los clientes.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const listaActual = tab === 'activos' ? clientes : archivados;

  const filtrados = listaActual.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.apellido.toLowerCase().includes(q) ||
      c.telefono.includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    );
  });

  const { page, setPage, totalPages, paginated, total, pageSize } = usePagination(filtrados, 10);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, sucursalId });
    setModalOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({
      sucursalId: c.sucursalId,
      nombre: c.nombre,
      apellido: c.apellido,
      telefono: c.telefono,
      email: c.email ?? '',
      observaciones: c.observaciones ?? '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.apellido || !form.telefono) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await clientesApi.actualizar(editing.id, form);
        setClientes((prev) => prev.map((c) => (c.id === editing.id ? updated : c)));
        addToast('success', 'Cliente actualizado.');
      } else {
        const nuevo = await clientesApi.crear(form);
        setClientes((prev) => [nuevo, ...prev]);
        addToast('success', 'Cliente creado.');
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar.';
      addToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleArchivar = async (c: Cliente) => {
    const ok = await confirm({
      title: `¿Archivar a ${c.nombre} ${c.apellido}?`,
      description: 'El cliente dejará de aparecer en búsquedas y al crear turnos. Podés desarchivarlo cuando quieras.',
      confirmLabel: 'Sí, archivar',
    });
    if (!ok) return;
    try {
      await clientesApi.archivar(c.id);
      setClientes((prev) => prev.filter((x) => x.id !== c.id));
      setArchivados((prev) => [{ ...c, activo: false }, ...prev]);
      addToast('success', `${c.nombre} ${c.apellido} archivado.`);
    } catch {
      addToast('error', 'No se pudo archivar el cliente.');
    }
  };

  const handleDesarchivar = async (c: Cliente) => {
    try {
      await clientesApi.desarchivar(c.id);
      setArchivados((prev) => prev.filter((x) => x.id !== c.id));
      setClientes((prev) => [{ ...c, activo: true, fechaArchivado: undefined }, ...prev]);
      addToast('success', `${c.nombre} ${c.apellido} desarchivado.`);
    } catch {
      addToast('error', 'No se pudo desarchivar el cliente.');
    }
  };

  const handleEliminar = async (c: Cliente) => {
    const ok = await confirm({
      title: `¿Eliminar definitivamente a ${c.nombre} ${c.apellido}?`,
      description: 'Esta acción es permanente y no se puede deshacer. Solo es posible si el cliente no tiene historial operativo.',
      confirmLabel: 'Sí, eliminar',
    });
    if (!ok) return;
    try {
      await clientesApi.eliminar(c.id);
      setClientes((prev) => prev.filter((x) => x.id !== c.id));
      setArchivados((prev) => prev.filter((x) => x.id !== c.id));
      addToast('success', 'Cliente eliminado.');
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message.includes('409')
        ? 'No se puede eliminar: el cliente tiene historial de turnos o pagos. Archivalo en su lugar.'
        : 'No se pudo eliminar el cliente.';
      addToast('error', msg);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Clientes</h2>
          <p className="text-text-secondary text-sm mt-1">
            {clientes.length} activos · {archivados.length} archivados
          </p>
        </div>
        {tab === 'activos' && (
          <button
            onClick={openCreate}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-button text-sm font-medium transition-colors flex items-center gap-2 self-start"
          >
            <PlusIcon className="w-4 h-4" />
            Nuevo cliente
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-background rounded-lg p-1 w-fit border border-border">
        {(['activos', 'archivados'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSearch(''); setPage(1); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t === 'activos' ? `Activos (${clientes.length})` : `Archivados (${archivados.length})`}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Table */}
      <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-surface-background rounded-full flex items-center justify-center mb-4">
              {tab === 'archivados'
                ? <ArchiveIcon className="w-8 h-8 text-text-muted" />
                : <UserIcon className="w-8 h-8 text-text-muted" />
              }
            </div>
            <h3 className="font-heading font-bold text-text-primary mb-1">
              {search ? 'Sin resultados' : tab === 'archivados' ? 'Sin clientes archivados' : 'Sin clientes'}
            </h3>
            <p className="text-text-secondary text-sm">
              {search ? 'Intentá con otra búsqueda.' : tab === 'activos' ? 'Creá el primer cliente.' : ''}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-background border-b border-border">
                <tr>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary">Nombre</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary">Teléfono</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary hidden md:table-cell">Email</th>
                  <th className="text-left px-6 py-3 font-semibold text-text-secondary hidden lg:table-cell">Turnos</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginated.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-background/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setFichaCliente(c)}
                              className="font-medium text-text-primary hover:text-primary hover:underline transition-colors text-left"
                            >
                              {c.nombre} {c.apellido}
                            </button>
                            {c.esFrecuente && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                                <StarIcon className="w-2.5 h-2.5" />
                                Frecuente
                              </span>
                            )}
                            {c.tieneNoShow && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">
                                <AlertCircleIcon className="w-2.5 h-2.5" />
                                No-show
                              </span>
                            )}
                          </div>
                          {c.ultimaVisita && (
                            <span className="hidden sm:flex items-center gap-1 mt-0.5 text-xs text-text-muted">
                              <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">
                                {new Date(c.ultimaVisita).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {puedeVerTelefono ? (
                        <a href={`tel:${c.telefono}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <PhoneIcon className="w-3.5 h-3.5" />
                          {c.telefono}
                        </a>
                      ) : (
                        <span className="flex items-center gap-1 text-text-muted italic text-sm">
                          <PhoneIcon className="w-3.5 h-3.5" />
                          ••••••••
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text-secondary hidden md:table-cell">
                      {c.email ? (
                        <a href={`mailto:${c.email}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <MailIcon className="w-3.5 h-3.5" />
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 hidden lg:table-cell">
                      <span className="text-text-secondary text-sm">{c.totalTurnos}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 justify-end">
                        {tab === 'activos' ? (
                          <>
                            <button
                              onClick={() => openEdit(c)}
                              className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="Editar"
                            >
                              <EditIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleArchivar(c)}
                              className="p-1.5 text-text-secondary hover:text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                              title="Archivar"
                            >
                              <ArchiveIcon className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleDesarchivar(c)}
                              className="p-1.5 text-text-secondary hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Desarchivar"
                            >
                              <ArchiveRestoreIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEliminar(c)}
                              className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors"
                              title="Eliminar definitivamente"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 pb-4">
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
            </div>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      <AnimatePresence>
        {modalOpen && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20 backdrop-blur-sm px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface rounded-card shadow-2xl w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading font-bold text-xl text-text-primary">
                    {editing ? 'Editar cliente' : 'Nuevo cliente'}
                  </h3>
                  <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-primary">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  {[
                    { key: 'nombre',        label: 'Nombre *',                type: 'text',  placeholder: 'María',                        maxLength: 100 },
                    { key: 'apellido',      label: 'Apellido *',              type: 'text',  placeholder: 'López',                        maxLength: 100 },
                    { key: 'telefono',      label: 'Teléfono *',              type: 'tel',   placeholder: '11 4567 8901',                 maxLength: 15  },
                    { key: 'email',         label: 'Email (opcional)',         type: 'email', placeholder: 'maria@ejemplo.com',            maxLength: 100 },
                    { key: 'observaciones', label: 'Observaciones (opcional)', type: 'text',  placeholder: 'Alérgica a ciertos productos', maxLength: 500 },
                  ].map(({ key, label, type, placeholder, maxLength }) => {
                    const isTelefonoRestringido = key === 'telefono' && editing && !puedeVerTelefono;
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
                        {isTelefonoRestringido ? (
                          <div className="w-full px-3 py-2 rounded-input border border-border bg-surface-background text-sm text-text-muted italic flex items-center gap-2">
                            <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            Sin permiso para ver el teléfono
                          </div>
                        ) : (
                          <input
                            type={type}
                            value={form[key as keyof CrearClienteDto] as string}
                            onChange={(e) => {
                              const val = key === 'telefono'
                                ? e.target.value.replace(/[^0-9\s\-\+\(\)]/g, '')
                                : e.target.value;
                              setForm({ ...form, [key]: val });
                            }}
                            maxLength={maxLength}
                            className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                            placeholder={placeholder}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setModalOpen(false)}
                    className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!form.nombre || !form.apellido || !form.telefono || saving}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear cliente'}
                  </button>
                </div>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {ConfirmDialog}

      <ClienteFichaDrawer
        cliente={fichaCliente}
        onClose={() => setFichaCliente(null)}
      />
    </div>
  );
}
