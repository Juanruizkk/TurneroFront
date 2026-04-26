import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, SaveIcon, CheckIcon, ClockIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { usuariosApi } from '../../api/usuarios';
import { serviciosApi } from '../../api/servicios';
import { ajustesApi } from '../../api/ajustes';
import type { Usuario, HorarioLaboral, Servicio, DiaSemana } from '../../types';

// DayOfWeek matches .NET: 0=Domingo, 1=Lunes … 6=Sabado
const DIAS: { dow: number; label: string; diaNombre: DiaSemana }[] = [
  { dow: 1, label: 'Lunes',     diaNombre: 'Lunes'     },
  { dow: 2, label: 'Martes',    diaNombre: 'Martes'    },
  { dow: 3, label: 'Miércoles', diaNombre: 'Miercoles' },
  { dow: 4, label: 'Jueves',    diaNombre: 'Jueves'    },
  { dow: 5, label: 'Viernes',   diaNombre: 'Viernes'   },
  { dow: 6, label: 'Sábado',    diaNombre: 'Sabado'    },
  { dow: 0, label: 'Domingo',   diaNombre: 'Domingo'   },
];

interface Franja { horaDesde: string; horaHasta: string }
interface DiaHorario { activo: boolean; franjas: Franja[] }
interface DiaDefault { horaDesde: string; horaHasta: string }

function defaultFranja(dow: number, defaults: Map<number, DiaDefault>): Franja {
  const def = defaults.get(dow);
  return { horaDesde: def?.horaDesde ?? '09:00', horaHasta: def?.horaHasta ?? '18:00' };
}

/** Suma minutos a "HH:mm" y devuelve "HH:mm" (clampeado a "23:59"). */
function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + mins, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

interface Props {
  usuario: Usuario | null;
  sucursalId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function DisponibilidadDrawer({ usuario, sucursalId, onClose, onSaved }: Props) {
  const [serviciosDisponibles, setServiciosDisponibles] = useState<Servicio[]>([]);
  const [serviciosSeleccionados, setServiciosSeleccionados] = useState<Set<string>>(new Set());
  const [horarios, setHorarios] = useState<Map<number, DiaHorario>>(new Map());
  const [diasAbiertos, setDiasAbiertos] = useState<Set<number>>(new Set());
  const [sucursalDefaults, setSucursalDefaults] = useState<Map<number, DiaDefault>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario) return;
    setLoading(true);
    setError(null);

