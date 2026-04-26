import React, { useCallback, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangleIcon, XIcon } from 'lucide-react';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
}

interface DialogState extends ConfirmOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

/**
 * Hook que provee un diálogo de confirmación reutilizable.
 *
 * Uso:
 *   const { ConfirmDialog, confirm } = useConfirmDialog();
 *
 *   // Renderizar una sola vez dentro del componente:
 *   return <> ... {ConfirmDialog} </>
 *
 *   // Abrir el diálogo y esperar la respuesta:
 *   const ok = await confirm({ title: '¿Eliminar adjunto?', description: 'Esta acción no se puede deshacer.' });
 *   if (ok) { ... }
 */
export function useConfirmDialog() {
  const [state, setState] = useState<DialogState>({ open: false, title: '' });
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ ...options, open: true });
    });
  }, []);

  const close = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setState((prev) => ({ ...prev, open: false }));
  };

  const ConfirmDialog = ReactDOM.createPortal(
    <AnimatePresence>
      {state.open && (
        <motion.div
          key="confirm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-text-primary/30 backdrop-blur-sm px-4"
          onClick={() => close(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-surface border border-border rounded-card shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icono + cabecera */}
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
                <AlertTriangleIcon className="w-5 h-5 text-error" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-heading font-bold text-text-primary leading-snug">
                  {state.title}
                </h3>
                {state.description && (
                  <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                    {state.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => close(false)}
                className="flex-shrink-0 p-1 text-text-muted hover:text-text-primary rounded transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Botones */}
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => close(false)}
                className="px-4 py-2 rounded-button text-sm font-medium bg-surface border border-border text-text-secondary hover:text-text-primary hover:bg-surface-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => close(true)}
                className="px-4 py-2 rounded-button text-sm font-medium bg-error text-white hover:bg-error/90 transition-colors"
              >
                {state.confirmLabel ?? 'Eliminar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );

  return { ConfirmDialog, confirm };
}
