import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircleIcon } from 'lucide-react';

export function PagoFallido() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-background flex flex-col items-center justify-center px-4 font-body">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 bg-error/10 text-error rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircleIcon className="w-12 h-12" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-heading font-bold text-text-primary mb-3">
          El pago no se completó
        </h1>
        <p className="text-text-secondary mb-2 text-base sm:text-lg">
          Hubo un problema al procesar tu pago.
        </p>
        <p className="text-text-muted text-sm mb-8">
          Tu turno no fue confirmado. Podés intentarlo nuevamente o elegir otro método de pago.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/reservar')}
            className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-button font-medium transition-colors"
          >
            Intentar nuevamente
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-surface border border-border hover:border-primary/50 text-text-secondary px-6 py-3 rounded-button font-medium transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
}
