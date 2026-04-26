import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, XCircleIcon, Loader2Icon } from 'lucide-react';
import { pagosApi } from '../../api/pagos';

type Estado = 'procesando' | 'ok' | 'error' | 'sinParams';

export function PagoExitoso() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>('procesando');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId   = params.get('payment_id');
    const externalRef = params.get('external_reference');

    if (!paymentId || !externalRef) {
      setEstado('sinParams');
      return;
    }

    (async () => {
      try {
        await pagosApi.confirmarRedirect(paymentId, externalRef);
        setEstado('ok');
      } catch {
        // Fallback: consultar estado directamente en MP
        try {
          const { data } = await pagosApi.verificarPago(externalRef);
          setEstado(data.confirmado ? 'ok' : 'error');
        } catch {
          setEstado('error');
        }
      }
    })();
  }, []);

  if (estado === 'procesando') {
    return (
      <div className="min-h-screen bg-surface-background flex flex-col items-center justify-center px-4 font-body">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <Loader2Icon className="w-12 h-12 animate-spin" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-3">
            Confirmando pago...
          </h1>
          <p className="text-text-secondary text-base sm:text-lg">
            Estamos verificando tu pago con Mercado Pago.
          </p>
        </div>
      </div>
    );
  }

  if (estado === 'error') {
    return (
      <div className="min-h-screen bg-surface-background flex flex-col items-center justify-center px-4 font-body">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 bg-warning/10 text-warning rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircleIcon className="w-12 h-12" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-3">
            Pago recibido
          </h1>
          <p className="text-text-secondary mb-2 text-base sm:text-lg">
            Tu pago fue procesado en Mercado Pago.
          </p>
          <p className="text-text-muted text-sm mb-8">
            Hubo un inconveniente al confirmar automáticamente, pero tu turno será confirmado en breve. Si tenés dudas, comunicate con el local.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-button font-medium transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  // estado === 'ok' | 'sinParams'
  return (
    <div className="min-h-screen bg-surface-background flex flex-col items-center justify-center px-4 font-body">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-success/10 text-success rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircleIcon className="w-12 h-12" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-3">
          ¡Pago recibido!
        </h1>
        <p className="text-text-secondary mb-2 text-base sm:text-lg">
          Tu seña fue procesada correctamente.
        </p>
        <p className="text-text-muted text-sm mb-8">
          Tu turno quedó confirmado. Recibirás un correo con el resumen de la reserva.
        </p>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-button font-medium transition-colors"
        >
          Volver al inicio
        </button>
      </div>
    </div>
  );
}
