import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  UsersIcon,
  CalendarDaysIcon,
  CheckIcon,
  AlertTriangleIcon,
  LockIcon,
  ArrowRightIcon,
  BadgeCheckIcon,
  XIcon,
  ZapIcon,
  ReceiptIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { suscripcionApi } from '../../api/suscripcion';
import type { Plan, SuscripcionInfo, PagoSuscripcionHistorial } from '../../types';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui/Toast';

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

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatPrecio(n: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function PlanCard({
  plan,
  esActual,
  sucursalId,
  onError,
}: {
  plan: Plan;
  esActual: boolean;
  sucursalId: string;
  onError: (msg: string) => void;
}) {
  const esPopular = plan.ordenDisplay === 2;
  const [loading, setLoading] = useState(false);

  async function handleSeleccionar() {
    setLoading(true);
    try {
      const { checkoutUrl } = await suscripcionApi.iniciarPago(sucursalId, plan.id);
      window.location.href = checkoutUrl;
    } catch {
      onError('No se pudo iniciar el pago. Intentá de nuevo.');
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`relative rounded-2xl border p-6 flex flex-col gap-4 transition-shadow ${
        esActual
          ? 'border-primary bg-primary/5 shadow-md'
          : esPopular
          ? 'border-primary/40 bg-surface shadow-lg'
          : 'border-border bg-surface'
      }`}
    >
      {esPopular && !esActual && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
          Más popular
        </span>
      )}
      {esActual && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <BadgeCheckIcon className="w-3 h-3" /> Plan actual
        </span>
      )}

      <div>
        <h3 className="text-lg font-heading font-bold text-text-primary">{plan.nombre}</h3>
        {plan.descripcion && (
          <p className="text-sm text-text-muted mt-0.5">{plan.descripcion}</p>
        )}
      </div>

      <div className="flex items-end gap-1">
        <span className="text-3xl font-bold text-text-primary">
          {plan.precioMensual === 0 ? 'Gratis' : formatPrecio(plan.precioMensual)}
        </span>
        {plan.precioMensual > 0 && (
          <span className="text-text-muted text-sm mb-1">/mes</span>
        )}
      </div>

      <ul className="space-y-2 flex-1">
        <li className="flex items-center gap-2 text-sm text-text-secondary">
          <CheckIcon className="w-4 h-4 text-success flex-shrink-0" />
          {plan.maxUsuarios} usuarios
        </li>
        <li className="flex items-center gap-2 text-sm text-text-secondary">
          <CheckIcon className="w-4 h-4 text-success flex-shrink-0" />
          {plan.maxTurnosMes === null ? 'Turnos ilimitados' : `${plan.maxTurnosMes} turnos/mes`}
        </li>

        {plan.tieneReportes && (
          <li className="flex items-center gap-2 text-sm text-text-secondary">
            <CheckIcon className="w-4 h-4 text-success flex-shrink-0" />
            Reportes y estadísticas
          </li>
        )}
        {!plan.tieneReportes && (
          <li className="flex items-center gap-2 text-sm text-text-muted">
            <XIcon className="w-4 h-4 text-border flex-shrink-0" />
            Sin reportes
          </li>
        )}
        {plan.duracionTrialDias > 0 && (
          <li className="flex items-center gap-2 text-sm text-text-secondary">
            <ZapIcon className="w-4 h-4 text-amber-500 flex-shrink-0" />
            {plan.duracionTrialDias} días de prueba
          </li>
        )}
      </ul>

      <button
        onClick={esActual ? undefined : handleSeleccionar}
        disabled={esActual || loading}
        className={`w-full py-2.5 rounded-button text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
          esActual
            ? 'bg-success/10 text-success cursor-default'
            : esPopular
            ? 'bg-primary text-white hover:bg-primary/90 disabled:opacity-60'
            : 'bg-surface-background border border-border text-text-secondary hover:border-primary hover:text-primary disabled:opacity-60'
        }`}
      >
        {esActual ? (
          <>
            <BadgeCheckIcon className="w-4 h-4" /> Plan activo
          </>
        ) : loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            Seleccionar este plan <ArrowRightIcon className="w-4 h-4" />
          </>
        )}
      </button>
    </motion.div>
  );
}

// ─── Alert banners ─────────────────────────────────────────────────────────────

