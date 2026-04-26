import { useState } from 'react';
import { motion } from 'framer-motion';
import { StoreIcon, ArrowLeftIcon } from 'lucide-react';
import type { OpcionSucursal } from '../../types';

interface Props {
  opciones: OpcionSucursal[];
  onSeleccionar: (sucursalId: string) => void;
  onVolver: () => void;
}

export function SucursalSelector({ opciones, onSeleccionar, onVolver }: Props) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleClick = async (sucursalId: string) => {
    setLoadingId(sucursalId);
    await onSeleccionar(sucursalId);
    setLoadingId(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md"
    >
      <div className="mb-8">
        <h2 className="text-2xl font-heading font-bold text-text-primary">
          ¿A qué sucursal querés entrar?
        </h2>
        <p className="text-text-secondary mt-1">
          Tu cuenta está asociada a más de una sucursal.
        </p>
      </div>

      <div className="space-y-3">
        {opciones.map((opcion) => {
          const isLoading = loadingId === opcion.sucursalId;
          return (
            <button
              key={opcion.sucursalId}
              onClick={() => handleClick(opcion.sucursalId)}
              disabled={loadingId !== null}
              className="w-full flex items-center gap-4 p-4 rounded-card border border-border bg-surface hover:border-primary hover:bg-primary/5 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                <StoreIcon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {opcion.sucursalNombre}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {opcion.esOwner ? 'Owner' : opcion.rol}
                </p>
              </div>
              {isLoading && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <button
        onClick={onVolver}
        className="mt-6 flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Volver al inicio de sesión
      </button>
    </motion.div>
  );
}
