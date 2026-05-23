import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ui/ModalPortal';
import {
  SearchIcon,
  PlusIcon,
  BuildingIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
  EyeIcon,
  EditIcon,
  PowerIcon,
  XIcon,
  CheckIcon,
  ArrowLeftRightIcon,
  CalendarPlusIcon,
} from 'lucide-react';
import { superAdminApi, suscripcionesAdminApi, planesApi } from '../../api/superadmin';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import type {
  SucursalSuperAdmin,
  SuscripcionSuperAdminItem,
  ActualizarSucursalSuperAdminDto,
  Plan,
} from '../../types';
import { formatFechaCorta } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EstadoSub = SuscripcionSuperAdminItem['estado'];

function getSubBadge(estado?: EstadoSub) {
  switch (estado) {
    case 'Activa':      return { label: 'Activa',        cls: 'bg-green-100 text-green-700'  };
    case 'PruebActiva': return { label: 'Trial',          cls: 'bg-yellow-100 text-yellow-700' };
    case 'PruebVencida':return { label: 'Trial vencido',  cls: 'bg-red-100 text-red-700'      };
    case 'Vencida':     return { label: 'Vencida',        cls: 'bg-red-100 text-red-700'      };
    case 'Cancelada':   return { label: 'Cancelada',      cls: 'bg-surface-background text-text-muted border border-border' };
    default:            return { label: 'Sin datos',      cls: 'bg-surface-background text-text-muted border border-border' };
  }
}

type TabKey = 'todas' | 'activas' | 'trial' | 'vencidas';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'todas',    label: 'Todas'   },
  { key: 'activas',  label: 'Activas' },
  { key: 'trial',    label: 'Trial'   },
  { key: 'vencidas', label: 'Vencidas'},
];

function matchTab(estado: EstadoSub | undefined, tab: TabKey) {
  if (tab === 'todas')    return true;
  if (tab === 'activas')  return estado === 'Activa';
  if (tab === 'trial')    return estado === 'PruebActiva';
  if (tab === 'vencidas') return estado === 'Vencida' || estado === 'PruebVencida' || estado === 'Cancelada';
  return true;
}

