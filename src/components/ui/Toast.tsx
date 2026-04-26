import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, InfoIcon, XIcon } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const icons = {
  success: <CheckCircleIcon className="w-5 h-5 text-success" />,
  error:   <XCircleIcon className="w-5 h-5 text-error" />,
  info:    <InfoIcon className="w-5 h-5 text-info" />,
};

const bg = {
  success: 'border-success/30 bg-success/10',
  error:   'border-error/30 bg-error/10',
  info:    'border-info/30 bg-info/10',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={`flex items-center gap-3 px-4 py-3 rounded-card border shadow-lg bg-surface min-w-[280px] max-w-sm ${bg[toast.type]}`}
    >
      {icons[toast.type]}
      <p className="flex-1 text-sm text-text-primary">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="text-text-muted hover:text-text-primary">
        <XIcon className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}
