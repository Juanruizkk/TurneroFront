import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2Icon, CircleIcon, ArrowRightIcon, XIcon, PartyPopperIcon } from 'lucide-react';
import { onboardingApi, type OnboardingStatus } from '../../api/onboarding';

const DISMISS_KEY = (sucursalId: string) => `onboarding_done_${sucursalId}`;

interface Step {
  key: keyof Pick<OnboardingStatus, 'perfilCompleto' | 'tieneServicio' | 'tieneProfesional'>;
  label: string;
  description: string;
  href: string;
}

const STEPS: Step[] = [
  {
    key: 'perfilCompleto',
    label: 'Completá el perfil del negocio',
    description: 'Dirección, teléfono y datos de contacto',
    href: '/admin/ajustes',
  },
  {
    key: 'tieneServicio',
    label: 'Agregá tu primer servicio',
    description: 'Nombre, precio y duración',
    href: '/admin/servicios',
  },
  {
    key: 'tieneProfesional',
    label: 'Invitá a un profesional',
    description: 'Sumá a tu equipo de trabajo',
    href: '/admin/usuarios',
  },
];

interface Props {
  sucursalId: string;
}

export function OnboardingChecklist({ sucursalId }: Props) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [visible, setVisible] = useState(false);
  const [allDoneAnim, setAllDoneAnim] = useState(false);

  useEffect(() => {
    if (!sucursalId) return;
    if (localStorage.getItem(DISMISS_KEY(sucursalId))) return;

    onboardingApi
      .getStatus(sucursalId)
      .then((data) => {
        if (data.completado) {
          // Ya estaba todo completo antes de que mostremos nada → no mostrar
          localStorage.setItem(DISMISS_KEY(sucursalId), '1');
          return;
        }
        setStatus(data);
        setVisible(true);
      })
      .catch(() => {/* silencioso */});
  }, [sucursalId]);

  // Detectar cuando se acaban de completar todos los pasos
  useEffect(() => {
    if (!status) return;
    if (status.completado) {
      setAllDoneAnim(true);
      const t = setTimeout(() => {
        localStorage.setItem(DISMISS_KEY(sucursalId), '1');
        setVisible(false);
      }, 2500);
      return () => clearTimeout(t);
    }
  }, [status, sucursalId]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY(sucursalId), '1');
    setVisible(false);
  };

  if (!visible || !status) return null;

  const completedCount = STEPS.filter((s) => status[s.key]).length;
  const progressPct = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div className="bg-surface border border-border rounded-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {allDoneAnim ? (
            <PartyPopperIcon className="w-5 h-5 text-success flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">{completedCount}/{STEPS.length}</span>
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {allDoneAnim ? '¡Tu negocio está listo!' : 'Configurá tu negocio'}
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              {allDoneAnim
                ? 'Completaste todos los pasos de configuración'
                : 'Completá estos pasos para empezar a operar'}
            </p>
          </div>
        </div>
        <button
          onClick={dismiss}
          className="p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-surface-background transition-colors flex-shrink-0"
          title="Cerrar"
        >
          <XIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-border">
        <div
          className="h-full bg-primary transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-border/50">
        {STEPS.map((step) => {
          const done = status[step.key];
          return (
            <button
              key={step.key}
              onClick={() => !done && navigate(step.href)}
              disabled={done}
              className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
                done
                  ? 'cursor-default'
                  : 'hover:bg-surface-background'
              }`}
            >
              {done ? (
                <CheckCircle2Icon className="w-5 h-5 text-success flex-shrink-0" />
              ) : (
                <CircleIcon className="w-5 h-5 text-border flex-shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${done ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                  {step.label}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{step.description}</p>
              </div>

              {!done && (
                <ArrowRightIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
