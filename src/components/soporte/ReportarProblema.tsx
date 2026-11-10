import { useState } from 'react';
import { BugIcon, XIcon, CheckCircleIcon } from 'lucide-react';
import { soporteApi } from '../../api/soporte';
import { ApiError } from '../../api/client';
import { ModalPortal } from '../ui/ModalPortal';

interface Props {
  /** Clases del botón que abre el modal. Permite adaptarlo a footer oscuro o banner claro. */
  triggerClassName?: string;
  /** Tamaño del ícono del botón (px). */
  triggerIconSize?: number;
}

/**
 * Botón "Reportar un problema" + modal. Pensado para el footer público y el banner de demo.
 * Envía la descripción (y un email de contacto opcional) al backend,
 * que lo reenvía por email a la casilla de soporte.
 */
export default function ReportarProblema({ triggerClassName, triggerIconSize = 14 }: Props = {}) {
  const [abierto, setAbierto] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [email, setEmail] = useState('');
  const [estado, setEstado] = useState<'idle' | 'enviando' | 'ok'>('idle');
  const [error, setError] = useState<string | null>(null);

  function cerrar() {
    setAbierto(false);
    // Reset diferido para no ver el reset mientras cierra.
    setTimeout(() => {
      setDescripcion('');
      setEmail('');
      setEstado('idle');
      setError(null);
    }, 200);
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (descripcion.trim().length < 10) {
      setError('Contanos un poco más (mínimo 10 caracteres).');
      return;
    }
    setEstado('enviando');
    setError(null);
    try {
      await soporteApi.reportar({
        descripcion: descripcion.trim(),
        emailContacto: email.trim() || undefined,
        urlOrigen: window.location.href,
      });
      setEstado('ok');
    } catch (err) {
      setEstado('idle');
      setError(err instanceof ApiError ? err.message : 'No se pudo enviar. Intentá de nuevo.');
    }
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className={triggerClassName ?? 'inline-flex items-center gap-1.5 font-body text-xs text-white/50 hover:text-white/80 transition-colors'}
      >
        <BugIcon size={triggerIconSize} /> Reportar un problema
      </button>

      {abierto && (
        <ModalPortal>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={cerrar}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl text-text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={cerrar}
              className="absolute right-4 top-4 text-text-muted hover:text-text-primary transition-colors"
              aria-label="Cerrar"
            >
              <XIcon size={20} />
            </button>

            {estado === 'ok' ? (
              <div className="text-center py-6 flex flex-col items-center gap-3">
                <CheckCircleIcon size={44} className="text-primary" />
                <h2 className="font-heading text-lg font-bold">¡Gracias por avisarnos!</h2>
                <p className="text-sm text-text-secondary">Recibimos tu reporte y lo vamos a revisar.</p>
                <button
                  onClick={cerrar}
                  className="mt-2 px-5 py-2.5 rounded-button bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <form onSubmit={enviar} className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <BugIcon size={20} className="text-primary" />
                  <h2 className="font-heading text-lg font-bold">Reportar un problema</h2>
                </div>
                <p className="text-sm text-text-secondary -mt-2">
                  Contanos qué pasó y, si querés, dejanos un email para responderte.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    ¿Qué pasó? <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={4}
                    maxLength={2000}
                    placeholder="Describí el problema con el mayor detalle posible…"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Tu email (opcional)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vos@ejemplo.com"
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  type="submit"
                  disabled={estado === 'enviando'}
                  className="px-5 py-2.5 rounded-button bg-primary text-white font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60"
                >
                  {estado === 'enviando' ? 'Enviando…' : 'Enviar reporte'}
                </button>
              </form>
            )}
          </div>
        </div>
        </ModalPortal>
      )}
    </>
  );
}
