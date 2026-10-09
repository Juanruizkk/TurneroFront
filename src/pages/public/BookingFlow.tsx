import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon,
  SparklesIcon,
} from 'lucide-react';
import { publicoApi } from '../../api/publico';
import { ApiError } from '../../api/client';
import { formatMoneda, formatFechaLarga, formatHora, buildGoogleCalendarUrl } from '../../types';
import type { Servicio, Turno, SlotDisponible, ModalidadPrestacion } from '../../types';

const MODALIDAD_CONFIG: Record<ModalidadPrestacion, { label: string; className: string }> = {
  Presencial:  { label: 'Presencial',  className: 'bg-sky-400/15 text-sky-300 border-sky-400/25' },
  Online:      { label: 'Online',      className: 'bg-violet-400/15 text-violet-300 border-violet-400/25' },
  Domicilio:   { label: 'A domicilio', className: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25' },
  Maquina:     { label: 'Máquina',     className: 'bg-white/10 text-white/50 border-white/15' },
  Tratamiento: { label: 'Tratamiento', className: 'bg-white/10 text-white/50 border-white/15' },
  Otro:        { label: 'Otro',        className: 'bg-white/10 text-white/50 border-white/15' },
};

interface BookingFlowProps {
  onClose?: () => void;
  sucursalId?: string;
  slug?: string;
}

export function BookingFlow(props: BookingFlowProps = {}) {
  const { onClose } = props;
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { sucursalId?: string; slug?: string } | null;
  const SUCURSAL_ID =
    props.sucursalId ??
    locationState?.sucursalId ??
    (import.meta.env.VITE_SUCURSAL_ID as string | undefined);
  const effectiveSlug = props.slug ?? locationState?.slug;
  const [step, setStep] = useState(1);

  // Data state
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loadingServicios, setLoadingServicios] = useState(true);

  // Selection state
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [selectedProfId, setSelectedProfId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');

  // Slots
  const [slots, setSlots] = useState<SlotDisponible[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [filterProfId, setFilterProfId] = useState('');

  // Calendar month navigation
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  // Client data
  const [clientData, setClientData] = useState({ nombre: '', apellido: '', telefono: '', email: '', mensajeCliente: '' });

  // Result
  const [turnoCreado, setTurnoCreado] = useState<Turno | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [diasMaximos, setDiasMaximos] = useState(30);
  const [horariosAbiertos, setHorariosAbiertos] = useState<Record<string, boolean>>({});

  const DAY_NAMES_ES: Record<number, string> = {
    0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miercoles',
    4: 'Jueves', 5: 'Viernes', 6: 'Sabado',
  };

  const isDiaAbierto = (date: Date) => {
    const diaSucursal = Object.keys(horariosAbiertos).length === 0
      || horariosAbiertos[DAY_NAMES_ES[date.getDay()]] !== false;
    const diaServicio = !selectedServicio?.diasDisponibles?.length
      || selectedServicio.diasDisponibles.includes(date.getDay());
    return diaSucursal && diaServicio;
  };

  useEffect(() => {
    const serviciosPromise = effectiveSlug
      ? publicoApi.serviciosBySlug(effectiveSlug)
      : SUCURSAL_ID
        ? publicoApi.serviciosBySucursalId(SUCURSAL_ID)
        : Promise.resolve([] as import('../../types').Servicio[]);

    serviciosPromise
      .then((data) => setServicios(data.filter((s) => s.activo)))
      .catch(() => setServicios([]))
      .finally(() => setLoadingServicios(false));

    const perfilPromise = effectiveSlug
      ? publicoApi.perfilBySlug(effectiveSlug)
      : SUCURSAL_ID
        ? publicoApi.perfil(SUCURSAL_ID)
        : null;

    perfilPromise
      ?.then((p) => {
        setDiasMaximos(p.diasMaximosReservaFutura ?? 30);
        const abiertos: Record<string, boolean> = {};
        for (const [dia, h] of Object.entries(p.horariosAtencion)) {
          abiertos[dia] = (h as { abierto: boolean }).abierto;
        }
        setHorariosAbiertos(abiertos);
      })
      .catch(() => {});
  }, []);

  // Cargar slots cuando cambia fecha o servicio
  useEffect(() => {
    if (!selectedDate || !selectedServicio || !SUCURSAL_ID) {
      setSlots([]);
      return;
    }
    const d = selectedDate;
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setLoadingSlots(true);
    setSelectedTime('');
    setSelectedProfId('');
    setFilterProfId('');
    setSlotsError('');
    const slotsPromise = effectiveSlug
      ? publicoApi.slotsBySlug(effectiveSlug, fecha, selectedServicio.id)
      : publicoApi.slots(SUCURSAL_ID!, fecha, selectedServicio.id);

    slotsPromise
      .then(setSlots)
      .catch((err: unknown) => {
        setSlots([]);
        setSlotsError(err instanceof Error ? err.message : 'Error al cargar los horarios disponibles.');
      })
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedServicio]);

  const categorias = ['Todos', ...Array.from(new Set(servicios.map((s) => s.modalidadPrestacion)))];
  const filteredServicios =
    activeCategory === 'Todos' ? servicios : servicios.filter((s) => s.modalidadPrestacion === activeCategory);

  const totalSteps = 5;

  const nextStep = () => { setErrorMsg(''); setStep((s) => Math.min(s + 1, totalSteps)); };
  const prevStep = () => { setErrorMsg(''); setStep((s) => Math.max(s - 1, 1)); };

  /** Crea el cliente (si no existe) y el turno en una sola llamada al endpoint público. */
  const crearTurno = async () => {
    if (!selectedServicio || !selectedDate || !selectedTime || !SUCURSAL_ID)
      throw new Error('Datos incompletos para crear el turno.');

    // Construir fechaHoraInicio (local, sin conversión UTC)
    const d = selectedDate;
    const fechaHoraInicio = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${selectedTime}:00`;

    const dto = {
      nombre:          clientData.nombre.trim(),
      apellido:        clientData.apellido.trim() || undefined,
      telefono:        clientData.telefono.trim(),
      email:           clientData.email.trim() || undefined,
      servicioId:      selectedServicio.id,
      profesionalId:   selectedProfId,
      fechaHoraInicio,
      observaciones:   clientData.mensajeCliente.trim() || undefined,
    };

    // Usar endpoint público: resuelve cliente y crea turno server-side (sin auth)
    if (effectiveSlug) {
      return publicoApi.reservarBySlug(effectiveSlug, dto);
    }
    return publicoApi.reservar(SUCURSAL_ID, dto);
  };

  const handle409 = () => {
    if (!selectedDate || !selectedServicio) return;
    if (!effectiveSlug && !SUCURSAL_ID) return;
    const d = selectedDate;
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const slotsPromise = effectiveSlug
      ? publicoApi.slotsBySlug(effectiveSlug, fecha, selectedServicio.id)
      : publicoApi.slots(SUCURSAL_ID!, fecha, selectedServicio.id);
    slotsPromise.then(setSlots).catch(() => setSlots([]));
    setSelectedTime('');
    setSelectedProfId('');
    setFilterProfId('');
    setErrorMsg('El horario seleccionado ya no está disponible. Por favor elegí otro turno.');
    setStep(2);
  };

  const handleConfirmar = async () => {
    if (!selectedServicio || !selectedDate || !selectedTime || !clientData.nombre || !clientData.telefono) return;
    if (!SUCURSAL_ID) {
      setErrorMsg('Configuración incompleta: falta el ID de sucursal.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const turno = await crearTurno();
      setTurnoCreado(turno);
      nextStep();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 409) {
        handle409();
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Error al crear el turno.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date();
  const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const maxDate = new Date(todayNorm);
  maxDate.setDate(maxDate.getDate() + diasMaximos);
  const { year, month } = calendarMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCalendarMonth(({ year: y, month: m }) =>
    m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 });
  const nextMonth = () => setCalendarMonth(({ year: y, month: m }) =>
    m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 });

  const canGoPrev = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="min-h-screen flex flex-col font-body bg-black/50 backdrop-blur-md">

      {/* Header glass */}
      <header className="border-b border-white/15 py-4 px-4 sm:px-6 sticky top-0 z-50 bg-black/20">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            onClick={() => {
              if (step === 1) {
                if (onClose) {
                  onClose();
                } else {
                  effectiveSlug ? navigate(`/s/${effectiveSlug}`) : navigate('/');
                }
              } else {
                prevStep();
              }
            }}
            className="p-2 -ml-2 text-white/70 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <div className="font-heading font-bold text-base sm:text-lg text-white flex items-center gap-2">
            <SparklesIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-light" />
            Reserva online
          </div>
          <div className="w-9 sm:w-10" />
        </div>
      </header>

      {/* Progress Bar glass */}
      <div className="border-b border-white/10 bg-black/15">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex justify-between items-center relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-white/15 -z-10 rounded-full" />
            <div
              className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary -z-10 rounded-full transition-all duration-300"
              style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }}
            />
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all z-10 ${
                  step > i + 1
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : step === i + 1
                    ? 'bg-primary text-white ring-4 ring-primary/30 shadow-lg shadow-primary/20'
                    : 'bg-white/10 border border-white/20 text-white/40'
                }`}
              >
                {step > i + 1 ? <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5" /> : i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6 sm:px-6 md:py-10">
        <AnimatePresence mode="wait">

          {/* STEP 1: Servicio */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-1 sm:mb-2">
                Elegí tu servicio
              </h2>
              <p className="text-white/60 mb-5 sm:mb-6 text-sm sm:text-base">
                Seleccioná el tratamiento que deseás realizarte.
              </p>

              {/* Filtro de categorías */}
              <div className="flex gap-2 mb-5 sm:mb-6 overflow-x-auto no-scrollbar pb-1">
                {categorias.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 border ${
                      activeCategory === cat
                        ? 'bg-primary border-primary text-white'
                        : 'bg-white/10 border-white/15 text-white/70 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {loadingServicios ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {filteredServicios.map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => { setSelectedServicio(srv); nextStep(); }}
                      className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-md cursor-pointer transition-all active:scale-[0.99] ${
                        selectedServicio?.id === srv.id
                          ? 'border-primary bg-primary/20 shadow-lg shadow-primary/20'
                          : 'border-white/15 bg-white/10 hover:bg-white/18 hover:border-white/30'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-white leading-tight">{srv.nombre}</h3>
                          {(() => {
                            const cfg = MODALIDAD_CONFIG[srv.modalidadPrestacion];
                            return cfg ? (
                              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap ${cfg.className}`}>
                                {cfg.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <span className="font-bold text-primary-light whitespace-nowrap flex-shrink-0">{formatMoneda(srv.precio)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" /> {srv.duracionClienteMin} min
                        </span>

                      </div>
                      {srv.descripcion && (
                        <p className="text-sm text-white/45 mt-2 line-clamp-2">{srv.descripcion}</p>
                      )}
                    </div>
                  ))}
                  {filteredServicios.length === 0 && (
                    <p className="text-center text-white/45 py-12">No hay servicios disponibles en esta categoría.</p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2: Fecha y Hora */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-1 sm:mb-2">
                Fecha y horario
              </h2>
              <p className="text-white/60 mb-5 sm:mb-6 text-sm sm:text-base">
                Seleccioná cuándo querés venir.
              </p>

              {/* Calendario */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-4 sm:p-6 mb-5 sm:mb-6">
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={prevMonth}
                    disabled={!canGoPrev}
                    className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
                    aria-label="Mes anterior"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                  </button>
                  <h3 className="font-bold text-white flex items-center gap-2 capitalize text-sm sm:text-base">
                    <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-primary-light" />
                    {new Date(year, month, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
                  </h3>
                  <button
                    onClick={nextMonth}
                    className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                    aria-label="Mes siguiente"
                  >
                    <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                  </button>
                </div>

                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-1 text-center text-xs sm:text-sm mb-1">
                  {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((d) => (
                    <div key={d} className="text-white/35 font-medium py-1">{d}</div>
                  ))}
                </div>

                {/* Días del mes */}
                <div className="grid grid-cols-7 gap-0.5 sm:gap-1 text-center text-xs sm:text-sm">
                  {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(year, month, day);
                    const isPast = date < todayNorm;
                    const isBeyondMax = date > maxDate;
                    const isClosed = !isDiaAbierto(date);
                    const disabled = isPast || isBeyondMax || isClosed;
                    const isSelected =
                      selectedDate?.getFullYear() === year &&
                      selectedDate?.getMonth() === month &&
                      selectedDate?.getDate() === day;
                    return (
                      <button
                        key={day}
                        disabled={disabled}
                        onClick={() => setSelectedDate(date)}
                        className={`aspect-square rounded-full flex items-center justify-center transition-colors font-medium touch-manipulation ${
                          disabled
                            ? 'text-white/20 cursor-not-allowed'
                            : isSelected
                            ? 'bg-primary text-white font-bold shadow-md shadow-primary/30'
                            : 'text-white/80 hover:bg-white/15 active:bg-white/25'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slots disponibles */}
              {selectedDate && (
                <>
                  <h3 className="font-bold text-white mb-3 sm:mb-4 text-sm sm:text-base capitalize">
                    Horarios para el {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </h3>

                  {loadingSlots ? (
                    <div className="flex justify-center py-8">
                      <div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : slotsError ? (
                    <p className="text-center text-sm text-red-300 bg-red-500/15 border border-red-400/25 rounded-lg px-4 py-6">
                      {slotsError}
                    </p>
                  ) : slots.length === 0 ? (
                    <p className="text-center text-white/45 py-8 bg-white/10 rounded-xl border border-white/15 text-sm">
                      No hay turnos disponibles para este día.
                    </p>
                  ) : (() => {
                    const profMap = new Map<string, string>();
                    slots.forEach((s) => {
                      if (s.profesionalId && s.profesionalNombre && !profMap.has(s.profesionalId))
                        profMap.set(s.profesionalId, s.profesionalNombre);
                    });
                    const profList = Array.from(profMap.entries());
                    const showProfFilter = profList.length > 1;

                    const visibleSlots = filterProfId
                      ? slots.filter((s) => s.profesionalId === filterProfId)
                      : slots.filter((s, idx, arr) => arr.findIndex((x) => x.hora === s.hora) === idx);

                    return (
                      <>
                        {showProfFilter && (
                          <div className="mb-4">
                            <p className="text-sm text-white/60 mb-2">Elegí un profesional (opcional):</p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => { setFilterProfId(''); setSelectedTime(''); setSelectedProfId(''); }}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                  filterProfId === ''
                                    ? 'bg-primary border-primary text-white'
                                    : 'bg-white/10 border-white/15 text-white/70 hover:bg-white/20'
                                }`}
                              >
                                Cualquiera
                              </button>
                              {profList.map(([id, nombre]) => (
                                <button
                                  key={id}
                                  onClick={() => { setFilterProfId(id); setSelectedTime(''); setSelectedProfId(''); }}
                                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                    filterProfId === id
                                      ? 'bg-primary border-primary text-white'
                                      : 'bg-white/10 border-white/15 text-white/70 hover:bg-white/20'
                                  }`}
                                >
                                  {nombre}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {errorMsg && (
                          <p className="mb-4 text-sm text-red-300 bg-red-500/15 border border-red-400/25 rounded-lg px-4 py-3">{errorMsg}</p>
                        )}
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                          {visibleSlots.map((slot) => {
                            const isSelected = selectedTime === slot.hora && selectedProfId === slot.profesionalId;
                            const showProf = !filterProfId && slot.profesionalNombre;
                            return (
                              <button
                                key={`${slot.profesionalId}-${slot.hora}`}
                                onClick={() => { setSelectedTime(slot.hora); setSelectedProfId(slot.profesionalId); setErrorMsg(''); }}
                                className={`py-3 px-2 rounded-xl border font-medium transition-all flex flex-col items-center gap-0.5 touch-manipulation active:scale-95 ${
                                  isSelected
                                    ? 'border-primary bg-primary text-white shadow-lg shadow-primary/30'
                                    : 'border-white/15 bg-white/10 text-white/80 hover:bg-white/20 hover:border-white/30'
                                }`}
                              >
                                <span className="text-sm">{slot.hora}</span>
                                {showProf && (
                                  <span className={`text-[9px] font-normal truncate max-w-full leading-none ${isSelected ? 'text-white/75' : 'text-white/40'}`}>
                                    {slot.profesionalNombre.split(' ')[0]}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </>
              )}

              <div className="mt-8 flex">
                <button
                  disabled={!selectedTime || !selectedDate}
                  onClick={nextStep}
                  className="w-full sm:w-auto sm:ml-auto bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3.5 sm:py-3 rounded-button font-medium transition-colors shadow-lg shadow-primary/25"
                >
                  Continuar
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Datos del cliente */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-white mb-1 sm:mb-2">
                Tus datos
              </h2>
              <p className="text-white/60 mb-5 sm:mb-6 text-sm sm:text-base">
                Completá tu información para confirmar la reserva. No necesitás crear cuenta.
              </p>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-4 sm:p-6 space-y-4 sm:space-y-5">
                {[
                  { key: 'nombre',   label: 'Nombre',              type: 'text',  placeholder: 'María',                        required: true,  maxLength: 100 },
                  { key: 'apellido', label: 'Apellido',            type: 'text',  placeholder: 'López',                        required: false, maxLength: 100 },
                  { key: 'telefono', label: 'Teléfono (WhatsApp)', type: 'tel',   placeholder: '11 4567 8901',                 required: true,  maxLength: 15  },
                  { key: 'email',    label: 'Email (Opcional)',    type: 'email', placeholder: 'Para enviarte el comprobante', required: false, maxLength: 100 },
                ].map(({ key, label, type, placeholder, required, maxLength }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-white/80 mb-1.5">
                      {label} {required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={type}
                      value={clientData[key as keyof typeof clientData]}
                      onChange={(e) => {
                        const val = key === 'telefono'
                          ? e.target.value.replace(/[^0-9\s\-\+\(\)]/g, '')
                          : e.target.value;
                        setClientData({ ...clientData, [key]: val });
                      }}
                      maxLength={maxLength}
                      className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all text-base"
                      placeholder={placeholder}
                      autoComplete={key === 'telefono' ? 'tel' : key === 'email' ? 'email' : 'off'}
                    />
                  </div>
                ))}

                {selectedServicio?.modalidadPrestacion === 'Domicilio' && (
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-1.5">
                      Dirección o indicaciones para llegar <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={clientData.mensajeCliente}
                      onChange={(e) => setClientData({ ...clientData, mensajeCliente: e.target.value })}
                      maxLength={500}
                      rows={3}
                      placeholder="Ej: Av. Corrientes 1234, 3° piso, depto B. Timbre apellido García."
                      className="w-full px-4 py-3 rounded-xl border border-white/20 bg-white/10 text-white placeholder-white/35 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all text-base resize-none"
                    />
                  </div>
                )}
              </div>

              {errorMsg && (
                <p className="mt-4 text-sm text-red-300 bg-red-500/15 border border-red-400/25 rounded-lg px-4 py-3">{errorMsg}</p>
              )}

              <div className="mt-6 sm:mt-8 flex">
                <button
                  disabled={!clientData.nombre || !clientData.telefono || submitting ||
                    (selectedServicio?.modalidadPrestacion === 'Domicilio' && !clientData.mensajeCliente.trim())}
                  onClick={handleConfirmar}
                  className="w-full sm:w-auto sm:ml-auto bg-primary hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed text-white px-8 py-3.5 sm:py-3 rounded-button font-medium transition-colors shadow-lg shadow-primary/25"
                >
                  {submitting ? 'Procesando...' : 'Confirmar turno'}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP FINAL: Confirmación */}
          {(step === 4 || (step === totalSteps && turnoCreado)) && (
            <motion.div
              key="confirmacion"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 sm:py-10"
            >
              {turnoCreado?.estado === 'Pendiente' ? (
                <>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-amber-400/15 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 border border-amber-400/25">
                    <ClockIcon className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">¡Solicitud enviada!</h2>
                  <p className="text-white/65 mb-6 sm:mb-8 text-base sm:text-lg">
                    Gracias, {clientData.nombre}. Te avisaremos cuando el equipo confirme tu turno.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-400/15 text-green-400 rounded-full flex items-center justify-center mx-auto mb-5 sm:mb-6 border border-green-400/25">
                    <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-2">¡Turno confirmado!</h2>
                  <p className="text-white/65 mb-6 sm:mb-8 text-base sm:text-lg">
                    Te esperamos, {clientData.nombre}.
                  </p>
                </>
              )}

              {turnoCreado && (
                <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-5 sm:p-6 text-left max-w-md mx-auto mb-6 sm:mb-8">
                  <h3 className="font-bold text-white border-b border-white/15 pb-3 mb-4 text-sm sm:text-base">
                    {turnoCreado.estado === 'Pendiente' ? 'Detalle de tu solicitud' : 'Resumen de tu reserva'}
                  </h3>
                  <ul className="space-y-3 sm:space-y-4 text-sm">
                    <li className="flex justify-between gap-4">
                      <span className="text-white/50 flex-shrink-0">Servicio</span>
                      <span className="font-medium text-white text-right">{turnoCreado.servicioNombre}</span>
                    </li>
                    <li className="flex justify-between gap-4">
                      <span className="text-white/50 flex-shrink-0">Profesional</span>
                      <span className="font-medium text-white text-right">{turnoCreado.profesionalNombre}</span>
                    </li>
                    <li className="flex justify-between gap-4">
                      <span className="text-white/50 flex-shrink-0">Fecha y hora</span>
                      <span className="font-medium text-white text-right">
                        {formatFechaLarga(turnoCreado.fechaHoraInicio)}, {formatHora(turnoCreado.fechaHoraInicio)}
                      </span>
                    </li>
                    <li className="flex justify-between gap-4 border-t border-white/15 pt-3">
                      <span className="text-white/50 flex-shrink-0">ID de turno</span>
                      <span className="font-mono text-xs text-white/40">{turnoCreado.id.slice(0, 8).toUpperCase()}</span>
                    </li>
                  </ul>
                </div>
              )}

              <div className="max-w-md mx-auto space-y-3">
                {turnoCreado && (
                  <a
                    href={buildGoogleCalendarUrl(turnoCreado)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 border border-white/20 bg-white/10 hover:bg-white/18 text-white px-6 py-3.5 rounded-button font-medium transition-colors"
                  >
                    <CalendarIcon className="w-4 h-4 flex-shrink-0" />
                    Agregar a Google Calendar
                  </a>
                )}
                <button
                  onClick={() => onClose ? onClose() : navigate('/')}
                  className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-button font-medium transition-colors shadow-lg shadow-primary/25"
                >
                  {onClose ? 'Cerrar' : 'Volver al inicio'}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
