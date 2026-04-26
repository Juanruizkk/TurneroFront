import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeftIcon, ChevronRightIcon, PlusIcon,
  CalendarDaysIcon, CalendarIcon, CalendarRangeIcon, EyeIcon, EyeOffIcon,
} from 'lucide-react';
import { turnosApi } from '../../api/turnos';
import { getProfesionalColor } from '../../types';
import type { Turno } from '../../types';
import { useAuth, tienePermiso } from '../../contexts/AuthContext';
import { useSignalR, type TurnoNotificacion } from '../../hooks/useSignalR';
import { NuevoTurnoDrawer } from '../../components/admin/NuevoTurnoDrawer';


const START_HOUR = 8;
const END_HOUR   = 20;
const PX_PER_MIN = 1.6;
const GRID_H     = (END_HOUR - START_HOUR + 1) * 60 * PX_PER_MIN; // px

type ViewMode = 'daily' | 'weekly' | 'monthly';

// PagoRechazado siempre oculto; los otros se muestran/ocultan con el toggle
const ESTADOS_SIEMPRE_OCULTOS = new Set(['PagoRechazado']);
const ESTADOS_GHOST = new Set(['CanceladoStaff', 'CanceladoCliente', 'NoShow']);

const MONTHS_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];
const DAYS_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function duracionLabel(inicio: string, fin: string): string {
  const mins = Math.round(
    (new Date(fin).getTime() - new Date(inicio).getTime()) / 60000,
  );
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

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDays(anchor: Date): Date[] {
  const mon = getMondayOf(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

function isSameDay(iso: string, day: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth()    === day.getMonth()    &&
    d.getDate()     === day.getDate()
  );
}

function positionOf(inicio: string, fin: string) {
  const d = new Date(inicio);
  const f = new Date(fin);
  const TOTAL_MINS = (END_HOUR - START_HOUR + 1) * 60;

  const startMin = Math.max((d.getHours() - START_HOUR) * 60 + d.getMinutes(), 0);
  const endMin   = Math.min((f.getHours() - START_HOUR) * 60 + f.getMinutes(), TOTAL_MINS);

  return {
    top:    startMin * PX_PER_MIN,
    height: Math.max((endMin - startMin) * PX_PER_MIN, 22),
  };
}

// Assign non-overlapping horizontal lanes to a list of events.
// Each event's `total` reflects only the events that DIRECTLY overlap with it,
// so non-overlapping events are always drawn at full width.
function computeLanes(events: Turno[]): Map<string, { lane: number; total: number }> {
  const sorted = [...events].sort(
    (a, b) => new Date(a.fechaHoraInicio).getTime() - new Date(b.fechaHoraInicio).getTime(),
  );

  // Step 1: greedy lane assignment
  const laneEnds: number[] = [];
  const assignments = new Map<string, number>(); // id → lane index

  for (const ev of sorted) {
    const start = new Date(ev.fechaHoraInicio).getTime();
    const end   = new Date(ev.fechaHoraFin).getTime();
    let placed  = false;
    for (let i = 0; i < laneEnds.length; i++) {
      if (laneEnds[i] <= start) {
        laneEnds[i] = end;
        assignments.set(ev.id, i);
        placed = true;
        break;
      }
    }
    if (!placed) {
      laneEnds.push(end);
      assignments.set(ev.id, laneEnds.length - 1);
    }
  }

  // Step 2: for each event, count how many events overlap with it (including itself)
  // so events that don't overlap anything stay at full width (total=1).
  const result = new Map<string, { lane: number; total: number }>();
  for (const ev of sorted) {
    const start = new Date(ev.fechaHoraInicio).getTime();
    const end   = new Date(ev.fechaHoraFin).getTime();
    const overlapping = sorted.filter(
      (o) => new Date(o.fechaHoraInicio).getTime() < end &&
             new Date(o.fechaHoraFin).getTime()    > start,
    );
    result.set(ev.id, {
      lane:  assignments.get(ev.id) ?? 0,
      total: overlapping.length, // includes ev itself → minimum 1
    });
  }

  return result;
}

// ─── Shared: time axis column ─────────────────────────────────────────────────

function TimeAxis({ hours }: { hours: number[] }) {
  return (
    <div
      className="w-16 flex-shrink-0 border-r border-border bg-surface-background relative z-10 select-none"
    >
      {hours.map((h) => (
        <div
          key={h}
          className="relative text-right pr-2"
          style={{ height: `${60 * PX_PER_MIN}px` }}
        >
          <span
            className="absolute -top-2.5 right-2 text-[10px] font-medium text-text-muted bg-surface-background px-0.5"
          >
            {h.toString().padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Shared: horizontal grid lines ───────────────────────────────────────────

function GridLines({ hours }: { hours: number[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      {hours.map((h) => (
        <div
          key={h}
          className="border-t border-border/40 w-full"
          style={{ height: `${60 * PX_PER_MIN}px` }}
        />
      ))}
    </div>
  );
}

// ─── Daily appointment card ───────────────────────────────────────────────────

interface DailyCardProps {
  turno: Turno;
  top: number;
  height: number;
  lane: number;
  totalLanes: number;
  onClick: () => void;
}

function DailyCard({ turno, top, height, lane, totalLanes, onClick }: DailyCardProps) {
  const color      = getProfesionalColor(turno.profesionalId);
  const isPast     = new Date(turno.fechaHoraInicio) < new Date();
  const isGhost    = ESTADOS_GHOST.has(turno.estado);
  const isTiny     = height < 36;
  const isShort    = height < 60;
  const dur        = duracionLabel(turno.fechaHoraInicio, turno.fechaHoraFin);

  const GAP  = 3;
  const colW = totalLanes > 1 ? `calc(${100 / totalLanes}% - ${GAP}px)` : 'calc(100% - 12px)';
  const colL = totalLanes > 1 ? `calc(${(100 / totalLanes) * lane}% + ${GAP / 2}px)` : '6px';

  const bg        = isGhost ? 'linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%)' : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`;
  const shadow    = isGhost ? '0 1px 3px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)' : `0 1px 4px ${color}55, 0 0 0 1px ${color}33`;
  const textColor = isGhost ? '#6b7280' : 'white';
  const opacity   = isGhost ? 0.55 : isPast ? 0.55 : 1;

  return (
    <div
      onClick={onClick}
      className="absolute rounded-lg overflow-hidden cursor-pointer select-none transition-all duration-150
        hover:brightness-105 hover:shadow-lg hover:-translate-y-px active:scale-[0.99]"
      style={{ top: `${top}px`, height: `${height}px`, left: colL, width: colW, background: bg, boxShadow: shadow, opacity, zIndex: lane + 1 }}
    >
      <div className="h-full flex flex-col px-2.5 py-1.5 gap-0.5">
        {isTiny ? (
          <span className="text-[9px] font-semibold truncate leading-none" style={{ color: textColor, textDecoration: isGhost ? 'line-through' : undefined }}>
            {turno.clienteNombre}
          </span>
        ) : (
          <>
            <span
              className="font-bold truncate leading-tight"
              style={{ fontSize: isShort ? '10px' : '11px', fontFamily: '"DM Sans", sans-serif', color: textColor, textDecoration: isGhost ? 'line-through' : undefined }}
            >
              {turno.servicioNombre}
            </span>
            {!isShort && (
              <span className="text-[10px] truncate leading-tight" style={{ color: isGhost ? '#9ca3af' : 'rgba(255,255,255,0.8)' }}>
                {turno.clienteNombre}
              </span>
            )}
            <span className="text-[9px] font-medium mt-auto leading-none tabular-nums" style={{ color: isGhost ? '#9ca3af' : 'rgba(255,255,255,0.7)' }}>
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

// ─── Weekly appointment card ──────────────────────────────────────────────────

interface WeeklyCardProps {
  turno: Turno;
  top: number;
  height: number;
  lane: number;
  totalLanes: number;
  onClick: () => void;
}

function WeeklyCard({ turno, top, height, lane, totalLanes, onClick }: WeeklyCardProps) {
  const color      = getProfesionalColor(turno.profesionalId);
  const isPast     = new Date(turno.fechaHoraInicio) < new Date();
  const isGhost    = ESTADOS_GHOST.has(turno.estado);
  const isTiny     = height < 30;
  const dur        = duracionLabel(turno.fechaHoraInicio, turno.fechaHoraFin);

  const laneW = totalLanes > 1 ? `${100 / totalLanes}%` : 'calc(100% - 6px)';
  const laneL = totalLanes > 1 ? `${(100 / totalLanes) * lane}%` : '3px';

  const bg        = isGhost ? 'linear-gradient(135deg, #d1d5db 0%, #e5e7eb 100%)' : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`;
  const shadow    = isGhost ? '0 1px 2px rgba(0,0,0,0.07)' : `0 1px 3px ${color}44`;
  const textColor = isGhost ? '#6b7280' : 'white';
  const opacity   = isGhost ? 0.55 : isPast ? 0.5 : 1;

  return (
    <div
      onClick={onClick}
      className="absolute rounded-md overflow-hidden cursor-pointer select-none transition-all duration-150
        hover:brightness-105 hover:shadow-md hover:-translate-y-px active:scale-[0.99]"
      style={{ top: `${top}px`, height: `${height}px`, left: laneL, width: laneW, background: bg, boxShadow: shadow, opacity, zIndex: lane + 1, paddingLeft: totalLanes > 1 ? '2px' : '0px' }}
    >
      <div className="h-full flex flex-col px-1.5 py-1 gap-px">
        {isTiny ? (
          <span className="text-[8px] font-semibold truncate leading-none" style={{ color: textColor, textDecoration: isGhost ? 'line-through' : undefined }}>
            {turno.clienteNombre}
          </span>
        ) : (
          <>
            <span className="font-bold text-[9px] truncate leading-tight" style={{ fontFamily: '"DM Sans", sans-serif', color: textColor, textDecoration: isGhost ? 'line-through' : undefined }}>
              {turno.servicioNombre}
            </span>
            <span className="text-[8px] truncate leading-tight" style={{ color: isGhost ? '#9ca3af' : 'rgba(255,255,255,0.75)' }}>
              {turno.clienteNombre}
            </span>
            <span className="text-[8px] mt-auto tabular-nums leading-none" style={{ color: isGhost ? '#9ca3af' : 'rgba(255,255,255,0.6)' }}>
              {horaCorta(turno.fechaHoraInicio)} · {dur}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Daily grid ───────────────────────────────────────────────────────────────

interface DailyGridProps {
  profesionales: { id: string; nombre: string; color: string }[];
  turnos: Turno[];
  hours: number[];
  isTimeVisible: boolean;
  currentTimeMins: number;
  onClickTurno: (t: Turno) => void;
}

function DailyGrid({ profesionales, turnos, hours, isTimeVisible, currentTimeMins, onClickTurno }: DailyGridProps) {
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    timeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Sticky professional header */}
      <div className="flex sticky top-0 z-20 bg-surface border-b border-border shadow-sm flex-shrink-0">
        <div className="w-16 flex-shrink-0 border-r border-border bg-surface-background" />
        {profesionales.length === 0 ? (
          <div className="flex-1 px-4 py-3 text-sm text-text-muted flex items-center">
            Sin turnos para este día
          </div>
        ) : profesionales.map((prof) => {
          const count = turnos.filter((t) => t.profesionalId === prof.id).length;
          return (
            <div
              key={prof.id}
              className="flex-1 min-w-[180px] py-3 px-4 border-r border-border flex items-center gap-2.5"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${prof.color} 0%, ${prof.color}bb 100%)`,
                  boxShadow: `0 2px 8px ${prof.color}40`,
                  fontSize: '11px',
                  fontFamily: '"DM Sans", sans-serif',
                  letterSpacing: '0.04em',
                }}
              >
                {prof.nombre.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className="font-semibold text-text-primary truncate"
                  style={{ fontSize: '12.5px', fontFamily: '"DM Sans", sans-serif' }}
                >
                  {prof.nombre}
                </span>
                <span className="text-text-muted" style={{ fontSize: '10px' }}>
                  {count} {count === 1 ? 'turno' : 'turnos'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid body */}
      <div className="flex relative" style={{ minHeight: `${GRID_H}px` }}>
        <TimeAxis hours={hours} />

        <div className="flex flex-1 relative">
          <GridLines hours={hours} />

          {/* Current time line */}
          {isTimeVisible && (
            <div
              ref={timeRef}
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimeMins * PX_PER_MIN}px` }}
            >
              <div className="relative flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-error shrink-0 -ml-1.5 shadow-sm" />
                <div className="flex-1 border-t-2 border-error" />
              </div>
            </div>
          )}

          {profesionales.length === 0 ? (
            <div className="flex-1" style={{ minHeight: `${GRID_H}px` }} />
          ) : (
            profesionales.map((prof) => {
              const profTurnos = turnos.filter((t) => t.profesionalId === prof.id);
              const lanes = computeLanes(profTurnos);
              return (
                <div
                  key={prof.id}
                  className="flex-1 min-w-[180px] border-r border-border relative group overflow-hidden"
                  style={{ minHeight: `${GRID_H}px` }}
                >
                  {/* Hover overlay */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                    style={{ background: `${prof.color}06` }} />

                  {profTurnos.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[11px] text-text-muted/70 font-medium">
                        No hay turnos para este día
                      </span>
                    </div>
                  ) : (
                    profTurnos.map((t) => {
                      const pos  = positionOf(t.fechaHoraInicio, t.fechaHoraFin);
                      const lane = lanes.get(t.id) ?? { lane: 0, total: 1 };
                      return (
                        <DailyCard
                          key={t.id}
                          turno={t}
                          top={pos.top}
                          height={pos.height}
                          lane={lane.lane}
                          totalLanes={lane.total}
                          onClick={() => onClickTurno(t)}
                        />
                      );
                    })
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Weekly grid ──────────────────────────────────────────────────────────────

interface WeeklyGridProps {
  weekDays: Date[];
  turnos: Turno[];
  hours: number[];
  isTimeVisible: boolean;
  currentTimeMins: number;
  today: Date;
  onClickTurno: (t: Turno) => void;
}

function WeeklyGrid({ weekDays, turnos, hours, isTimeVisible, currentTimeMins, today, onClickTurno }: WeeklyGridProps) {
  const timeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    timeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  // Per-day turnos
  const byDay = useMemo(() => {
    return weekDays.map((day) => ({
      day,
      turnos: turnos.filter((t) => isSameDay(t.fechaHoraInicio, day)),
    }));
  }, [weekDays, turnos]);

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      {/* Sticky day headers */}
      <div className="flex sticky top-0 z-20 bg-surface border-b border-border shadow-sm flex-shrink-0">
        <div className="w-16 flex-shrink-0 border-r border-border bg-surface-background" />
        {byDay.map(({ day, turnos: dayTurnos }) => {
          const isToday = isSameDay(day.toISOString(), today);
          return (
            <div
              key={day.toISOString()}
              className="flex-1 min-w-[100px] py-2 px-2 border-r border-border flex flex-col items-center gap-0.5"
            >
              <span
                className="text-[10px] font-medium uppercase tracking-wide"
                style={{ color: isToday ? 'var(--color-primary)' : '#9B959F' }}
              >
                {DAYS_SHORT[day.getDay()]}
              </span>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                style={
                  isToday
                    ? { background: 'var(--color-primary)', color: '#fff' }
                    : { color: '#2D2A2E' }
                }
              >
                {day.getDate()}
              </div>
              <span className="text-[9px] text-text-muted">
                {dayTurnos.length > 0 ? `${dayTurnos.length} turno${dayTurnos.length > 1 ? 's' : ''}` : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* Grid body */}
      <div className="flex relative" style={{ minHeight: `${GRID_H}px` }}>
        <TimeAxis hours={hours} />

        <div className="flex flex-1 relative">
          <GridLines hours={hours} />

          {/* Current time line (spans all day columns) */}
          {isTimeVisible && (
            <div
              ref={timeRef}
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: `${currentTimeMins * PX_PER_MIN}px` }}
            >
              <div className="relative flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-error shrink-0 -ml-1.5 shadow-sm" />
                <div className="flex-1 border-t-2 border-error" />
              </div>
            </div>
          )}

          {byDay.map(({ day, turnos: dayTurnos }) => {
            const isToday = isSameDay(day.toISOString(), today);
            const lanes = computeLanes(dayTurnos);

            return (
              <div
                key={day.toISOString()}
                className="flex-1 min-w-[100px] border-r border-border relative"
                style={{
                  minHeight: `${GRID_H}px`,
                  background: isToday ? 'rgba(180,105,123,0.025)' : undefined,
                }}
              >
                {dayTurnos.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span
                      className="text-[9.5px] text-text-muted/50 font-medium"
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    >
                      Sin turnos
                    </span>
                  </div>
                ) : (
                  dayTurnos.map((t) => {
                    const pos  = positionOf(t.fechaHoraInicio, t.fechaHoraFin);
                    const lane = lanes.get(t.id) ?? { lane: 0, total: 1 };
                    return (
                      <WeeklyCard
                        key={t.id}
                        turno={t}
                        top={pos.top}
                        height={pos.height}
                        lane={lane.lane}
                        totalLanes={lane.total}
                        onClick={() => onClickTurno(t)}
                      />
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Monthly helpers ──────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const total = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= total; d++) days.push(new Date(year, month, d));
  return days;
}

// ─── MonthlyGrid ──────────────────────────────────────────────────────────────

interface MonthlyGridProps {
  year: number;
  month: number;
  turnos: Turno[];
  today: Date;
  onClickDay: (date: Date) => void;
  onClickTurno: (t: Turno) => void;
}

function MonthlyGrid({ year, month, turnos, today, onClickDay, onClickTurno }: MonthlyGridProps) {
  const days = getMonthDays(year, month);
  // firstDay: 0=Sun…6=Sat → convert to Mon-based (0=Mon…6=Sun)
  const rawFirst = new Date(year, month, 1).getDay();
  const offset = rawFirst === 0 ? 6 : rawFirst - 1;

  const turnosByDay = useMemo(() => {
    const map = new Map<string, Turno[]>();
    turnos.forEach((t) => {
      const key = t.fechaHoraInicio.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [turnos]);

  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  const MAX_CHIPS = 3;

  return (
    <div className="flex-1 overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-border bg-surface-background sticky top-0 z-10">
        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map((d) => (
          <div key={d} className="py-2 text-center text-xs font-bold text-text-muted uppercase tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {/* Empty cells before first day */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border bg-surface-background/40" />
        ))}

        {days.map((date) => {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayTurnos = turnosByDay.get(key) ?? [];
          const extra = dayTurnos.length - MAX_CHIPS;
          const todayCell = isToday(date);
          const isSun = date.getDay() === 0;

          return (
            <div
              key={key}
              className={`min-h-[100px] border-b border-r border-border p-1.5 flex flex-col gap-1 ${
                todayCell ? 'bg-primary/5' : isSun ? 'bg-surface-background/60' : 'bg-surface'
              }`}
            >
              {/* Day number */}
              <button
                onClick={() => onClickDay(date)}
                className={`self-start w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-colors ${
                  todayCell
                    ? 'bg-primary text-white'
                    : 'text-text-secondary hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {date.getDate()}
              </button>

              {/* Turno chips */}
              {dayTurnos.slice(0, MAX_CHIPS).map((t) => {
                const color = getProfesionalColor(t.profesionalId);
                const isGhost = ESTADOS_GHOST.has(t.estado);
                return (
                  <button
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); onClickTurno(t); }}
                    title={`${horaCorta(t.fechaHoraInicio)} · ${t.clienteNombre} · ${t.servicioNombre}`}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-opacity hover:opacity-80 ${
                      isGhost ? 'opacity-50 line-through' : ''
                    }`}
                    style={{ backgroundColor: color + '22', color, borderLeft: `2px solid ${color}` }}
                  >
                    {horaCorta(t.fechaHoraInicio)} {t.clienteNombre.split(' ')[0]}
                  </button>
                );
              })}

              {extra > 0 && (
                <button
                  onClick={() => onClickDay(date)}
                  className="text-[10px] text-text-muted hover:text-primary font-medium text-left pl-1 transition-colors"
                >
                  +{extra} más
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Agenda ──────────────────────────────────────────────────────────────

export function Agenda() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const sucursalId = user?.sucursalId ?? '';
  const esProfesional = user?.rol === 'Profesional';
  const puedeAgendar  = tienePermiso(user, 'AgendarTurnos');

  const [view, setView]           = useState<ViewMode>('daily');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTurnos, setAllTurnos] = useState<Turno[]>([]);
  const [loading, setLoading]     = useState(true);
  const [profFilter, setProfFilter] = useState<string>('all');
  const [showNuevoTurno, setShowNuevoTurno] = useState(false);
  const [mostrarCancelados, setMostrarCancelados] = useState(false);

  useEffect(() => {
    setLoading(true);
    turnosApi
      .listar(sucursalId)
      .then((data) => {
        if (esProfesional && user?.userId) {
          setAllTurnos(data.filter((t) => t.profesionalId === user.userId));
        } else {
          setAllTurnos(data);
        }
      })
      .catch(() => setAllTurnos([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Tiempo real: actualizar calendario al recibir notificaciones SignalR ───
  const handleNuevoTurno = useCallback((notif: TurnoNotificacion) => {
    const turno = notif as unknown as Turno;
    setAllTurnos((prev) => {
      const idx = prev.findIndex((t) => t.id === turno.id);
      if (idx !== -1) {
        // Turno ya existe (ej: pasó de PendientePago a Confirmado) → actualizar
        const updated = [...prev];
        updated[idx] = turno;
        return updated;
      }
      return [...prev, turno];
    });
  }, []);

  const handleTurnoCancelado = useCallback((notif: TurnoNotificacion) => {
    const turno = notif as unknown as Turno;
    setAllTurnos((prev) =>
      prev.map((t) => (t.id === turno.id ? turno : t)),
    );
  }, []);

  useSignalR({
    token: user?.token,
    onNuevoTurno:    handleNuevoTurno,
    onTurnoCancelado: handleTurnoCancelado,
  });

  // ── Derived daily ──────────────────────────────────────────────────────────
  const dailyTurnos = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const d = String(currentDate.getDate()).padStart(2, '0');
    return allTurnos.filter((t) => {
      if (!t.fechaHoraInicio.startsWith(`${y}-${m}-${d}`)) return false;
      if (ESTADOS_SIEMPRE_OCULTOS.has(t.estado)) return false;
      if (!mostrarCancelados && ESTADOS_GHOST.has(t.estado)) return false;
      return true;
    });
  }, [allTurnos, currentDate, mostrarCancelados]);

  const profesionales = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; color: string }>();
    dailyTurnos.forEach((t) => {
      if (!map.has(t.profesionalId)) {
        map.set(t.profesionalId, {
          id: t.profesionalId,
          nombre: t.profesionalNombre,
          color: getProfesionalColor(t.profesionalId),
        });
      }
    });
    return Array.from(map.values());
  }, [dailyTurnos]);

  // ── Derived weekly ─────────────────────────────────────────────────────────
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const weeklyProfesionales = useMemo(() => {
    const map = new Map<string, { id: string; nombre: string; color: string }>();
    allTurnos.forEach((t) => {
      if (weekDays.some((d) => isSameDay(t.fechaHoraInicio, d)) && !map.has(t.profesionalId)) {
        map.set(t.profesionalId, {
          id: t.profesionalId,
          nombre: t.profesionalNombre,
          color: getProfesionalColor(t.profesionalId),
        });
      }
    });
    return Array.from(map.values());
  }, [allTurnos, weekDays]);

  const weeklyTurnos = useMemo(() =>
    allTurnos.filter((t) => {
      if (!weekDays.some((d) => isSameDay(t.fechaHoraInicio, d))) return false;
      if (ESTADOS_SIEMPRE_OCULTOS.has(t.estado)) return false;
      if (!mostrarCancelados && ESTADOS_GHOST.has(t.estado)) return false;
      if (profFilter !== 'all') return t.profesionalId === profFilter;
      return true;
    }),
  [allTurnos, weekDays, profFilter, mostrarCancelados]);

  // ── Monthly derived ─────────────────────────────────────────────────────────
  const monthlyTurnos = useMemo(() =>
    allTurnos.filter((t) => {
      const d = new Date(t.fechaHoraInicio);
      if (d.getFullYear() !== currentDate.getFullYear() || d.getMonth() !== currentDate.getMonth()) return false;
      if (ESTADOS_SIEMPRE_OCULTOS.has(t.estado)) return false;
      if (!mostrarCancelados && ESTADOS_GHOST.has(t.estado)) return false;
      return true;
    }),
  [allTurnos, currentDate, mostrarCancelados]);

  // ── Navigation ─────────────────────────────────────────────────────────────
  const prevPeriod = () => {
    setCurrentDate((d) => {
      const n = new Date(d);
      if (view === 'daily')   n.setDate(n.getDate() - 1);
      else if (view === 'weekly') n.setDate(n.getDate() - 7);
      else { n.setDate(1); n.setMonth(n.getMonth() - 1); }
      return n;
    });
  };
  const nextPeriod = () => {
    setCurrentDate((d) => {
      const n = new Date(d);
      if (view === 'daily')   n.setDate(n.getDate() + 1);
      else if (view === 'weekly') n.setDate(n.getDate() + 7);
      else { n.setDate(1); n.setMonth(n.getMonth() + 1); }
      return n;
    });
  };

  // ── Time indicator ─────────────────────────────────────────────────────────
  const now = new Date();
  const currentTimeMins = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
  const isTimeVisible   = currentTimeMins >= 0 && currentTimeMins <= (END_HOUR - START_HOUR) * 60;

  // ── Labels ─────────────────────────────────────────────────────────────────
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    [],
  );

  const dailyLabel = currentDate.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const weekLabel = (() => {
    const s = weekDays[0], e = weekDays[6];
    const sameMonth = s.getMonth() === e.getMonth();
    return sameMonth
      ? `${s.getDate()}–${e.getDate()} de ${MONTHS_ES[s.getMonth()]} ${e.getFullYear()}`
      : `${s.getDate()} ${MONTHS_ES[s.getMonth()]} – ${e.getDate()} ${MONTHS_ES[e.getMonth()]} ${e.getFullYear()}`;
  })();

  const monthLabel = `${MONTHS_ES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <div className="flex flex-col h-full bg-surface rounded-card border border-border shadow-sm overflow-hidden">

      {/* ── Toolbar ── */}
      <div className="border-b border-border flex flex-wrap items-center px-3 sm:px-5 bg-surface flex-shrink-0 gap-2 py-2 sm:py-0 sm:h-14">
        {/* Date navigation */}
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            onClick={prevPeriod}
            className="p-1.5 rounded-md hover:bg-surface-background text-text-secondary transition-colors shrink-0 touch-manipulation min-h-[36px]"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <span
            className="font-heading font-bold text-text-primary text-xs sm:text-sm capitalize whitespace-nowrap truncate flex-1 text-center"
          >
            {view === 'daily' ? dailyLabel : view === 'weekly' ? `Sem. ${weekLabel}` : monthLabel}
          </span>
          <button
            onClick={nextPeriod}
            className="p-1.5 rounded-md hover:bg-surface-background text-text-secondary transition-colors shrink-0 touch-manipulation min-h-[36px]"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1 text-xs font-medium border border-border rounded-full text-text-secondary hover:bg-surface-background transition-colors shrink-0 touch-manipulation min-h-[28px]"
          >
            Hoy
          </button>
          {esProfesional && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 shrink-0">
              Mi agenda
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex rounded-button border border-border overflow-hidden">
            <button
              onClick={() => setView('daily')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors touch-manipulation min-h-[32px] ${
                view === 'daily'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-background'
              }`}
            >
              <CalendarDaysIcon className="w-3.5 h-3.5" />
              Día
            </button>
            <button
              onClick={() => setView('weekly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-border transition-colors touch-manipulation min-h-[32px] ${
                view === 'weekly'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-background'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Semana
            </button>
            <button
              onClick={() => setView('monthly')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-border transition-colors touch-manipulation min-h-[32px] ${
                view === 'monthly'
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-background'
              }`}
            >
              <CalendarRangeIcon className="w-3.5 h-3.5" />
              Mes
            </button>
          </div>

          <button
            onClick={() => setMostrarCancelados((v) => !v)}
            title={mostrarCancelados ? 'Ocultar cancelados y ausentes' : 'Mostrar cancelados y ausentes'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-button border transition-colors touch-manipulation min-h-[32px] ${
              mostrarCancelados
                ? 'bg-surface-background border-border text-text-secondary hover:bg-border/50'
                : 'bg-surface border-border text-text-muted hover:text-text-secondary hover:bg-surface-background'
            }`}
          >
            {mostrarCancelados
              ? <EyeOffIcon className="w-3.5 h-3.5" />
              : <EyeIcon className="w-3.5 h-3.5" />
            }
            <span className="hidden sm:inline">
              {mostrarCancelados ? 'Ocultar cancelados' : 'Ver cancelados'}
            </span>
          </button>

          {puedeAgendar && (
            <button
              onClick={() => setShowNuevoTurno(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded-button transition-colors shadow-sm touch-manipulation min-h-[32px]"
            >
              <PlusIcon className="w-4 h-4" />
              Nuevo turno
            </button>
          )}
        </div>
      </div>

      {/* ── Weekly: professional filter ── */}
      {view === 'weekly' && weeklyProfesionales.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2 border-b border-border bg-surface-background overflow-x-auto no-scrollbar shrink-0">
          <span className="text-xs text-text-muted font-medium shrink-0">Filtrar:</span>
          <button
            onClick={() => setProfFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
              profFilter === 'all'
                ? 'bg-primary text-white border-primary'
                : 'bg-surface border-border text-text-secondary hover:border-primary/40'
            }`}
          >
            Todos
          </button>
          {weeklyProfesionales.map((p) => (
            <button
              key={p.id}
              onClick={() => setProfFilter(profFilter === p.id ? 'all' : p.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
                profFilter === p.id
                  ? 'text-white border-transparent'
                  : 'bg-surface border-border text-text-secondary hover:border-primary/40'
              }`}
              style={profFilter === p.id ? { backgroundColor: p.color, borderColor: p.color } : {}}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: profFilter === p.id ? 'rgba(255,255,255,0.7)' : p.color }}
              />
              {p.nombre}
            </button>
          ))}
        </div>
      )}

      {/* ── Grid area ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : view === 'daily' ? (
        <DailyGrid
          profesionales={profesionales}
          turnos={dailyTurnos}
          hours={hours}
          isTimeVisible={isTimeVisible}
          currentTimeMins={currentTimeMins}
          onClickTurno={(t) => navigate(`/admin/turno/${t.id}`)}
        />
      ) : view === 'weekly' ? (
        <WeeklyGrid
          weekDays={weekDays}
          turnos={weeklyTurnos}
          hours={hours}
          isTimeVisible={isTimeVisible}
          currentTimeMins={currentTimeMins}
          today={now}
          onClickTurno={(t) => navigate(`/admin/turno/${t.id}`)}
        />
      ) : (
        <MonthlyGrid
          year={currentDate.getFullYear()}
          month={currentDate.getMonth()}
          turnos={monthlyTurnos}
          today={now}
          onClickDay={(date) => { setCurrentDate(date); setView('daily'); }}
          onClickTurno={(t) => navigate(`/admin/turno/${t.id}`)}
        />
      )}

      <NuevoTurnoDrawer
        open={showNuevoTurno}
        onClose={() => setShowNuevoTurno(false)}
        onCreado={(turno) => {
          setAllTurnos((prev) => [...prev, turno]);
          setShowNuevoTurno(false);
        }}
        defaultDate={currentDate}
      />
    </div>
  );
}
