import React from 'react';
import type { ConceptoPagoTurno, MedioPago } from '../../types';

interface PaymentBadgeProps {
  concepto?: ConceptoPagoTurno;
  medio?: MedioPago;
  className?: string;
}

const conceptStyles: Record<ConceptoPagoTurno, string> = {
  Sena:        'border border-[#F59E0B] text-[#92400E] bg-[#FEF3C7]/50',
  PagoParcial: 'border border-[#3B82F6] text-[#1E40AF] bg-[#DBEAFE]/50',
  PagoTotal:   'bg-[#10B981] text-white border border-transparent',
  SaldoFinal:  'border border-[#8B5CF6] text-[#5B21B6] bg-[#EDE9FE]/50',
  Ajuste:      'border border-[#6B7280] text-[#374151] bg-[#F3F4F6]/50',
};

const conceptLabels: Record<ConceptoPagoTurno, string> = {
  Sena:        'Seña',
  PagoParcial: 'Pago parcial',
  PagoTotal:   'Pago total',
  SaldoFinal:  'Saldo final',
  Ajuste:      'Ajuste',
};

const medioStyles: Record<MedioPago, string> = {
  Efectivo:      'bg-green-100 text-green-800',
  MercadoPago:   'bg-sky-100 text-sky-800',
  Transferencia: 'bg-indigo-100 text-indigo-800',
  Tarjeta:       'bg-slate-100 text-slate-800',
  Otro:          'bg-gray-100 text-gray-800',
};

export function PaymentBadge({ concepto, medio, className = '' }: PaymentBadgeProps) {
  if (concepto) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conceptStyles[concepto]} ${className}`}>
        {conceptLabels[concepto]}
      </span>
    );
  }
  if (medio) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${medioStyles[medio]} ${className}`}>
        {medio}
      </span>
    );
  }
  return null;
}
