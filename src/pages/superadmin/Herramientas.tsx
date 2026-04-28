import React, { useState } from 'react';
import { WrenchIcon, ReceiptIcon } from 'lucide-react';
import { suscripcionesAdminApi } from '../../api/superadmin';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';

export function Herramientas() {
  const { toasts, addToast, dismiss } = useToast();

  const [paymentId, setPaymentId] = useState('');
  const [procesando, setProcesando] = useState(false);

  const procesarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentId.trim()) return;
    setProcesando(true);
    try {
      const res = await suscripcionesAdminApi.procesarPagoManual(paymentId.trim());
      addToast('success', res.mensaje ?? 'Pago procesado correctamente.');
      setPaymentId('');
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'No se pudo procesar el pago.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-heading font-bold text-text-primary">Herramientas</h2>
        <p className="text-text-secondary text-sm mt-1">
          Acciones manuales de recuperación y mantenimiento.
        </p>
      </div>

      {/* Card: procesar pago */}
      <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ReceiptIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-text-primary text-sm">
              Procesar pago de suscripción manualmente
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Usar cuando el webhook de MP no llegó (ngrok caído, etc.) y el pago ya fue acreditado.
            </p>
          </div>
        </div>

        <form onSubmit={procesarPago} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              Payment ID de Mercado Pago
            </label>
            <input
              type="text"
              value={paymentId}
              onChange={(e) => setPaymentId(e.target.value)}
              placeholder="Ej: 1234567890"
              className="w-full px-3 py-2.5 border border-border rounded-input text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            />
            <p className="text-xs text-text-muted mt-1.5">
              El ID se encuentra en el panel de Mercado Pago → Actividad → detalle del pago.
            </p>
          </div>

          <button
            type="submit"
            disabled={procesando || !paymentId.trim()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-button transition-colors disabled:opacity-50"
          >
            <WrenchIcon className="w-4 h-4" />
            {procesando ? 'Procesando…' : 'Procesar pago'}
          </button>
        </form>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
