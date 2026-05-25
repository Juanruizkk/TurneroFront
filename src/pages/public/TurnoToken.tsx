import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ScissorsIcon,
  XCircleIcon,
  AlertCircleIcon,
  PhoneIcon,
  AlertTriangleIcon,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { turnosApi } from '../../api/turnos';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatFechaLarga, formatHora, formatMoneda, buildGoogleCalendarUrl } from '../../types';
import type { Turno } from '../../types';

export function TurnoToken() {
  const { token } = useParams<{ token: string }>();
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelando, setCancelando]         = useState(false);
  const [cancelado, setCancelado]           = useState(false);
  const [confirmando, setConfirmando]       = useState(false);

  useEffect(() => {
    if (!token) return;
    turnosApi
      .obtenerPorToken(token)
      .then(setTurno)
      .catch(() => setError('No encontramos un turno con ese enlace. Verificá que sea correcto.'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleCancelar = async () => {
    if (!token) return;
    setCancelando(true);
    try {
      const actualizado = await turnosApi.cancelarPorToken(token);
      setTurno(actualizado);
      setCancelado(true);
      setConfirmando(false);
    } catch {
      alert('No se pudo cancelar el turno. Intentá de nuevo o contactanos.');
    } finally {
      setCancelando(false);
    }
  };

  const puedeGestionar =
    turno && turno.estado !== 'CanceladoCliente' && turno.estado !== 'CanceladoStaff' && turno.estado !== 'Completado' && turno.estado !== 'NoShow';

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-background flex flex-col font-body">
      {/* Header */}
      <header className="bg-surface border-b border-border py-4 px-6 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center">
          <img src={logo} alt="MetaTurnos" className="h-9 w-auto object-contain" />
        </div>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-6 py-10">
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircleIcon className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">
              Turno no encontrado
            </h2>
            <p className="text-text-secondary mb-8">{error}</p>
            <Link
              to="/"
              className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-button font-medium transition-colors"
            >
              Volver al inicio
            </Link>
          </motion.div>
        ) : turno ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {cancelado && (
              <div className="bg-error/10 border border-error/30 rounded-card p-4 mb-6 flex items-center gap-3">
                <AlertCircleIcon className="w-5 h-5 text-error flex-shrink-0" />
                <p className="text-sm text-error font-medium">Tu turno fue cancelado exitosamente.</p>
              </div>
            )}

            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-heading font-bold text-text-primary">Tu turno</h2>
                <p className="text-text-secondary text-sm mt-1">ID: #{turno.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <StatusBadge estado={turno.estado} />
            </div>

            {/* Card de turno */}
            <div className="bg-surface rounded-card border border-border shadow-sm divide-y divide-border mb-6">
              <div className="p-5 flex items-center gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide font-medium">Fecha</p>
                  <p className="text-text-primary font-medium capitalize">
                    {formatFechaLarga(turno.fechaHoraInicio)}
                  </p>
                </div>
              </div>

              <div className="p-5 flex items-center gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide font-medium">Horario</p>
                  <p className="text-text-primary font-medium">
                    {formatHora(turno.fechaHoraInicio)} – {formatHora(turno.fechaHoraFin)}
                  </p>
                </div>
              </div>

              <div className="p-5 flex items-center gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <ScissorsIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide font-medium">Servicio</p>
                  <p className="text-text-primary font-medium">{turno.servicioNombre}</p>
                  <p className="text-text-secondary text-sm">{formatMoneda(turno.precioServicio)}</p>
                </div>
              </div>

              <div className="p-5 flex items-center gap-4">
                <div className="p-2 bg-primary/10 text-primary rounded-lg">
                  <UserIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wide font-medium">Profesional</p>
                  <p className="text-text-primary font-medium">{turno.profesionalNombre}</p>
                </div>
              </div>

              {turno.montoSena != null && turno.montoSena > 0 && (
                <div className="p-5 bg-warning/5">
                  <p className="text-xs text-text-muted uppercase tracking-wide font-medium mb-2">Seña</p>
                  <p className="text-sm text-text-primary">
                    Seña requerida: <span className="font-bold text-warning">{formatMoneda(turno.montoSena)}</span>
                  </p>
                  <p className="text-sm text-text-secondary">
                    Saldo restante: <span className="font-medium">{formatMoneda(turno.precioServicio - turno.totalCobrado)}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Agregar a Google Calendar */}
            {puedeGestionar && (
              <a
                href={buildGoogleCalendarUrl(turno)}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 w-full flex items-center justify-center gap-2 border border-border bg-surface hover:bg-surface-hover text-text-primary px-4 py-3 rounded-button font-medium transition-colors text-sm"
              >
                <CalendarIcon className="w-4 h-4 flex-shrink-0 text-primary" />
                Agregar a Google Calendar
              </a>
            )}

            {/* Acciones */}
            {puedeGestionar && (
              <div className="space-y-3">
                <AnimatePresence mode="wait">
                  {!confirmando ? (
                    <motion.button
                      key="btn-cancelar"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setConfirmando(true)}
                      className="w-full py-3 rounded-button border border-error/30 text-error font-medium hover:bg-error/5 transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                      <XCircleIcon className="w-4 h-4" />
                      Cancelar mi turno
                    </motion.button>
                  ) : (
                    <motion.div
                      key="confirmar"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="rounded-card border border-error/30 bg-error/5 p-4 space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangleIcon className="w-4 h-4 text-error mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-error font-medium">
                          ¿Confirmás la cancelación? Esta acción no se puede deshacer.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirmando(false)}
                          disabled={cancelando}
                          className="flex-1 py-2.5 rounded-button border border-border text-text-secondary text-sm font-medium hover:bg-surface transition-colors disabled:opacity-50"
                        >
                          Volver
                        </button>
                        <button
                          onClick={handleCancelar}
                          disabled={cancelando}
                          className="flex-1 py-2.5 rounded-button bg-error text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {cancelando ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Cancelando...
                            </>
                          ) : (
                            'Sí, cancelar'
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="text-xs text-text-muted text-center">
                  Para reprogramar, contactanos directamente.
                </p>
              </div>
            )}

            {/* Contacto */}
            <div className="mt-8 p-4 bg-surface rounded-card border border-border flex items-center gap-3">
              <PhoneIcon className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <p className="text-sm text-text-secondary">¿Tenés alguna consulta?</p>
                <p className="text-sm font-medium text-text-primary">Escribinos por WhatsApp</p>
              </div>
            </div>

            {!puedeGestionar && (
              <div className="mt-6 text-center">
                <Link to="/reservar" className="text-primary font-medium hover:underline text-sm">
                  Reservar un nuevo turno →
                </Link>
              </div>
            )}
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}
