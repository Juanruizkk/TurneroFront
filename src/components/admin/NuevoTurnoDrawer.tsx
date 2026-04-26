import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon, SearchIcon, UserPlusIcon, AlertCircleIcon, ArrowLeftIcon } from 'lucide-react';
import { turnosApi } from '../../api/turnos';
import { serviciosApi } from '../../api/servicios';
import { clientesApi } from '../../api/clientes';
import { usuariosApi } from '../../api/usuarios';
import { publicoApi } from '../../api/publico';
import { ajustesApi } from '../../api/ajustes';
import { useAuth } from '../../contexts/AuthContext';
import type { Servicio, Cliente, Usuario, Turno, OrigenTurno, SlotDisponible } from '../../types';


const DAY_NAMES_ES: Record<number, string> = {
  0: 'Domingo', 1: 'Lunes', 2: 'Martes', 3: 'Miercoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sabado',
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreado: (turno: Turno) => void;
  defaultDate?: Date;
}

export function NuevoTurnoDrawer({ open, onClose, onCreado, defaultDate }: Props) {
  const { user } = useAuth();
  const sucursalId = user?.sucursalId ?? '';

  // ── Data lists ──────────────────────────────────────────────────────────────
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [profesionales, setProfesionales] = useState<Usuario[]>([]);

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [profesionalId, setProfesionalId] = useState('');
  const [servicioId, setServicioId] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(defaultDate ?? null);
  const [hora, setHora] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // ── Calendar ─────────────────────────────────────────────────────────────────
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = defaultDate ?? new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [horariosAbiertos, setHorariosAbiertos] = useState<Record<string, boolean>>({});
  const [diasMaxFutura, setDiasMaxFutura] = useState<number | null>(null);
  const [slug, setSlug] = useState('');

  // ── Slots ────────────────────────────────────────────────────────────────────
  const [slots, setSlots] = useState<SlotDisponible[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // ── Client search ────────────────────────────────────────────────────────────
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<Cliente[]>([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [mostrarFormNuevo, setMostrarFormNuevo] = useState(false);
  const [buscadoSinResultados, setBuscadoSinResultados] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoApellido, setNuevoApellido] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');

  // ── Submit state ─────────────────────────────────────────────────────────────
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Load data when drawer opens ──────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;

    const initDate = defaultDate ?? new Date();
    setSelectedDate(initDate);
    setCalendarMonth({ year: initDate.getFullYear(), month: initDate.getMonth() });
    setErrorMsg(null);
    setHora('');
    setSlots([]);
    setHorariosAbiertos({});
    setDiasMaxFutura(null);
    setSlug('');

    serviciosApi.listar(sucursalId).then((data) => setServicios(data.filter((s) => s.activo)));
    usuariosApi.listar(sucursalId).then((data) =>
      setProfesionales(data.filter((u) =>
        (u.rol === 'Profesional' || u.rol === 'Administrativo') && u.estado === 'Activo'
      ))
    );

    if (sucursalId) {
      ajustesApi.obtener(sucursalId)
        .then((ajustes) => {
          const abiertos: Record<string, boolean> = {};
          for (const [dia, h] of Object.entries(ajustes.horariosAtencion)) {
            abiertos[dia] = (h as { abierto: boolean }).abierto;
          }
          setHorariosAbiertos(abiertos);
          setDiasMaxFutura(ajustes.diasMaximosReservaFutura);
        })
        .catch(() => {});

      ajustesApi.obtenerSlug(sucursalId)
        .then((data) => setSlug(data.slug))
        .catch(() => {});
    }

    if (user?.rol === 'Profesional' && user.userId) {
      setProfesionalId(user.userId);
    } else {
      setProfesionalId('');
    }

    setServicioId('');
    setObservaciones('');
    setBusqueda('');
    setResultados([]);
    setClienteSeleccionado(null);
    setMostrarFormNuevo(false);
    setBuscadoSinResultados(false);
    setNuevoNombre('');
    setNuevoApellido('');
    setNuevoTelefono('');
    setNuevoEmail('');
  }, [open]);

  // ── Fetch slots when date + service + slug change ────────────────────────────
  useEffect(() => {
    if (!selectedDate || !servicioId || !slug) {
      setSlots([]);
      return;
    }
    const d = selectedDate;
    const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setLoadingSlots(true);
    setHora('');
    publicoApi
      .slotsBySlug(slug, fechaStr, servicioId)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, servicioId, slug]);

  // ── Calendar helpers ──────────────────────────────────────────────────────────
  const { year, month } = calendarMonth;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const isDiaAbierto = (date: Date) => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    if (d < hoy) return false;
    if (diasMaxFutura !== null && diasMaxFutura > 0) {
      const maxFecha = new Date(hoy.getTime() + diasMaxFutura * 24 * 60 * 60 * 1000);
      if (d > maxFecha) return false;
    }
    if (Object.keys(horariosAbiertos).length === 0) return true; // mientras carga, no bloquear
    const nombre = DAY_NAMES_ES[date.getDay()];
    return horariosAbiertos[nombre] !== false;
  };

  const prevMonth = () => setCalendarMonth(({ year: y, month: m }) =>
    m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 });
  const nextMonth = () => setCalendarMonth(({ year: y, month: m }) =>
    m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 });

  // ── Slots filtrados por profesional seleccionado ──────────────────────────────
  const slotsVisibles = profesionalId
    ? slots.filter((s) => s.profesionalId === profesionalId)
    : slots.filter((s, i, arr) => arr.findIndex((x) => x.hora === s.hora) === i);

  // ── Client search: debounced ──────────────────────────────────────────────────
  useEffect(() => {
    const q = busqueda.trim();
    if (q.length < 2) {
      setResultados([]);
      setBuscadoSinResultados(false);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscandoCliente(true);
      try {
        const data = await clientesApi.buscar(sucursalId, q);
        setResultados(data);
        setBuscadoSinResultados(data.length === 0);
      } catch {
        setResultados([]);
        setBuscadoSinResultados(true);
      } finally {
        setBuscandoCliente(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [busqueda]);

  const seleccionarCliente = (c: Cliente) => {
    setClienteSeleccionado(c);
    setBusqueda('');
    setResultados([]);
    setBuscadoSinResultados(false);
    setMostrarFormNuevo(false);
  };

  const abrirFormNuevo = () => {
    // Pre-fill form fields from the search query
    const q = busqueda.trim();
    if (q.includes('@')) {
      setNuevoEmail(q);
    } else if (/^[+\d\s()-]{4,}$/.test(q)) {
      setNuevoTelefono(q);
    } else {
      const partes = q.split(' ');
      setNuevoNombre(partes[0] ?? '');
      setNuevoApellido(partes.slice(1).join(' '));
    }
    setMostrarFormNuevo(true);
    setResultados([]);
    setBuscadoSinResultados(false);
  };

  // ── Origen ───────────────────────────────────────────────────────────────────
  function getOrigen(): OrigenTurno {
    if (!user) return 'Administrativo';
    if (user.esSuperAdmin || user.esOwner || user.rol === 'Administrativo') return 'Administrativo';
    if (user.rol === 'Profesional') return 'Profesional';
    if (user.rol === 'Caja') return 'Caja';
    return 'Administrativo';
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!servicioId || !profesionalId) {
      setErrorMsg('Seleccioná un servicio y un profesional.');
      return;
    }
    if (!selectedDate || !hora) {
      setErrorMsg('Seleccioná una fecha y un horario.');
      return;
    }

    setGuardando(true);
    try {
      let clienteId: string;

      if (clienteSeleccionado) {
        clienteId = clienteSeleccionado.id;
      } else if (mostrarFormNuevo) {
        if (!nuevoNombre.trim()) {
          setErrorMsg('Ingresá el nombre del cliente.');
          setGuardando(false);
          return;
        }
        const nuevo = await clientesApi.crear({
          sucursalId: sucursalId,
          nombre: nuevoNombre.trim(),
          apellido: nuevoApellido.trim(),
          telefono: nuevoTelefono.trim(),
          email: nuevoEmail.trim() || undefined,
        });
        clienteId = nuevo.id;
      } else {
        setErrorMsg('Buscá o seleccioná un cliente primero.');
        setGuardando(false);
        return;
      }

      const d = selectedDate;
      const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const fechaHoraInicio = `${fechaStr}T${hora}:00`;

      const turno = await turnosApi.crear({
        sucursalId: sucursalId,
        clienteId,
        servicioId,
        profesionalId,
        fechaHoraInicio,
        origen: getOrigen(),
        observaciones: observaciones.trim() || undefined,
      });

      onCreado(turno);
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      const msg = err instanceof Error ? err.message : '';
      if (status === 409) {
        setErrorMsg('El profesional ya tiene un turno en ese horario. Elegí otro horario.');
      } else if (status === 400 && msg) {
        setErrorMsg(msg);
      } else {
        setErrorMsg('No se pudo crear el turno. Revisá los datos e intentá de nuevo.');
      }
    } finally {
      setGuardando(false);
    }
  };

  const esProfesionalFijo = user?.rol === 'Profesional';

  return ReactDOM.createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-text-primary/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer panel */}
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative w-full max-w-lg bg-surface h-full shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-heading font-bold text-text-primary text-lg">Nuevo turno</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-md hover:bg-surface-background text-text-secondary transition-colors"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

              {/* Profesional */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Profesional
                </label>
                <select
                  value={profesionalId}
                  onChange={(e) => { setProfesionalId(e.target.value); setHora(''); }}
                  disabled={esProfesionalFijo}
                  required
                  className="w-full px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <option value="">Seleccioná un profesional…</option>
                  {profesionales.map((p) => (
                    <option key={p.id} value={p.usuarioId}>
                      {p.nombre} {p.apellido}
                    </option>
                  ))}
                </select>
              </div>

              {/* Servicio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Servicio
                </label>
                <select
                  value={servicioId}
                  onChange={(e) => { setServicioId(e.target.value); setHora(''); }}
                  required
                  className="w-full px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="">Seleccioná un servicio…</option>
                  {servicios.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} ({s.duracionAgendaMin} min — ${s.precio.toLocaleString('es-AR')})
                    </option>
                  ))}
                </select>
              </div>

              {/* Calendario */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Fecha
                </label>
                <div className="border border-border rounded-lg p-3 bg-surface-background">
                  {/* Month nav */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="p-1 rounded hover:bg-border text-text-secondary transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-semibold text-text-primary capitalize">
                      {new Date(year, month, 1).toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="p-1 rounded hover:bg-border text-text-secondary transition-colors"
                    >
                      <ArrowLeftIcon className="w-4 h-4 rotate-180" />
                    </button>
                  </div>

                  {/* Day headers */}
                  <div className="grid grid-cols-7 text-center mb-1">
                    {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map((d) => (
                      <div key={d} className="text-[10px] font-medium text-text-muted py-1">{d}</div>
                    ))}
                  </div>

                  {/* Day cells */}
                  <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                    {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                      <div key={`e-${i}`} />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const date = new Date(year, month, day);
                      const abierto = isDiaAbierto(date);
                      const isSelected =
                        selectedDate?.getFullYear() === year &&
                        selectedDate?.getMonth() === month &&
                        selectedDate?.getDate() === day;

                      return (
                        <button
                          key={day}
                          type="button"
                          disabled={!abierto}
                          onClick={() => { setSelectedDate(date); setHora(''); }}
                          className={`mx-auto w-8 h-8 rounded-full flex items-center justify-center text-xs transition-colors ${
                            !abierto
                              ? 'text-text-muted/30 cursor-not-allowed'
                              : isSelected
                              ? 'bg-primary text-white font-bold shadow-sm'
                              : 'text-text-primary hover:bg-primary/10'
                          }`}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Leyenda días cerrados */}
                {Object.keys(horariosAbiertos).length > 0 && (
                  <p className="text-[11px] text-text-muted">
                    Los días atenuados no tienen atención configurada.
                  </p>
                )}
              </div>

              {/* Slots */}
              {selectedDate && servicioId && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                    Horario disponible
                    <span className="ml-1 font-normal normal-case text-text-muted">
                      — {selectedDate.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </span>
                  </label>

                  {loadingSlots ? (
                    <div className="flex justify-center py-4">
                      <span className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : slotsVisibles.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-3 bg-surface-background border border-border rounded-lg">
                      Sin turnos disponibles para este día.
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {slotsVisibles.map((slot) => {
                        const isSelected = hora === slot.hora;
                        return (
                          <button
                            key={`${slot.profesionalId}-${slot.hora}`}
                            type="button"
                            onClick={() => setHora(slot.hora)}
                            className={`py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                              isSelected
                                ? 'border-primary bg-primary text-white shadow-sm'
                                : 'border-border bg-surface text-text-primary hover:border-primary/50'
                            }`}
                          >
                            {slot.hora}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Cliente */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Cliente
                </label>

                {/* Cliente seleccionado */}
                {clienteSeleccionado ? (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-button bg-success/10 border border-success/30">
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {clienteSeleccionado.nombre} {clienteSeleccionado.apellido}
                      </span>
                      <span className="text-xs text-text-muted truncate">
                        {[clienteSeleccionado.telefono, clienteSeleccionado.email].filter(Boolean).join(' · ')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClienteSeleccionado(null)}
                      className="ml-2 text-text-muted hover:text-text-secondary flex-shrink-0"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Search input */}
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                      {buscandoCliente && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                      <input
                        type="text"
                        placeholder="Nombre, teléfono o email…"
                        value={busqueda}
                        onChange={(e) => {
                          setBusqueda(e.target.value);
                          setMostrarFormNuevo(false);
                          setBuscadoSinResultados(false);
                        }}
                        className="w-full pl-9 pr-4 py-2 rounded-button border border-border bg-surface text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>

                    {/* Results dropdown */}
                    {resultados.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden shadow-sm">
                        {resultados.map((c, i) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => seleccionarCliente(c)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-primary/5 transition-colors ${
                              i > 0 ? 'border-t border-border' : ''
                            }`}
                          >
                            <div className="w-7 h-7 rounded-full bg-primary/15 text-primary font-bold text-xs flex items-center justify-center flex-shrink-0">
                              {(c.nombre?.[0] ?? '?').toUpperCase()}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-medium text-text-primary truncate">
                                {c.nombre} {c.apellido}
                              </span>
                              <span className="text-xs text-text-muted truncate">
                                {[c.telefono, c.email].filter(Boolean).join(' · ')}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* No results → offer to create */}
                    {buscadoSinResultados && !mostrarFormNuevo && (
                      <div className="flex items-center justify-between px-3 py-2.5 rounded-button bg-surface-background border border-border">
                        <span className="text-sm text-text-muted">Sin resultados para "{busqueda.trim()}"</span>
                        <button
                          type="button"
                          onClick={abrirFormNuevo}
                          className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-dark transition-colors flex-shrink-0 ml-3"
                        >
                          <UserPlusIcon className="w-4 h-4" />
                          Dar de alta
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* New client form */}
                {mostrarFormNuevo && (
                  <div className="flex flex-col gap-2.5 p-3 rounded-lg bg-surface-background border border-border">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        <UserPlusIcon className="w-3.5 h-3.5" />
                        Nuevo cliente
                      </span>
                      <button
                        type="button"
                        onClick={() => { setMostrarFormNuevo(false); setBuscadoSinResultados(false); setBusqueda(''); }}
                        className="text-text-muted hover:text-text-secondary"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Nombre *"
                        value={nuevoNombre}
                        onChange={(e) => setNuevoNombre(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      <input
                        type="text"
                        placeholder="Apellido"
                        value={nuevoApellido}
                        onChange={(e) => setNuevoApellido(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-sm
                          focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                    </div>
                    <input
                      type="tel"
                      placeholder="Teléfono"
                      value={nuevoTelefono}
                      onChange={(e) => setNuevoTelefono(e.target.value.replace(/[^0-9\s\-\+\(\)]/g, ''))}
                      maxLength={15}
                      className="w-full px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                    <input
                      type="email"
                      placeholder="Email (opcional)"
                      value={nuevoEmail}
                      onChange={(e) => setNuevoEmail(e.target.value)}
                      maxLength={100}
                      className="w-full px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-sm
                        focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                )}
              </div>

              {/* Observaciones */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  Observaciones <span className="font-normal normal-case text-text-muted">(opcional)</span>
                </label>
                <textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Notas internas sobre el turno…"
                  className="w-full px-3 py-2 rounded-button border border-border bg-surface text-text-primary text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                />
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-button bg-error/10 border border-error/30">
                  <AlertCircleIcon className="w-4 h-4 text-error shrink-0 mt-0.5" />
                  <span className="text-sm text-error">{errorMsg}</span>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-button hover:bg-surface-background transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                onClick={handleSubmit}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark
                  rounded-button transition-colors disabled:opacity-60"
              >
                {guardando && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Crear turno
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