const EMPTY_EDIT: ActualizarSucursalSuperAdminDto = {
  nombre: '', direccion: '', telefono: '', email: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Sucursales() {
  const navigate = useNavigate();
  const { toasts, addToast, dismiss } = useToast();

  // Data
  const [sucursales, setSucursales] = useState<SucursalSuperAdmin[]>([]);
  const [subMap, setSubMap]         = useState<Map<string, SuscripcionSuperAdminItem>>(new Map());
  const [planes, setPlanes]         = useState<Plan[]>([]);
  const [loading, setLoading]       = useState(true);

  // Filtros
  const [search, setSearch] = useState('');
  const [tab, setTab]       = useState<TabKey>('todas');

  // Modal edición sucursal
  const [editando, setEditando] = useState<SucursalSuperAdmin | null>(null);
  const [editForm, setEditForm] = useState<ActualizarSucursalSuperAdminDto>(EMPTY_EDIT);
  const [saving, setSaving]     = useState(false);

  // Modal cambiar plan
  const [planTarget, setPlanTarget]   = useState<SuscripcionSuperAdminItem | null>(null);
  const [planSel, setPlanSel]         = useState('');
  const [savingPlan, setSavingPlan]   = useState(false);

  // Modal toggle estado
  const [confirmarToggle, setConfirmarToggle] = useState<SucursalSuperAdmin | null>(null);
  const [toggling, setToggling]               = useState(false);

  // Extender vencimiento
  const [extendiendo, setExtendiendo]         = useState<string | null>(null);
  const [confirmarExtender, setConfirmarExtender] = useState<SucursalSuperAdmin | null>(null);

  // ── Carga inicial ────────────────────────────────────────────────────────────

  const cargar = () => {
    setLoading(true);
    Promise.all([
      superAdminApi.listarSucursales(),
      suscripcionesAdminApi.listar(),
      planesApi.listar(),
    ])
      .then(([sucs, subs, pl]) => {
        setSucursales(sucs);
        setSubMap(new Map(subs.map((s) => [s.sucursalId, s])));
        setPlanes(pl.filter((p) => p.esActivo));
      })
      .catch(() => addToast('error', 'No se pudieron cargar los datos.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  // ── Filtrado ─────────────────────────────────────────────────────────────────

  const filtradas = sucursales.filter((s) => {
    const sub  = subMap.get(s.id);
    const q    = search.toLowerCase();
    const matchSearch =
      !q ||
      s.nombre.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.telefono.includes(q) ||
      (s.owner?.nombreCompleto ?? '').toLowerCase().includes(q) ||
      (sub?.planNombre ?? '').toLowerCase().includes(q);

    return matchSearch && matchTab(sub?.estado, tab);
  });

  // ── Stats ────────────────────────────────────────────────────────────────────

  const subs      = Array.from(subMap.values());
  const cActivas  = subs.filter((s) => s.estado === 'Activa').length;
  const cTrial    = subs.filter((s) => s.estado === 'PruebActiva').length;
  const cVencidas = subs.filter((s) =>
    s.estado === 'Vencida' || s.estado === 'PruebVencida' || s.estado === 'Cancelada'
  ).length;

  // ── Handlers: edición sucursal ───────────────────────────────────────────────

  const abrirEdicion = (s: SucursalSuperAdmin) => {
    setEditando(s);
    setEditForm({ nombre: s.nombre, direccion: s.direccion, telefono: s.telefono, email: s.email });
  };

  const guardarEdicion = async () => {
    if (!editando) return;
    setSaving(true);
    try {
      const updated = await superAdminApi.actualizarSucursal(editando.id, editForm);
      setSucursales((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      addToast('success', 'Sucursal actualizada.');
      setEditando(null);
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  // ── Handlers: toggle estado ──────────────────────────────────────────────────

  const toggleEstado = async (s: SucursalSuperAdmin) => {
    setToggling(true);
    try {
      const updated = await superAdminApi.toggleEstado(s.id);
      setSucursales((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      addToast('success', `Sucursal ${updated.activa ? 'activada' : 'desactivada'}.`);
      setConfirmarToggle(null);
    } catch {
      addToast('error', 'No se pudo cambiar el estado.');
    } finally {
      setToggling(false);
    }
  };

  // ── Handlers: extender vencimiento ──────────────────────────────────────

  const extenderVencimiento = async (s: SucursalSuperAdmin) => {
    setExtendiendo(s.id);
    try {
      const updated = await suscripcionesAdminApi.extenderVencimiento(s.id);
      setSubMap((prev) => new Map(prev).set(updated.sucursalId, updated));
      addToast('success', `Vencimiento extendido hasta ${formatFechaCorta(updated.fechaVencimiento)}.`);
      setConfirmarExtender(null);
    } catch {
      addToast('error', 'No se pudo extender el vencimiento.');
    } finally {
      setExtendiendo(null);
    }
  };

  // ── Handlers: cambiar plan ───────────────────────────────────────────────────

  const abrirCambiarPlan = (s: SucursalSuperAdmin) => {
    const sub = subMap.get(s.id);
    if (!sub) return;
    setPlanTarget(sub);
    setPlanSel(sub.planId);
  };

  const confirmarCambioPlan = async () => {
    if (!planTarget || !planSel) return;
    if (planSel === planTarget.planId) { setPlanTarget(null); return; }
    setSavingPlan(true);
    try {
      const updated = await suscripcionesAdminApi.cambiarPlan(planTarget.sucursalId, { planId: planSel });
      setSubMap((prev) => new Map(prev).set(updated.sucursalId, updated));
      addToast('success', `Plan de "${updated.sucursalNombre}" actualizado a ${updated.planNombre}.`);
      setPlanTarget(null);
    } catch {
      addToast('error', 'No se pudo cambiar el plan.');
    } finally {
      setSavingPlan(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Sucursales</h2>
          <p className="text-text-secondary text-sm mt-1">{sucursales.length} sucursales registradas</p>
        </div>
        <button
          onClick={() => navigate('/superadmin/sucursales/nueva')}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-button text-sm font-medium transition-colors flex items-center gap-2 self-start"
        >
          <PlusIcon className="w-4 h-4" />
          Nueva sucursal
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total',    value: sucursales.length, cls: 'bg-blue-50 text-blue-700 border-blue-100'   },
          { label: 'Activas',  value: cActivas,          cls: 'bg-green-50 text-green-700 border-green-100' },
          { label: 'Trial',    value: cTrial,            cls: 'bg-yellow-50 text-yellow-700 border-yellow-100' },
          { label: 'Vencidas', value: cVencidas,         cls: 'bg-red-50 text-red-700 border-red-100'      },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`rounded-card border px-5 py-4 ${cls}`}>
            <p className="text-2xl font-bold font-heading">{value}</p>
            <p className="text-sm mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder="Buscar por nombre, email, teléfono, owner o plan…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-surface border border-border rounded-input text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative whitespace-nowrap ${
              tab === t.key
                ? 'text-primary'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {t.label}
            {tab === t.key && (
              <motion.div
                layoutId="sucursalesTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-surface-background rounded-full flex items-center justify-center mb-4">
              <BuildingIcon className="w-8 h-8 text-text-muted" />
            </div>
            <h3 className="font-heading font-bold text-text-primary mb-1">
              {search ? 'Sin resultados' : 'Sin sucursales'}
            </h3>
            <p className="text-text-secondary text-sm">
              {search ? 'Intentá con otra búsqueda.' : 'Creá la primera sucursal.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-background border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Sucursal</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary hidden lg:table-cell">Owner</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary hidden md:table-cell">Plan</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary">Suscripción</th>
                  <th className="text-left px-5 py-3 font-semibold text-text-secondary hidden sm:table-cell">Sucursal</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtradas.map((s) => {
                  const sub  = subMap.get(s.id);
                  const badge = getSubBadge(sub?.estado);
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-surface-background/50 transition-colors ${!s.activa ? 'opacity-55' : ''}`}
                    >
                      {/* Sucursal */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BuildingIcon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-text-primary">{s.nombre}</p>
                            <p className="text-xs text-text-muted truncate max-w-[180px]">{s.direccion}</p>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="px-5 py-4 hidden lg:table-cell">
                        {s.owner ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                              {s.owner.nombre.charAt(0)}{s.owner.apellido.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm text-text-primary font-medium leading-none">{s.owner.nombreCompleto}</p>
                              <div className="flex items-center gap-1 mt-1">
                                <MailIcon className="w-3 h-3 text-text-muted flex-shrink-0" />
                                <p className="text-xs text-text-muted">{s.owner.email}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-text-muted">
                            <UserIcon className="w-3.5 h-3.5" />
                            <span className="text-xs">Sin owner</span>
                          </div>
                        )}
                      </td>

                      {/* Plan */}
                      <td className="px-5 py-4 hidden md:table-cell">
                        {sub ? (
                          <span className="inline-flex items-center px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                            {sub.planNombre}
                          </span>
                        ) : (
                          <span className="text-xs text-text-muted">—</span>
                        )}
                      </td>

                      {/* Suscripción */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                            {badge.label}
                          </span>
                          {sub && (
                            <p className="text-xs text-text-muted">
                              {sub.diasRestantes > 0
                                ? `${sub.diasRestantes}d · ${formatFechaCorta(sub.fechaVencimiento)}`
                                : `Vencida el ${formatFechaCorta(sub.fechaVencimiento)}`}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Estado sucursal */}
                      <td className="px-5 py-4 hidden sm:table-cell">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                            s.activa
                              ? 'bg-green-100 text-green-700'
                              : 'bg-surface-background text-text-muted border border-border'
                          }`}
                        >
                          {s.activa ? <CheckIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                          {s.activa ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => navigate(`/superadmin/sucursales/${s.id}`)}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Ver detalle"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirEdicion(s)}
                            className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Editar sucursal"
                          >
                            <EditIcon className="w-4 h-4" />
                          </button>
                          {sub && (
                            <button
                              onClick={() => setConfirmarExtender(s)}
                              disabled={extendiendo === s.id}
                              className="p-1.5 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                              title="Extender +30 días"
                            >
                              <CalendarPlusIcon className="w-4 h-4" />
                            </button>
                          )}
                          {sub && (
                            <button
                              onClick={() => abrirCambiarPlan(s)}
                              className="p-1.5 text-text-secondary hover:text-accent hover:bg-accent/10 rounded-md transition-colors"
                              title="Cambiar plan"
                            >
                              <ArrowLeftRightIcon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmarToggle(s)}
                            className={`p-1.5 rounded-md transition-colors ${
                              s.activa
                                ? 'text-text-secondary hover:text-error hover:bg-error/10'
                                : 'text-text-secondary hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={s.activa ? 'Desactivar' : 'Activar'}
                          >
                            <PowerIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: editar sucursal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {editando && (
          <ModalPortal>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-surface rounded-card shadow-2xl w-full max-w-md p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-heading font-bold text-xl text-text-primary">Editar sucursal</h3>
                  <button onClick={() => setEditando(null)} className="text-text-muted hover:text-text-primary">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    { key: 'nombre',    label: 'Nombre *',    type: 'text',  ph: 'Nombre de la sucursal' },
                    { key: 'direccion', label: 'Dirección *', type: 'text',  ph: 'Av. Corrientes 1234'   },
                    { key: 'telefono',  label: 'Teléfono *',  type: 'tel',   ph: '11 4567 8901'          },
                    { key: 'email',     label: 'Email *',     type: 'email', ph: 'local@ejemplo.com'     },
                  ].map(({ key, label, type, ph }) => (
                    <div key={key}>
                      <label className="block text-sm font-medium text-text-primary mb-1">{label}</label>
                      <input
                        type={type}
                        value={editForm[key as keyof ActualizarSucursalSuperAdminDto]}
                        onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                        placeholder={ph}
                        className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setEditando(null)}
                    className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={guardarEdicion}
                    disabled={!editForm.nombre || !editForm.direccion || !editForm.telefono || !editForm.email || saving}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Guardando…' : 'Actualizar'}
                  </button>
                </div>
              </motion.div>
            </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* ── Modal: cambiar plan ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {planTarget && (
          <ModalPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setPlanTarget(null); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-card border border-border w-full max-w-sm shadow-xl"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="font-heading font-semibold text-text-primary">Cambiar plan</h3>
                  <button
                    onClick={() => setPlanTarget(null)}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-background rounded-lg transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <p className="text-sm text-text-secondary">
                    Sucursal: <span className="font-medium text-text-primary">{planTarget.sucursalNombre}</span>
                  </p>
                  <p className="text-sm text-text-secondary">
                    Plan actual: <span className="font-medium text-text-primary">{planTarget.planNombre}</span>
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Nuevo plan <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={planSel}
                      onChange={(e) => setPlanSel(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    >
                      {planes.map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                    </select>
                  </div>
                  {planSel === planTarget.planId && (
                    <p className="text-xs text-text-muted">El plan seleccionado es el mismo que el actual.</p>
                  )}
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                  <button
                    onClick={() => setPlanTarget(null)}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-button hover:bg-surface-background transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarCambioPlan}
                    disabled={savingPlan || !planSel}
                    className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-button transition-colors disabled:opacity-50"
                  >
                    {savingPlan ? 'Guardando…' : 'Confirmar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* ── Modal: confirmar toggle estado ──────────────────────────────────── */}
      <AnimatePresence>
        {confirmarToggle && (
          <ModalPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setConfirmarToggle(null); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-card border border-border w-full max-w-sm shadow-xl"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="font-heading font-semibold text-text-primary">Confirmar acción</h3>
                  <button
                    onClick={() => setConfirmarToggle(null)}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-background rounded-lg transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-text-primary">
                    ¿Deseas{' '}
                    <span className="font-medium">
                      {confirmarToggle.activa ? 'desactivar' : 'activar'}
                    </span>{' '}
                    la sucursal{' '}
                    <span className="font-medium">"{confirmarToggle.nombre}"</span>?
                  </p>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                  <button
                    onClick={() => setConfirmarToggle(null)}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-button hover:bg-surface-background transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => toggleEstado(confirmarToggle)}
                    disabled={toggling}
                    className={`px-4 py-2 text-sm font-medium text-white rounded-button transition-colors disabled:opacity-50 ${
                      confirmarToggle.activa
                        ? 'bg-error hover:bg-error/90'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {toggling ? 'Procesando…' : confirmarToggle.activa ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* ── Modal: confirmar extender vencimiento ───────────────────────────── */}
      <AnimatePresence>
        {confirmarExtender && (
          <ModalPortal>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => { if (e.target === e.currentTarget) setConfirmarExtender(null); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-surface rounded-card border border-border w-full max-w-sm shadow-xl"
              >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                  <h3 className="font-heading font-semibold text-text-primary">Extender vencimiento</h3>
                  <button
                    onClick={() => setConfirmarExtender(null)}
                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-background rounded-lg transition-colors"
                  >
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm text-text-primary">
                    ¿Extender el vencimiento de{' '}
                    <span className="font-medium">"{confirmarExtender.nombre}"</span>{' '}
                    en <span className="font-medium">+30 días</span>?
                  </p>
                  <p className="text-xs text-text-muted mt-2">
                    Si la suscripción está vigente, los 30 días se suman a la fecha actual de vencimiento.
                  </p>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                  <button
                    onClick={() => setConfirmarExtender(null)}
                    className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-button hover:bg-surface-background transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => extenderVencimiento(confirmarExtender)}
                    disabled={extendiendo === confirmarExtender.id}
                    className="px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-button transition-colors disabled:opacity-50"
                  >
                    {extendiendo === confirmarExtender.id ? 'Extendiendo…' : 'Confirmar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
