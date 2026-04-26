import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ui/ModalPortal';
import {
  PlusIcon,
  EditIcon,
  EyeIcon,
  EyeOffIcon,
  XIcon,
  CheckIcon,
  InfinityIcon,
  CreditCardIcon,
  DollarSignIcon,
} from 'lucide-react';
import { planesApi } from '../../api/superadmin';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import type { Plan, CrearPlanDto, ActualizarPlanDto } from '../../types';

const EMPTY_FORM: CrearPlanDto = {
  nombre: '',
  descripcion: '',
  maxUsuarios: 1,
  maxTurnosMes: null,
  precioMensual: 0,
  esActivo: true,
  ordenDisplay: 0,
  duracionTrialDias: 14,
  tieneReportes: false,
};

function formatPrecio(n: number) {
  if (n === 0) return 'Gratis';
  return `$${n.toLocaleString('es-AR')}`;
}

export function Planes() {
  const { toasts, addToast, dismiss } = useToast();

  const [planes, setPlanes]     = useState<Plan[]>([]);
  const [loading, setLoading]   = useState(true);

  // Modal edición completa
  const [modalOpen, setModalOpen]       = useState(false);
  const [editando, setEditando]         = useState<Plan | null>(null);
  const [form, setForm]                 = useState<CrearPlanDto>(EMPTY_FORM);
  const [ilimitado, setIlimitado]       = useState(false);
  const [saving, setSaving]             = useState(false);

  // Modal precio rápido
  const [precioModalOpen, setPrecioModalOpen] = useState(false);
  const [planPrecio, setPlanPrecio]           = useState<Plan | null>(null);
  const [nuevoPrecio, setNuevoPrecio]         = useState('');
  const [savingPrecio, setSavingPrecio]       = useState(false);

  // Modal confirmación toggle activo
  const [confirmarToggle, setConfirmarToggle] = useState<Plan | null>(null);
  const [toggling, setToggling]               = useState(false);

  const cargar = () => {
    setLoading(true);
    planesApi
      .listar()
      .then(setPlanes)
      .catch(() => addToast('error', 'No se pudieron cargar los planes.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirCrear = () => {
    setEditando(null);
    setForm(EMPTY_FORM);
    setIlimitado(false);
    setModalOpen(true);
  };

  const abrirEdicion = (p: Plan) => {
    setEditando(p);
    setForm({
      nombre:            p.nombre,
      descripcion:       p.descripcion ?? '',
      maxUsuarios:       p.maxUsuarios,
      maxTurnosMes:      p.maxTurnosMes,
      precioMensual:     p.precioMensual,
      esActivo:          p.esActivo,
      ordenDisplay:      p.ordenDisplay,
      duracionTrialDias: p.duracionTrialDias,
      tieneReportes:     p.tieneReportes,
    });
    setIlimitado(p.maxTurnosMes === null);
    setModalOpen(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) { addToast('error', 'El nombre es requerido.'); return; }
    if (form.maxUsuarios < 1) { addToast('error', 'MaxUsuarios debe ser al menos 1.'); return; }

    const payload = { ...form, maxTurnosMes: ilimitado ? null : form.maxTurnosMes };
    setSaving(true);
    try {
      if (editando) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { precioMensual: _precio, ...editPayload } = payload;
        const updated = await planesApi.actualizar(editando.id, editPayload as ActualizarPlanDto);
        setPlanes((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        addToast('success', 'Plan actualizado.');
      } else {
        const created = await planesApi.crear(payload);
        setPlanes((prev) => [...prev, created]);
        addToast('success', 'Plan creado.');
      }
      setModalOpen(false);
    } catch {
      addToast('error', 'Error al guardar el plan.');
    } finally {
      setSaving(false);
    }
  };

  const abrirCambiarPrecio = (p: Plan) => {
    setPlanPrecio(p);
    setNuevoPrecio(String(p.precioMensual));
    setPrecioModalOpen(true);
  };

  const guardarPrecio = async () => {
    if (!planPrecio) return;
    const valor = parseFloat(nuevoPrecio);
    if (isNaN(valor) || valor < 0) { addToast('error', 'Ingresá un precio válido.'); return; }
    setSavingPrecio(true);
    try {
      const updated = await planesApi.cambiarPrecio(planPrecio.id, valor);
      setPlanes((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      addToast('success', `Precio de "${updated.nombre}" actualizado.`);
      setPrecioModalOpen(false);
    } catch {
      addToast('error', 'No se pudo actualizar el precio.');
    } finally {
      setSavingPrecio(false);
    }
  };

  const toggleActivo = async (p: Plan) => {
    setToggling(true);
    try {
      const updated = await planesApi.toggleActivo(p.id);
      setPlanes((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      addToast('success', `Plan ${updated.esActivo ? 'activado' : 'desactivado'}.`);
      setConfirmarToggle(null);
    } catch {
      addToast('error', 'No se pudo cambiar el estado.');
    } finally {
      setToggling(false);
    }
  };

  const activos   = planes.filter((p) => p.esActivo).length;
  const inactivos = planes.length - activos;

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Planes</h2>
          <p className="text-text-secondary text-sm mt-1">
            {activos} activos · {inactivos} inactivos
          </p>
        </div>
        <button
          onClick={abrirCrear}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2.5 rounded-button text-sm font-medium transition-colors flex items-center gap-2 self-start"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo plan
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total',     value: planes.length, color: 'bg-blue-50 text-blue-700 border-blue-100'   },
          { label: 'Activos',   value: activos,       color: 'bg-green-50 text-green-700 border-green-100' },
          { label: 'Inactivos', value: inactivos,     color: 'bg-surface-background text-text-muted border-border' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-card border px-5 py-4 ${color}`}>
            <p className="text-2xl font-bold font-heading">{value}</p>
            <p className="text-sm mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-surface rounded-card border border-border overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            Cargando planes…
          </div>
        ) : planes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
            <CreditCardIcon className="w-8 h-8 opacity-30" />
            <p className="text-sm">No hay planes creados aún.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-background">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Orden</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Max Usuarios</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Max Turnos/mes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Precio/mes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Trial</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Reportes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...planes].sort((a, b) => a.ordenDisplay - b.ordenDisplay).map((p) => (
                <tr key={p.id} className="hover:bg-surface-background/50 transition-colors">
                  <td className="px-4 py-3 text-text-muted font-mono">#{p.ordenDisplay}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{p.nombre}</p>
                    {p.descripcion && (
                      <p className="text-xs text-text-muted truncate max-w-xs">{p.descripcion}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-primary">{p.maxUsuarios.toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3">
                    {p.maxTurnosMes === null ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                        <InfinityIcon className="w-3 h-3" />
                        Ilimitado
                      </span>
                    ) : (
                      <span className="text-text-primary">{p.maxTurnosMes.toLocaleString('es-AR')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-text-primary">{formatPrecio(p.precioMensual)}</td>
                  <td className="px-4 py-3 text-text-secondary text-sm">
                    {p.duracionTrialDias > 0 ? `${p.duracionTrialDias}d` : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {p.tieneReportes ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
                        <CheckIcon className="w-3 h-3" />
                        Sí
                      </span>
                    ) : (
                      <span className="text-text-muted text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {p.esActivo ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                        <CheckIcon className="w-3 h-3" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 bg-surface-background text-text-muted rounded-full text-xs font-medium border border-border">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => abrirCambiarPrecio(p)}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Cambiar precio"
                      >
                        <DollarSignIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => abrirEdicion(p)}
                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-background rounded-lg transition-colors"
                        title="Editar plan"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmarToggle(p)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.esActivo
                            ? 'text-text-muted hover:text-amber-600 hover:bg-amber-50'
                            : 'text-text-muted hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={p.esActivo ? 'Desactivar' : 'Activar'}
                      >
                        {p.esActivo ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal crear / editar */}
      <AnimatePresence>
        {modalOpen && (
          <ModalPortal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-card border border-border w-full max-w-lg shadow-xl"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="font-heading font-semibold text-text-primary">
                  {editando ? 'Editar plan' : 'Nuevo plan'}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-background rounded-lg transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="px-6 py-5 space-y-4">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Ej: Pro"
                    maxLength={100}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Descripción</label>
                  <input
                    type="text"
                    value={form.descripcion ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="Descripción breve"
                    maxLength={300}
                  />
                </div>

                {/* MaxUsuarios + OrdenDisplay */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Max usuarios <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.maxUsuarios}
                      onChange={(e) => setForm((f) => ({ ...f, maxUsuarios: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Orden display</label>
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      value={form.ordenDisplay}
                      onChange={(e) => setForm((f) => ({ ...f, ordenDisplay: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                </div>

                {/* MaxTurnosMes */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-text-secondary">Max turnos/mes</label>
                    <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ilimitado}
                        onChange={(e) => {
                          setIlimitado(e.target.checked);
                          if (e.target.checked) setForm((f) => ({ ...f, maxTurnosMes: null }));
                        }}
                        className="w-3.5 h-3.5 accent-primary"
                      />
                      Ilimitado
                    </label>
                  </div>
                  <input
                    type="number"
                    min={1}
                    disabled={ilimitado}
                    value={ilimitado ? '' : (form.maxTurnosMes ?? '')}
                    onChange={(e) => setForm((f) => ({ ...f, maxTurnosMes: parseInt(e.target.value) || null }))}
                    className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:opacity-40 disabled:cursor-not-allowed"
                    placeholder={ilimitado ? 'Sin límite' : 'Ej: 200'}
                  />
                </div>

                {/* PrecioMensual — solo al crear; para editar usar el botón $ de la tabla */}
                {!editando && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Precio mensual ($)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={form.precioMensual}
                      onChange={(e) => setForm((f) => ({ ...f, precioMensual: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    />
                  </div>
                )}

                {/* DuracionTrialDias */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Días de prueba gratuita
                    <span className="ml-1 text-text-muted font-normal">(0 = sin trial)</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={form.duracionTrialDias}
                    onChange={(e) => setForm((f) => ({ ...f, duracionTrialDias: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                {/* Toggles en fila */}
                <div className="flex items-center gap-6">
                  {/* EsActivo */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, esActivo: !f.esActivo }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.esActivo ? 'bg-primary' : 'bg-border'}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          form.esActivo ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-text-secondary">
                      {form.esActivo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>

                  {/* TieneReportes */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, tieneReportes: !f.tieneReportes }))}
                      className={`relative w-10 h-5 rounded-full transition-colors ${form.tieneReportes ? 'bg-purple-500' : 'bg-border'}`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          form.tieneReportes ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className="text-sm text-text-secondary">Reportes</span>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-button hover:bg-surface-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardar}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-button transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear plan'}
                </button>
              </div>
            </motion.div>
          </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Modal cambiar precio */}
      <AnimatePresence>
        {precioModalOpen && planPrecio && (
          <ModalPortal>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setPrecioModalOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-surface rounded-card border border-border w-full max-w-sm shadow-xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <div>
                  <h3 className="font-heading font-semibold text-text-primary">Cambiar precio</h3>
                  <p className="text-xs text-text-muted mt-0.5">{planPrecio.nombre}</p>
                </div>
                <button
                  onClick={() => setPrecioModalOpen(false)}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-background rounded-lg transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5">
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Nuevo precio mensual (ARS)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && guardarPrecio()}
                    className="w-full pl-7 pr-4 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-text-muted mt-1.5">
                  Precio actual: {formatPrecio(planPrecio.precioMensual)}
                </p>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() => setPrecioModalOpen(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-button hover:bg-surface-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarPrecio}
                  disabled={savingPrecio}
                  className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-button transition-colors disabled:opacity-50"
                >
                  {savingPrecio ? 'Guardando…' : 'Actualizar precio'}
                </button>
              </div>
            </motion.div>
          </motion.div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Modal confirmación toggle */}
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
                    {confirmarToggle.esActivo ? 'desactivar' : 'activar'}
                  </span>{' '}
                  el plan{' '}
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
                  onClick={() => toggleActivo(confirmarToggle)}
                  disabled={toggling}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-button transition-colors disabled:opacity-50 ${
                    confirmarToggle.esActivo
                      ? 'bg-amber-500 hover:bg-amber-600'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {toggling ? 'Procesando…' : confirmarToggle.esActivo ? 'Desactivar' : 'Activar'}
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
