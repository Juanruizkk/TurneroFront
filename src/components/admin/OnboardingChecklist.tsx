import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XIcon, PartyPopperIcon, SparklesIcon, ArrowRightIcon } from 'lucide-react';
import { onboardingApi, type OnboardingStatus } from '../../api/onboarding';

const DISMISS_KEY = (sucursalId: string) => `onboarding_done_${sucursalId}`;

interface Props {
  sucursalId: string;
}

export function OnboardingChecklist({ sucursalId }: Props) {
  const navigate = useNavigate();
  const [status, setStatus]       = useState<OnboardingStatus | null>(null);
  const [visible, setVisible]     = useState(false);
  const [allDoneAnim, setAllDoneAnim] = useState(false);

  useEffect(() => {
    if (!sucursalId) return;
    if (localStorage.getItem(DISMISS_KEY(sucursalId))) return;

    onboardingApi
      .getStatus(sucursalId)
      .then((data) => {
        if (data.completado) {
          localStorage.setItem(DISMISS_KEY(sucursalId), '1');
          return;
        }
        setStatus(data);
        setVisible(true);
      })
      .catch(() => {});
  }, [sucursalId]);

  // Detectar cuando se completan todos los pasos
  useEffect(() => {
    if (!status?.completado) return;
    setAllDoneAnim(true);
    const t = setTimeout(() => {
      localStorage.setItem(DISMISS_KEY(sucursalId), '1');
      setVisible(false);
    }, 2500);
    return () => clearTimeout(t);
  }, [status, sucursalId]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY(sucursalId), '1');
    setVisible(false);
  };

  if (!visible || !status) return null;

  if (allDoneAnim) {
    return (
      <div className="bg-surface border border-border rounded-card shadow-sm px-5 py-4 flex items-center gap-3">
        <PartyPopperIcon className="w-5 h-5 text-success flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-text-primary">¡Tu negocio está listo!</p>
          <p className="text-xs text-text-muted mt-0.5">Completaste todos los pasos de configuración.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-primary/30 rounded-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between gap-4 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <SparklesIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Configurá tu negocio</p>
            <p className="text-xs text-text-muted mt-0.5">
              Usá el asistente para configurarlo en pocos pasos
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

      {/* CTA */}
      <div className="px-5 py-4 flex items-center justify-between gap-4">
        <p className="text-sm text-text-secondary leading-relaxed">
          Completá el perfil, horarios, servicios y más en un solo flujo guiado.
          Todo se puede ajustar luego desde cada sección del panel.
        </p>
        <button
          onClick={() => navigate('/admin/onboarding')}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-all flex-shrink-0 shadow-sm"
        >
          Comenzar
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
