import React from 'react';
import type { Turno } from '../../types';
import { getProfesionalColor } from '../../types';

interface TimeSlotProps {
  turno: Turno;
  onClick?: (turno: Turno) => void;
  className?: string;
  style?: React.CSSProperties;
}

function duracionLabel(inicio: string, fin: string): string {
  const mins = Math.round((new Date(fin).getTime() - new Date(inicio).getTime()) / 60000);
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

function horaCorta(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
}

export function TimeSlot({ turno, onClick, className = '', style }: TimeSlotProps) {
  const color   = getProfesionalColor(turno.profesionalId);
  const isPast  = new Date(turno.fechaHoraInicio) < new Date();
  const height  = parseInt(String(style?.height ?? '60'));
  const isTiny  = height < 36;
  const isShort = height < 60;
  const dur     = duracionLabel(turno.fechaHoraInicio, turno.fechaHoraFin);

  return (
    <div
      onClick={() => onClick?.(turno)}
      className={`absolute left-1.5 right-1.5 rounded-lg overflow-hidden cursor-pointer select-none
        transition-all duration-150 hover:brightness-110 hover:shadow-lg hover:-translate-y-px
        active:scale-[0.99] ${className}`}
      style={{
        ...style,
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        boxShadow: `0 1px 4px ${color}55, 0 0 0 1px ${color}33`,
        opacity: isPast ? 0.55 : 1,
        zIndex: 1,
      }}
    >
      <div className="h-full flex flex-col px-2.5 py-1.5 gap-0.5">
        {isTiny ? (
          <span className="text-white text-[9px] font-semibold truncate leading-none">
            {turno.clienteNombre}
          </span>
        ) : (
          <>
            <span
              className="text-white font-bold truncate leading-tight"
              style={{ fontSize: isShort ? '10px' : '11px', fontFamily: '"DM Sans", sans-serif' }}
            >
              {turno.servicioNombre}
            </span>
            {!isShort && (
              <span className="text-white/80 text-[10px] truncate leading-tight">
                {turno.clienteNombre}
              </span>
            )}
            <span className="text-white/70 text-[9px] font-medium mt-auto leading-none tabular-nums">
              {isShort
                ? `${turno.clienteNombre} · ${dur}`
                : `${horaCorta(turno.fechaHoraInicio)} – ${horaCorta(turno.fechaHoraFin)} · ${dur}`
              }
            </span>
          </>
        )}
      </div>
    </div>
  );
}
