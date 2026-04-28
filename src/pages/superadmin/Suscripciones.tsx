import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ui/ModalPortal';
import {
  XIcon,
  ReceiptIcon,
  ChevronDownIcon,
  CalendarPlusIcon,
} from 'lucide-react';
import { suscripcionesAdminApi, planesApi } from '../../api/superadmin';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import type { SuscripcionSuperAdminItem, Plan } from '../../types';
import { formatFechaCorta } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type EstadoBadgeConfig = { label: string; className: string };

function getEstadoBadge(estado: SuscripcionSuperAdminItem['estado']): EstadoBadgeConfig {
  switch (estado) {
    case 'Activa':
      return { label: 'Activa', className: 'bg-green-50 text-green-700' };
    case 'PruebActiva':
      return { label: 'Trial activo', className: 'bg-yellow-50 text-yellow-700' };
    case 'PruebVencida':
      return { label: 'Trial vencido', className: 'bg-red-50 text-red-700' };
    case 'Vencida':
      return { label: 'Vencida', className: 'bg-red-50 text-red-700' };
    case 'Cancelada':
      return { label: 'Cancelada', className: 'bg-surface-background text-text-muted border border-border' };
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Suscripciones() {
  const { toasts, addToast, dismiss } = useToast();

  const [items, setItems]   = useState<SuscripcionSuperAdminItem[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen]   = useState(false);
  const [target, setTarget]         = useState<SuscripcionSuperAdminItem | null>(null);
  const [planSeleccionado, setPlan] = useState('');
  const [saving, setSaving]         = useState(false);
  const [extendiendo, setExtendiendo] = useState<string | null>(null);

  // Filtro de búsqueda
  const [busqueda, setBusqueda] = useState('');

  const cargar = () => {
    setLoading(true);
    Promise.all([
      suscripcionesAdminApi.listar(),
      planesApi.listar(),
    ])
      .then(([suscripciones, planesData]) => {
        setItems(suscripciones);
        setPlanes(planesData.filter((p) => p.esActivo));
      })
      .catch(() => addToast('error', 'No se pudieron cargar las suscripciones.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = (item: SuscripcionSuperAdminItem) => {
    setTarget(item);
    setPlan(item.planId);
    setModalOpen(true);
  };

  const confirmarCambio = async () => {
    if (!target || !planSeleccionado) return;
    if (planSeleccionado === target.planId) {
      setModalOpen(false);
      return;
    }
    setSaving(true);
    try {
      const updated = await suscripcionesAdminApi.cambiarPlan(target.sucursalId, { planId: planSeleccionado });
      setItems((prev) => prev.map((i) => (i.sucursalId === updated.sucursalId ? updated : i)));
      addToast('success', `Plan de "${updated.sucursalNombre}" actualizado a ${updated.planNombre}.`);
      setModalOpen(false);
    } catch {
      addToast('error', 'No se pudo cambiar el plan.');
    } finally {
      setSaving(false);
    }
  };

  const extenderVencimiento = async (item: SuscripcionSuperAdminItem) => {
    if (!confirm(`¿Extender el vencimiento de "${item.sucursalNombre}" +30 días?`)) return;
    setExtendiendo(item.sucursalId);
    try {
      const updated = await suscripcionesAdminApi.extenderVencimiento(item.sucursalId);
      setItems((prev) => prev.map((i) => (i.sucursalId === updated.sucursalId ? updated : i)));
      addToast('success', `Vencimiento de "${updated.sucursalNombre}" extendido hasta ${formatFechaCorta(updated.fechaVencimiento)}.`);
    } catch {
      addToast('error', 'No se pudo extender el vencimiento.');
    } finally {
      setExtendiendo(null);
    }
  };

  const itemsFiltrados = items.filter((i) =>
    i.sucursalNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.sucursalSlug.toLowerCase().includes(busqueda.toLowerCase()) ||
    i.planNombre.toLowerCase().includes(busqueda.toLowerCase()),
  );

  // Stats
  const total    = items.length;
  const activas  = items.filter((i) => i.estado === 'Activa' || i.estado === 'PruebActiva').length;
  const vencidas = items.filter((i) => i.estado === 'Vencida' || i.estado === 'PruebVencida' || i.estado === 'Cancelada').length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Suscripciones</h2>
          <p className="text-text-secondary text-sm mt-1">
            {total} sucursales · {activas} activas · {vencidas} vencidas / canceladas
          </p>
        </div>
        <input
          type="text"
          placeholder="Buscar sucursal o plan…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary w-64"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total',    value: total,    className: 'bg-blue-50 text-blue-700 border-blue-100'   },
          { label: 'Activas',  value: activas,  className: 'bg-green-50 text-green-700 border-green-100' },
          { label: 'Vencidas', value: vencidas, className: 'bg-red-50 text-red-700 border-red-100'       },
        ].map(({ label, value, className }) => (
          <div key={label} className={`rounded-card border px-5 py-4 ${className}`}>
            <p className="text-2xl font-bold font-heading">{value}</p>
            <p className="text-sm mt-0.5 opacity-80">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-surface rounded-card border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            Cargando suscripciones…
          </div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
            <ReceiptIcon className="w-8 h-8 opacity-30" />
            <p className="text-sm">{busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay suscripciones registradas.'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-background">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Sucursal</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Vencimiento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase tracking-wider">Días restantes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-text-muted uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itemsFiltrados.map((item) => {
                const badge = getEstadoBadge(item.estado);
                return (
                  <tr key={item.sucursalId} className="hover:bg-surface-background/50 transition-colors">
                    {/* Sucursal */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{item.sucursalNombre}</p>
                      <p className="text-xs text-text-muted">/{item.sucursalSlug}</p>
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        {item.planNombre}
                      </span>
                      {item.enPeriodoPrueba && (
                        <span className="ml-1.5 inline-flex items-center px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full text-xs">
                          Trial
                        </span>
                      )}
                    </td>

                    {/* Estado */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>

                    {/* Vencimiento */}
                    <td className="px-4 py-3 text-text-secondary text-sm">
                      {formatFechaCorta(item.fechaVencimiento)}
                    </td>

                    {/* Días restantes */}
                    <td className="px-4 py-3">
                      {item.diasRestantes > 0 ? (
                        <span className={`font-medium ${item.diasRestantes <= 3 ? 'text-red-600' : 'text-text-primary'}`}>
                          {item.diasRestantes}d
                        </span>
                      ) : (
                        <span className="text-red-600 font-medium">Vencido</span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => extenderVencimiento(item)}
                          disabled={extendiendo === item.sucursalId}
                          title="Extender +30 días"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 hover:text-green-800 border border-green-200 bg-green-50 hover:bg-green-100 rounded-button transition-colors disabled:opacity-50"
                        >
                          <CalendarPlusIcon className="w-3 h-3" />
                          {extendiendo === item.sucursalId ? 'Extendiendo…' : '+30 días'}
                        </button>
                        <button
                          onClick={() => abrirModal(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary border border-border rounded-button hover:bg-surface-background transition-colors"
                        >
                          <ChevronDownIcon className="w-3 h-3" />
                          Cambiar plan
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal cambiar plan */}
      <AnimatePresence>
        {modalOpen && target && (
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
              className="bg-surface rounded-card border border-border w-full max-w-sm shadow-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                <h3 className="font-heading font-semibold text-text-primary">Cambiar plan</h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-background rounded-lg transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <p className="text-sm text-text-secondary">
                  Sucursal: <span className="font-medium text-text-primary">{target.sucursalNombre}</span>
                </p>
                <p className="text-sm text-text-secondary">
                  Plan actual: <span className="font-medium text-text-primary">{target.planNombre}</span>
                </p>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Nuevo plan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={planSeleccionado}
                    onChange={(e) => setPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-button text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    {planes.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                {planSeleccionado === target.planId && (
                  <p className="text-xs text-text-muted">El plan seleccionado es el mismo que el actual.</p>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary border border-border rounded-button hover:bg-surface-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarCambio}
                  disabled={saving || !planSeleccionado}
                  className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-button transition-colors disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Confirmar'}
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