    Promise.all([
      serviciosApi.listar(sucursalId),
      usuariosApi.getHorarios(usuario.id),
      usuariosApi.getServicios(usuario.id),
      ajustesApi.obtener(sucursalId),
    ])
      .then(([svcs, horariosList, svcIds, ajustes]) => {
        setServiciosDisponibles(svcs.filter((s) => s.activo));
        setServiciosSeleccionados(new Set(svcIds));

        // Construir defaults y días abiertos desde los ajustes de la sucursal
        const defaults = new Map<number, DiaDefault>();
        const abiertos = new Set<number>();
        DIAS.forEach(({ dow, diaNombre }) => {
          const dia = ajustes.horariosAtencion[diaNombre];
          if (dia?.abierto) {
            abiertos.add(dow);
            if (dia.franjas.length > 0) {
              defaults.set(dow, {
                horaDesde: dia.franjas[0].apertura,
                horaHasta: dia.franjas[dia.franjas.length - 1].cierre,
              });
            }
          }
        });
        setSucursalDefaults(defaults);
        setDiasAbiertos(abiertos.size > 0 ? abiertos : new Set(DIAS.map((d) => d.dow)));

        // Agrupar horariosList por diaSemana
        const byDow = new Map<number, HorarioLaboral[]>();
        horariosList.forEach((h) => {
          const arr = byDow.get(h.diaSemana) ?? [];
          arr.push(h);
          byDow.set(h.diaSemana, arr);
        });

        // Mapa base con defaults; pisar con datos del profesional
        const map = new Map<number, DiaHorario>();
        DIAS.forEach(({ dow }) => {
          map.set(dow, { activo: false, franjas: [defaultFranja(dow, defaults)] });
        });
        byDow.forEach((entries, dow) => {
          map.set(dow, {
            activo: entries.some((e) => e.activo),
            franjas: entries.map((e) => ({ horaDesde: e.horaDesde, horaHasta: e.horaHasta })),
          });
        });
        setHorarios(map);
      })
      .catch(() => setError('No se pudo cargar la disponibilidad.'))
      .finally(() => setLoading(false));
  }, [usuario?.id]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const toggleDia = (dow: number) => {
    setHorarios((prev) => {
      const next = new Map(prev);
      const dia = next.get(dow) ?? { activo: false, franjas: [defaultFranja(dow, sucursalDefaults)] };
      next.set(dow, { ...dia, activo: !dia.activo });
      return next;
    });
  };

  const updateFranja = (dow: number, idx: number, field: keyof Franja, value: string) => {
    setHorarios((prev) => {
      const next = new Map(prev);
      const dia = next.get(dow);
      if (!dia) return prev;
      const franjas = dia.franjas.map((f, i) => (i === idx ? { ...f, [field]: value } : f));
      next.set(dow, { ...dia, franjas });
      return next;
    });
  };

  const addFranja = (dow: number) => {
    setHorarios((prev) => {
      const next = new Map(prev);
      const dia = next.get(dow);
      if (!dia) return prev;
      const last = dia.franjas[dia.franjas.length - 1];
      const nuevaDesde = addMinutes(last.horaHasta, 60);
      const nuevaHasta = addMinutes(nuevaDesde, 60);
      next.set(dow, { ...dia, franjas: [...dia.franjas, { horaDesde: nuevaDesde, horaHasta: nuevaHasta }] });
      return next;
    });
  };

  const removeFranja = (dow: number, idx: number) => {
    setHorarios((prev) => {
      const next = new Map(prev);
      const dia = next.get(dow);
      if (!dia || dia.franjas.length <= 1) return prev;
      next.set(dow, { ...dia, franjas: dia.franjas.filter((_, i) => i !== idx) });
      return next;
    });
  };

  const toggleServicio = (id: string) => {
    setServiciosSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!usuario) return;
    setSaving(true);
    setError(null);
    try {
      // Aplanar: una entrada HorarioLaboral por franja
      const horariosArr: HorarioLaboral[] = [];
      diasAbiertos.forEach((dow) => {
        const dia = horarios.get(dow);
        if (!dia) return;
        dia.franjas.forEach(({ horaDesde, horaHasta }) => {
          horariosArr.push({ diaSemana: dow, horaDesde, horaHasta, activo: dia.activo });
        });
      });

      await Promise.all([
        usuariosApi.setHorarios(usuario.id, horariosArr),
        usuariosApi.setServicios(usuario.id, Array.from(serviciosSeleccionados)),
      ]);
      onSaved();
      onClose();
    } catch {
      setError('Error al guardar. Verificá los datos e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const diasVisibles = DIAS.filter(({ dow }) => diasAbiertos.has(dow));

  // ── Render ──────────────────────────────────────────────────────────────────

  return ReactDOM.createPortal(
    <AnimatePresence>
      {usuario && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-text-primary/20 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-surface shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                <h3 className="font-heading font-bold text-lg text-text-primary">Disponibilidad</h3>
                <p className="text-sm text-text-secondary">{usuario.nombre} {usuario.apellido}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-background rounded-md transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {error && (
                    <div className="p-3 bg-error/10 border border-error/30 rounded-input text-sm text-error">
                      {error}
                    </div>
                  )}

                  {/* ── Servicios ─────────────────────────────────────────── */}
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                      <CheckIcon className="w-4 h-4" />
                      Servicios asignados
                    </h4>
                    <p className="text-xs text-text-muted mb-3">
                      Sin selección = puede realizar todos los servicios.
                    </p>
                    {serviciosDisponibles.length === 0 ? (
                      <p className="text-sm text-text-muted italic">No hay servicios activos.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {serviciosDisponibles.map((s) => {
                          const sel = serviciosSeleccionados.has(s.id);
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => toggleServicio(s.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-input border text-sm text-left transition-all ${
                                sel
                                  ? 'border-primary bg-primary/5 text-primary font-medium'
                                  : 'border-border bg-surface-background text-text-secondary hover:border-primary/40'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                  sel ? 'bg-primary border-primary' : 'border-border'
                                }`}
                              >
                                {sel && <CheckIcon className="w-3 h-3 text-white" />}
                              </div>
                              <span className="flex-1 truncate">{s.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  {/* ── Horario semanal ───────────────────────────────────── */}
                  <section>
                    <h4 className="flex items-center gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
                      <ClockIcon className="w-4 h-4" />
                      Horario semanal
                    </h4>
                    <p className="text-xs text-text-muted mb-3">
                      Sin horarios activos = sin restricción de horario.
                    </p>
                    {diasVisibles.length === 0 ? (
                      <p className="text-sm text-text-muted italic">
                        El local no tiene días configurados en Ajustes.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {diasVisibles.map(({ dow, label }) => {
                          const dia = horarios.get(dow) ?? {
                            activo: false,
                            franjas: [defaultFranja(dow, sucursalDefaults)],
                          };
                          return (
                            <div
                              key={dow}
                              className={`rounded-input border transition-colors ${
                                dia.activo ? 'border-primary/40 bg-primary/5' : 'border-border bg-surface-background'
                              }`}
                            >
                              {/* Fila toggle + nombre */}
                              <div
                                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none"
                                onClick={() => toggleDia(dow)}
                              >
                                <div
                                  className={`relative w-10 h-[22px] rounded-full flex-shrink-0 transition-colors duration-200 ${
                                    dia.activo ? 'bg-primary' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                                      dia.activo ? 'translate-x-[22px]' : 'translate-x-[3px]'
                                    }`}
                                  />
                                </div>
                                <span
                                  className={`text-sm font-medium ${
                                    dia.activo ? 'text-text-primary' : 'text-text-muted'
                                  }`}
                                >
                                  {label}
                                </span>
                                {dia.activo && (
                                  <span className="ml-auto text-xs text-text-secondary">
                                    {dia.franjas.length === 1
                                      ? `${dia.franjas[0].horaDesde} – ${dia.franjas[0].horaHasta}`
                                      : `${dia.franjas.length} franjas`}
                                  </span>
                                )}
                              </div>

                              {/* Franjas horarias (solo cuando activo) */}
                              {dia.activo && (
                                <div
                                  className="px-3 pb-3 space-y-2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {dia.franjas.map((franja, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                      {/* Número de franja */}
                                      <span className="text-xs text-text-muted w-4 flex-shrink-0 text-center">
                                        {idx + 1}
                                      </span>

                                      {/* Desde */}
                                      <input
                                        type="time"
                                        value={franja.horaDesde}
                                        onChange={(e) => updateFranja(dow, idx, 'horaDesde', e.target.value)}
                                        className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                      />

                                      <span className="text-text-muted text-xs flex-shrink-0">–</span>

                                      {/* Hasta */}
                                      <input
                                        type="time"
                                        value={franja.horaHasta}
                                        onChange={(e) => updateFranja(dow, idx, 'horaHasta', e.target.value)}
                                        className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                      />

                                      {/* Eliminar franja (solo si hay más de una) */}
                                      {dia.franjas.length > 1 ? (
                                        <button
                                          type="button"
                                          onClick={() => removeFranja(dow, idx)}
                                          className="p-1 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors flex-shrink-0"
                                          title="Eliminar franja"
                                        >
                                          <Trash2Icon className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        // Placeholder para mantener alineación
                                        <div className="w-6 flex-shrink-0" />
                                      )}
                                    </div>
                                  ))}

                                  {/* Agregar franja */}
                                  <button
                                    type="button"
                                    onClick={() => addFranja(dow)}
                                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium mt-1 ml-6 transition-colors"
                                  >
                                    <PlusIcon className="w-3.5 h-3.5" />
                                    Agregar franja
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <SaveIcon className="w-4 h-4" />
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
