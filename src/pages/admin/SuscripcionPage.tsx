import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  UsersIcon,
  CalendarDaysIcon,
  BadgeCheckIcon,
  LockIcon,
  AlertTriangleIcon,
  CheckIcon,
  TrendingUpIcon,
  XIcon,
  CheckCircleIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { suscripcionApi } from '../../api/suscripcion';
import { soporteApi } from '../../api/soporte';
import { ApiError } from '../../api/client';
import { ModalPortal } from '../../components/ui/ModalPortal';
import type { SuscripcionInfo } from '../../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(actual: number, max: number | null): number {
  if (max === null || max === 0) return 0;
  return Math.min(100, Math.round((actual / max) * 100));
}

function barColor(p: number): string {
  if (p >= 90) return 'bg-red-500';
  if (p >= 75) return 'bg-amber-400';
  return 'bg-primary';
}

function textColor(p: number): string {
  if (p >= 90) return 'text-red-600';
  if (p >= 75) return 'text-amber-600';
  return 'text-primary';
}

// ─── UsageBar ─────────────────────────────────────────────────────────────────

function UsageBar({
  label,
  icon: Icon,
  actual,
  max,
}: {
  label: string;
  icon: React.ElementType;
  actual: number;
  max: number | null;
}) {
  const p = pct(actual, max);
  const ilimitado = max === null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 text-text-secondary font-medium">
          <Icon className="w-4 h-4" />
          {label}
        </span>
        <span className={`font-semibold ${ilimitado ? 'text-text-secondary' : textColor(p)}`}>
          {ilimitado ? `${actual} / ∞` : `${actual} / ${max}`}
        </span>
      </div>
      {!ilimitado && (
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${p}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${barColor(p)}`}
          />
        </div>
      )}
      {ilimitado && (
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div className="h-full w-full bg-primary/20 rounded-full" />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SuscripcionPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [suscripcion, setSuscripcion] = useState<SuscripcionInfo | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Modal "Solicitar ampliación"
  const [solicitando, setSolicitando] = useState(false);
  const [mensaje, setMensaje]         = useState('');
  const [estadoSolic, setEstadoSolic] = useState<'idle' | 'enviando' | 'ok'>('idle');
  const [errSolic, setErrSolic]       = useState<string | null>(null);

  function cerrarSolic() {
    setSolicitando(false);
    setTimeout(() => {
      setMensaje('');
      setEstadoSolic('idle');
      setErrSolic(null);
    }, 200);
  }

  async function enviarSolicitud() {
    if (!suscripcion) return;
    setEstadoSolic('enviando');
    setErrSolic(null);
    try {
      await soporteApi.solicitarAmpliacion({
        mensaje:          mensaje.trim() || undefined,
        usuariosActuales: suscripcion.usuariosActuales,
        maxUsuarios:      suscripcion.maxUsuarios,
        turnosMesActual:  suscripcion.turnosMesActual,
        maxTurnosMes:     suscripcion.maxTurnosMes,
      });
      setEstadoSolic('ok');
    } catch (e) {
      setEstadoSolic('idle');
      setErrSolic(e instanceof ApiError ? e.message : 'No se pudo enviar. Intentá de nuevo.');
    }
  }

  useEffect(() => {
    if (!user?.sucursalId) return;
    suscripcionApi.getSuscripcion(user.sucursalId)
      .then(setSuscripcion)
      .catch(() => setError('No se pudo cargar la información del plan.'))
      .finally(() => setLoading(false));
  }, [user?.sucursalId]);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!user?.esOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <LockIcon className="w-12 h-12 text-text-muted" />
        <h2 className="text-xl font-heading font-bold text-text-primary">Acceso restringido</h2>
        <p className="text-text-muted max-w-sm">
          Solo el propietario de la cuenta puede ver esta información.
        </p>
        <button
          onClick={() => navigate('/admin')}
          className="mt-2 px-4 py-2 bg-primary text-white rounded-button text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Volver al panel
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !suscripcion) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
        <AlertTriangleIcon className="w-10 h-10 text-error" />
        <p className="text-text-muted">{error ?? 'Error inesperado.'}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-white rounded-button text-sm hover:bg-primary/90 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* ── Plan actual ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface rounded-2xl border border-border p-6 space-y-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-heading font-bold text-text-primary">
                Plan {suscripcion.planNombre}
              </h2>
              <p className="text-sm text-text-muted">Gratuito</p>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-success/10 text-success">
            <BadgeCheckIcon className="w-3 h-3" /> Activa
          </span>
        </div>

        {/* Usage bars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          <UsageBar
            label="Usuarios"
            icon={UsersIcon}
            actual={suscripcion.usuariosActuales}
            max={suscripcion.maxUsuarios < 999 ? suscripcion.maxUsuarios : null}
          />
          <UsageBar
            label="Turnos este mes"
            icon={CalendarDaysIcon}
            actual={suscripcion.turnosMesActual}
            max={suscripcion.maxTurnosMes}
          />
        </div>
      </motion.div>

      {/* ── Qué incluye el plan ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface rounded-2xl border border-border p-6"
      >
        <h3 className="font-heading font-semibold text-text-primary mb-4">¿Qué incluye?</h3>
        <ul className="space-y-3">
          {[
            `Hasta ${suscripcion.maxUsuarios < 999 ? suscripcion.maxUsuarios : '∞'} usuarios`,
            suscripcion.maxTurnosMes !== null
              ? `Hasta ${suscripcion.maxTurnosMes} turnos por mes`
              : 'Turnos ilimitados',
            'Reportes y estadísticas',
            'Gestión de clientes, servicios y caja',
            'Notificaciones en tiempo real',
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
              <CheckIcon className="w-4 h-4 text-success flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </motion.div>

      {/* ── Solicitar ampliación ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-primary/5 rounded-2xl border border-primary/20 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <TrendingUpIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-text-primary">¿Necesitás más usuarios o turnos?</h3>
            <p className="text-sm text-text-muted mt-0.5">
              Solicitá extender tu suscripción y nos ponemos en contacto para ampliarte el plan.
            </p>
          </div>
        </div>
        <button
          onClick={() => setSolicitando(true)}
          className="shrink-0 px-5 py-2.5 rounded-button bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors"
        >
          Solicitar ampliación
        </button>
      </motion.div>

      {/* ── Modal: solicitar ampliación ── */}
      {solicitando && (
        <ModalPortal>
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
            onClick={cerrarSolic}
          >
            <div
              className="relative w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={cerrarSolic}
                className="absolute right-4 top-4 text-text-muted hover:text-text-primary transition-colors"
                aria-label="Cerrar"
              >
                <XIcon className="w-5 h-5" />
              </button>

              {estadoSolic === 'ok' ? (
                <div className="text-center py-6 flex flex-col items-center gap-3">
                  <CheckCircleIcon className="w-11 h-11 text-primary" />
                  <h2 className="font-heading text-lg font-bold text-text-primary">¡Solicitud enviada!</h2>
                  <p className="text-sm text-text-secondary">Nos pondremos en contacto para ampliarte el plan.</p>
                  <button
                    onClick={cerrarSolic}
                    className="mt-2 px-5 py-2.5 rounded-button bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <TrendingUpIcon className="w-5 h-5 text-primary" />
                    <h2 className="font-heading text-lg font-bold text-text-primary">Solicitar ampliación</h2>
                  </div>
                  <p className="text-sm text-text-secondary -mt-2">
                    Contanos qué necesitás (más usuarios, más turnos, etc.). Es opcional.
                  </p>
                  <textarea
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder="Ej: necesito sumar 2 profesionales más y más turnos por mes…"
                    className="w-full rounded-lg border border-border bg-surface-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                  {errSolic && <p className="text-sm text-red-600">{errSolic}</p>}
                  <button
                    onClick={enviarSolicitud}
                    disabled={estadoSolic === 'enviando'}
                    className="px-5 py-2.5 rounded-button bg-primary text-white font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {estadoSolic === 'enviando' ? 'Enviando…' : 'Enviar solicitud'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </ModalPortal>
      )}

    </div>
  );
}