function AlertBanner({
  type,
  message,
  cta,
}: {
  type: 'warning' | 'danger' | 'info';
  message: string;
  cta?: { label: string; href: string };
}) {
  const styles = {
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    danger:  'bg-red-50   border-red-200   text-red-800',
    info:    'bg-primary/5 border-primary/20 text-primary',
  };
  const btnStyles = {
    warning: 'bg-amber-800 text-white hover:bg-amber-900',
    danger:  'bg-red-700   text-white hover:bg-red-800',
    info:    'bg-primary   text-white hover:bg-primary/90',
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${styles[type]}`}>
      <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">{message}</span>
      {cta && (
        <a
          href={cta.href}
          className={`flex-shrink-0 px-3 py-1.5 rounded-button text-xs font-semibold transition-colors ${btnStyles[type]}`}
        >
          {cta.label}
        </a>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SuscripcionPage() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const { toasts, addToast, dismiss } = useToast();

  const [suscripcion, setSuscripcion] = useState<SuscripcionInfo | null>(null);
  const [planes, setPlanes]           = useState<Plan[]>([]);
  const [historial, setHistorial]     = useState<PagoSuscripcionHistorial[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);

  // Detectar retorno desde MP (?pago=exitoso o ?pago=fallido)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pago   = params.get('pago');
    if (pago === 'exitoso') {
      addToast('success', '¡Plan activado! Tu suscripción fue actualizada.');
      window.history.replaceState(null, '', location.pathname);
    } else if (pago === 'fallido') {
      addToast('error', 'El pago no pudo completarse. Podés intentarlo de nuevo.');
      window.history.replaceState(null, '', location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user?.sucursalId) return;

    Promise.all([
      suscripcionApi.getSuscripcion(user.sucursalId),
      suscripcionApi.getPlanes(),
      suscripcionApi.getHistorial(user.sucursalId),
    ])
      .then(([sus, pls, hist]) => {
        setSuscripcion(sus);
        setPlanes(pls);
        setHistorial(hist);
      })
      .catch(() => setError('No se pudo cargar la información de suscripción.'))
      .finally(() => setLoading(false));
  }, [user?.sucursalId]);

  // ── 403 guard ──────────────────────────────────────────────────────────────
  if (!user?.esOwner) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <LockIcon className="w-12 h-12 text-text-muted" />
        <h2 className="text-xl font-heading font-bold text-text-primary">Acceso restringido</h2>
        <p className="text-text-muted max-w-sm">
          Solo el propietario de la cuenta puede gestionar la suscripción.
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

  // ── Derived state ──────────────────────────────────────────────────────────
  const vencida  = suscripcion.estado === 'Vencida'  || suscripcion.estado === 'PruebVencida';
  const prueba   = suscripcion.estado === 'PruebActiva';
  const pctUsers  = pct(suscripcion.usuariosActuales, suscripcion.maxUsuarios);
  const pctTurnos = pct(suscripcion.turnosMesActual, suscripcion.maxTurnosMes);

  const alertas: { type: 'warning' | 'danger' | 'info'; message: string }[] = [];
  if (vencida) {
    alertas.push({ type: 'danger', message: 'Tu suscripción venció. Seleccioná un plan para seguir usando el sistema.' });
  }
  if (prueba && suscripcion.diasRestantes <= 3 && suscripcion.diasRestantes > 0) {
    alertas.push({ type: 'danger', message: `Tu período de prueba vence en ${suscripcion.diasRestantes} día${suscripcion.diasRestantes !== 1 ? 's' : ''}. Activá un plan para no perder el acceso.` });
  } else if (prueba && suscripcion.diasRestantes > 3) {
    alertas.push({ type: 'info', message: `Estás en tu período de prueba gratuito. Te quedan ${suscripcion.diasRestantes} días.` });
  }
  const overQuotaUsers  = suscripcion.maxUsuarios < 999
    && suscripcion.usuariosActuales > suscripcion.maxUsuarios;
  const overQuotaTurnos = suscripcion.maxTurnosMes !== null
    && suscripcion.turnosMesActual > suscripcion.maxTurnosMes;

  // Over-quota (downgrade): usuarios
  if (overQuotaUsers) {
    alertas.push({
      type: 'danger',
      message: `Tu plan permite ${suscripcion.maxUsuarios} usuario${suscripcion.maxUsuarios !== 1 ? 's' : ''}, pero tenés ${suscripcion.usuariosActuales} activos. Los usuarios actuales siguen operativos, pero no podés agregar nuevos hasta actualizar tu plan o desactivar alguno.`,
    });
  } else if (pctUsers >= 90 && suscripcion.maxUsuarios < 999) {
    alertas.push({
      type: 'warning',
      message: `Estás usando ${suscripcion.usuariosActuales} de ${suscripcion.maxUsuarios} usuarios. Considerá actualizar tu plan.`,
    });
  }

  // Over-quota (downgrade): turnos
  if (overQuotaTurnos) {
    alertas.push({
      type: 'danger',
      message: `Tu plan permite ${suscripcion.maxTurnosMes} turnos/mes, pero ya tenés ${suscripcion.turnosMesActual} este mes. Los turnos existentes siguen activos, pero no podés agendar nuevos hasta el próximo mes o hasta actualizar tu plan.`,
    });
  } else if (pctTurnos >= 90 && suscripcion.maxTurnosMes !== null) {
    alertas.push({
      type: 'warning',
      message: `Alcanzaste el ${pctTurnos}% del límite de turnos este mes (${suscripcion.turnosMesActual}/${suscripcion.maxTurnosMes}).`,
    });
  }


  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <ToastContainer toasts={toasts} onDismiss={dismiss} />

      {/* ── Alertas ── */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <AlertBanner key={i} type={a.type} message={a.message} />
          ))}
        </div>
      )}

      {/* ── Estado actual ── */}
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
              <p className="text-sm text-text-muted">
                {suscripcion.planPrecio === 0
                  ? 'Gratuito'
                  : `${formatPrecio(suscripcion.planPrecio)}/mes`}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                vencida
                  ? 'bg-red-100 text-red-700'
                  : prueba
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-success/10 text-success'
              }`}
            >
              {vencida ? (
                <><AlertTriangleIcon className="w-3 h-3" /> Vencida</>
              ) : prueba ? (
                <><ZapIcon className="w-3 h-3" /> Período de prueba</>
              ) : (
                <><BadgeCheckIcon className="w-3 h-3" /> Activa</>
              )}
            </span>
            <span className="text-xs text-text-muted">
              {vencida ? 'Venció el' : 'Válida hasta'}{' '}
              {formatFecha(suscripcion.fechaVencimiento)}
            </span>
          </div>
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

      {/* ── Planes disponibles ── */}
      {planes.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-text-primary">Planes disponibles</h2>
            <p className="text-sm text-text-muted mt-0.5">
              Cambiá de plan cuando quieras. El nuevo plan se activa inmediatamente.
            </p>
          </div>

          <div className={`grid gap-6 ${planes.length === 1 ? 'grid-cols-1 max-w-sm' : planes.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
            {planes.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                esActual={
                  plan.nombre.toLowerCase() === suscripcion.planNombre.toLowerCase()
                }
                sucursalId={user.sucursalId ?? ''}
                onError={(msg) => addToast('error', msg)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Historial de pagos ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ReceiptIcon className="w-5 h-5 text-text-muted" />
          <h2 className="text-xl font-heading font-bold text-text-primary">Historial de pagos</h2>
        </div>

        {historial.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-8 text-center text-text-muted text-sm">
            Aún no hay pagos registrados.
          </div>
        ) : (
          <div className="bg-surface rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-background">
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold text-text-secondary">Plan</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary">Monto</th>
                  <th className="text-right px-4 py-3 font-semibold text-text-secondary hidden sm:table-cell">ID de pago</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((p, i) => (
                  <tr
                    key={p.id}
                    className={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-surface-background/50'}`}
                  >
                    <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                      {formatFecha(p.fechaPago)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text-primary">
                      {p.planNombre}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text-primary whitespace-nowrap">
                      {formatPrecio(p.monto)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-muted font-mono text-xs hidden sm:table-cell">
                      #{p.mPPaymentId}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CTA soporte ── */}
      <div className="bg-surface rounded-2xl border border-border p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
        <div>
          <h3 className="font-heading font-semibold text-text-primary">¿Necesitás ayuda?</h3>
          <p className="text-sm text-text-muted mt-0.5">
            Contactá a nuestro equipo para consultas de facturación o soporte técnico.
          </p>
        </div>
        <a
          href="mailto:soporte@turneroapp.com"
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-button text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Contactar soporte <ArrowRightIcon className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}
