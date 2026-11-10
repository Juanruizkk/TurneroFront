import { InfoIcon, RefreshCwIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import ReportarProblema from '../soporte/ReportarProblema';

/**
 * Banner permanente que se muestra solo cuando la sesión es una demo efímera.
 * Avisa que los emails están desactivados y que los datos se borran en 30 min.
 * Incluye un acceso para cambiar de rol reusando la misma sucursal demo.
 */
export default function DemoBanner() {
  const { user } = useAuth();
  if (!user?.esDemo) return null;

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-900 text-xs sm:text-sm px-4 py-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-medium">
      <span className="flex items-center gap-2">
        <InfoIcon className="w-4 h-4 flex-shrink-0" />
        Estás en una demo — los emails están desactivados y los datos se borran en 30 min.
      </span>
      <Link
        to="/probar-demo"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 font-semibold transition-colors"
      >
        <RefreshCwIcon className="w-3.5 h-3.5" /> Cambiar rol
      </Link>
      <ReportarProblema triggerClassName="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 font-semibold transition-colors" />
    </div>
  );
}
