import React from 'react';
import type { EstadoTurno } from '../../types';

interface StatusBadgeProps {
  estado: EstadoTurno;
  className?: string;
}

const statusConfig: Record<EstadoTurno, { bg: string; text: string; dot: string; label: string }> = {
  Pendiente:        { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', dot: 'bg-[#F59E0B]', label: 'Pendiente' },
  Confirmado:       { bg: 'bg-[#DBEAFE]', text: 'text-[#1E40AF]', dot: 'bg-[#3B82F6]', label: 'Confirmado' },
  CanceladoCliente: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', dot: 'bg-[#EF4444]', label: 'Cancelado (cliente)' },
  CanceladoStaff:   { bg: 'bg-[#FECACA]', text: 'text-[#7F1D1D]', dot: 'bg-[#DC2626]', label: 'Cancelado (staff)' },
  Completado:       { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]', dot: 'bg-[#10B981]', label: 'Completado' },
  NoShow:           { bg: 'bg-[#E2E8F0]', text: 'text-[#334155]', dot: 'bg-[#64748B]', label: 'No se presentó' },
  Reprogramado:     { bg: 'bg-[#EDE9FE]', text: 'text-[#5B21B6]', dot: 'bg-[#8B5CF6]', label: 'Reprogramado' },
  PendientePago:    { bg: 'bg-[#E0F2FE]', text: 'text-[#075985]', dot: 'bg-[#0EA5E9]', label: 'Pendiente de pago' },
  PagoRechazado:    { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', dot: 'bg-[#F59E0B]', label: 'Pago rechazado' },
};

export function StatusBadge({ estado, className = '' }: StatusBadgeProps) {
  const config = statusConfig[estado];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
}
