import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2Icon, LinkIcon, AlertCircleIcon, CheckCircleIcon, UnlinkIcon } from 'lucide-react';
import { mercadopagoApi } from '../../api/mercadopago';

interface Props {
  sucursalId: string;
  yaConectado?: boolean;
  onConectado?: () => void;
  onDesconectado?: () => void;
  newTab?: boolean;
}

export function ConectarMercadoPagoButton({ sucursalId, yaConectado = false, onConectado, onDesconectado, newTab = false }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConectar = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { url } = await mercadopagoApi.obtenerUrlConexion(sucursalId);
      onConectado?.();
      if (newTab) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = url;
      }
    } catch {
      setError('No se pudo iniciar la conexión con Mercado Pago. Intentá de nuevo.');
      setConnecting(false);
    }
  };

  const handleDesconectar = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      await mercadopagoApi.desconectar(sucursalId);
      setConfirming(false);
      onDesconectado?.();
    } catch {
      setError('No se pudo desconectar la cuenta. Intentá de nuevo.');
      setDisconnecting(false);
      setConfirming(false);
    }
  };

  if (yaConectado) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircleIcon className="w-4 h-4" />
            Conectado
          </div>

          {!confirming ? (
            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-red-500 transition-colors"
            >
              <UnlinkIcon className="w-3.5 h-3.5" />
              Desconectar
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">¿Confirmar?</span>
              <button
                onClick={handleDesconectar}
                disabled={disconnecting}
                className="flex items-center gap-1 text-xs text-red-600 font-medium hover:text-red-700 disabled:opacity-60 transition-colors"
              >
                {disconnecting && <Loader2Icon className="w-3 h-3 animate-spin" />}
                Sí, desconectar
              </button>
              <button
                onClick={() => setConfirming(false)}
                disabled={disconnecting}
                className="text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-500">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleConectar}
        disabled={connecting}
        className="flex items-center gap-2 bg-[#009EE3] text-white hover:bg-[#008acc] disabled:opacity-60 rounded-button px-4 py-2 text-sm font-medium transition-all"
      >
        <AnimatePresence mode="wait">
          {connecting ? (
            <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Loader2Icon className="w-4 h-4 animate-spin" />
            </motion.span>
          ) : (
            <motion.span key="link" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LinkIcon className="w-4 h-4" />
            </motion.span>
          )}
        </AnimatePresence>
        {connecting ? 'Conectando...' : 'Conectar Mercado Pago'}
      </button>

      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-500">
          <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
