import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XIcon,
  PhoneIcon,
  MailIcon,
  StarIcon,
  AlertCircleIcon,
  CalendarIcon,
  DollarSignIcon,
  TrendingUpIcon,
  ClockIcon,
} from 'lucide-react';
import { clientesApi } from '../../api/clientes';
import { StatusBadge } from '../ui/StatusBadge';
import type { Cliente, ClienteFicha, EstadoTurno } from '../../types';
import { useAuth, tienePermiso } from '../../contexts/AuthContext';

interface Props {
  cliente: Cliente | null;
  onClose: () => void;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-surface-background rounded-lg px-4 py-3 flex flex-col gap-0.5 border border-border">
      <span className="text-xs text-text-muted font-medium">{label}</span>
      <span className="text-xl font-bold text-text-primary">{value}</span>
      {sub && <span className="text-[11px] text-text-muted">{sub}</span>}
    </div>
  );
}

function FechaCorta({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <span>
      {d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
      {' '}
      <span className="text-text-muted">
        {d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </span>
  );
}

export function ClienteFichaDrawer({ cliente, onClose }: Props) {
  const { user } = useAuth();
  const puedeVerTelefono = tienePermiso(user, 'VerTelefonoClientes');
  const open = !!cliente;

  const [ficha, setFicha] = useState<ClienteFicha | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cliente) { setFicha(null); return; }
    setLoading(true);
    setError(false);
    clientesApi
      .getFicha(cliente.id)
      .then(setFicha)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [cliente?.id]);

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-text-primary/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col overflow-hidden"
          >
            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {cliente!.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-heading font-bold text-lg text-text-primary leading-tight">
                      {cliente!.nombre} {cliente!.apellido}
                    </h2>
                    {cliente!.esFrecuente && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                        <StarIcon className="w-2.5 h-2.5" />
                        Frecuente
                      </span>
                    )}
                    {cliente!.tieneNoShow && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-600">
                        <AlertCircleIcon className="w-2.5 h-2.5" />
                        No-show
                      </span>
                    )}
                    {!cliente!.activo && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-surface-background text-text-muted border border-border">
                        Archivado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {puedeVerTelefono ? (
                      <a href={`tel:${cliente!.telefono}`} className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors">
                        <PhoneIcon className="w-3.5 h-3.5" />
                        {cliente!.telefono}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1 text-sm text-text-muted italic">
                        <PhoneIcon className="w-3.5 h-3.5" />
                        ••••••••
                      </span>
                    )}
                    {cliente!.email && (
                      <a href={`mailto:${cliente!.email}`} className="flex items-center gap-1 text-sm text-text-secondary hover:text-primary transition-colors">
                        <MailIcon className="w-3.5 h-3.5" />
                        {cliente!.email}
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-surface-background text-text-secondary transition-colors flex-shrink-0"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {loading && (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-sm text-error">
                  <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                  No se pudo cargar la ficha del cliente.
                </div>
              )}

              {ficha && !loading && (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <StatCard
                      label="Turnos totales"
                      value={ficha.totalTurnos}
                      sub={ficha.ultimoTurno ? `Último: ${new Date(ficha.ultimoTurno).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}` : undefined}
                    />
                    <StatCard
                      label="Total cobrado"
                      value={`$${ficha.totalCobrado.toLocaleString('es-AR')}`}
                    />
                    <StatCard
                      label="No-shows"
                      value={ficha.cantidadNoShow}
                    />
                    <StatCard
                      label="Cancelaciones"
                      value={ficha.cantidadCancelaciones}
                    />
                  </div>

                  {/* Observaciones */}
                  {ficha.observaciones && (
                    <div className="px-4 py-3 rounded-lg bg-surface-background border border-border text-sm text-text-secondary">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide block mb-1">Observaciones</span>
                      {ficha.observaciones}
                    </div>
                  )}

                  {/* Próximos turnos */}
                  {ficha.proximosTurnos.length > 0 && (
                    <section>
                      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <ClockIcon className="w-3.5 h-3.5" />
                        Próximos turnos ({ficha.proximosTurnos.length})
                      </h3>
                      <div className="space-y-2">
                        {ficha.proximosTurnos.map((t) => (
                          <div key={t.turnoId} className="flex items-start justify-between gap-3 px-4 py-3 rounded-lg border border-primary/20 bg-primary/5">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-sm font-medium text-text-primary">{t.servicio}</span>
                              <span className="text-xs text-text-muted">{t.profesional}</span>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <span className="text-xs font-medium text-text-primary">
                                <FechaCorta iso={t.fecha} />
                              </span>
                              <StatusBadge estado={t.estado as EstadoTurno} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Historial */}
                  <section>
                    <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5" />
                      Historial de turnos
                      {ficha.historial.length > 0 && <span className="font-normal normal-case text-text-muted">({ficha.historial.length})</span>}
                    </h3>

                    {ficha.historial.length === 0 ? (
                      <p className="text-sm text-text-muted text-center py-6 bg-surface-background rounded-lg border border-border">
                        Sin turnos anteriores.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {ficha.historial.map((t) => (
                          <div key={t.turnoId} className="flex items-start justify-between gap-3 px-4 py-3 rounded-lg border border-border hover:bg-surface-background transition-colors">
                            <div className="flex flex-col gap-0.5 min-w-0">
                              <span className="text-sm font-medium text-text-primary">{t.servicio}</span>
                              <span className="text-xs text-text-muted">{t.profesional}</span>
                              <span className="text-xs text-text-muted mt-0.5">
                                <FechaCorta iso={t.fecha} />
                              </span>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                              <StatusBadge estado={t.estado as EstadoTurno} />
                              {t.totalCobrado > 0 && (
                                <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
                                  <DollarSignIcon className="w-3 h-3" />
                                  {t.totalCobrado.toLocaleString('es-AR')}
                                </span>
                              )}
                              {t.tuvoSena && (
                                <span className="text-[10px] text-text-muted">Con seña</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
