import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BuildingIcon, MapPinIcon, ClockIcon, SettingsIcon, TagIcon,
  UsersIcon, CreditCardIcon, ChevronLeftIcon, ChevronRightIcon,
  XIcon, CheckIcon, CheckCircle2Icon, PlusIcon, Loader2Icon,
  BookOpenIcon, PhoneIcon, MailIcon, AlertTriangleIcon, SparklesIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ajustesApi } from '../../api/ajustes';
import { serviciosApi } from '../../api/servicios';
import { usuariosApi } from '../../api/usuarios';
import { ConectarMercadoPagoButton } from '../../components/admin/ConectarMercadoPagoButton';
import type {
  AjustesSucursal, DiaSemana, ModoConfirmacionTurnos,
  CrearServicioDto, Servicio, RolUsuario, ModalidadPrestacion,
} from '../../types';
import { DIAS_SEMANA, DIAS_LABELS, RUBROS_DISPONIBLES, MONEDAS } from '../../types';

// ─── Defaults ─────────────────────────────────────────────────────────────────

const defaultHorarios = () =>
  Object.fromEntries(
    DIAS_SEMANA.map((d) => [
      d,
      {
        abierto: d !== 'Domingo',
        franjas:
          d === 'Domingo'
            ? []
            : d === 'Sabado'
            ? [{ apertura: '09:00', cierre: '13:00' }]
            : [
                { apertura: '09:00', cierre: '13:00' },
                { apertura: '15:00', cierre: '19:00' },
              ],
      },
    ])
  ) as AjustesSucursal['horariosAtencion'];

const defaultForm = (): AjustesSucursal => ({
  nombre: '',
  slogan: '',
  fotoUrl: '',
  rubros: [],
  moneda: 'ARS',
  direccion: '',
  googleMapsUrl: '',
  telefono: '',
  email: '',
  horariosAtencion: defaultHorarios(),
  minutosAnticipacionMinimaReserva: 60,
  diasMaximosReservaFutura: 30,
  minutosBufferEntreTurnos: 0,
  permiteCancelacionCliente: true,
  horasMinimasCancelacion: 24,
  enviaRecordatorioEmail: false,
  enviaRecordatorioWhatsapp: false,
  modoConfirmacionTurnos: 'Automatico' as const,
  mensajeWhatsApp24h: 'Hola {{ClienteNombre}}! Te recordamos tu turno de {{Servicio}} mañana {{Fecha}} a las {{Hora}}. ¡Te esperamos!',
  mensajeWhatsApp3h: 'Hola {{ClienteNombre}}! Tu turno de {{Servicio}} es hoy a las {{Hora}}. ¡Te esperamos pronto!',
});

// ─── Steps definition ─────────────────────────────────────────────────────────

const STEPS = [
  { id: 'perfil',    title: 'Perfil',    icon: BuildingIcon,    optional: false },
  { id: 'contacto',  title: 'Contacto',  icon: MapPinIcon,      optional: false },
  { id: 'horarios',  title: 'Horarios',  icon: ClockIcon,       optional: false },
  { id: 'reservas',  title: 'Reservas',  icon: SettingsIcon,    optional: false },
  { id: 'servicios', title: 'Servicios', icon: TagIcon,         optional: false },
  { id: 'equipo',    title: 'Equipo',    icon: UsersIcon,       optional: true  },
  { id: 'pagos',     title: 'Pagos',     icon: CreditCardIcon,  optional: true  },
];

// ─── Small shared UI ──────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-400';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
        checked ? 'bg-primary' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const sucursalId = user?.sucursalId ?? '';

  const [step, setStep]             = useState(0);
  const [form, setForm]             = useState<AjustesSucursal>(defaultForm());
  const [loaded, setLoaded]         = useState(false);
  const [saving, setSaving]         = useState(false);
  const [saveError, setSaveError]   = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [anticUnidad, setAnticUnidad] = useState<'minutos' | 'horas'>('minutos');

  // Services
  const [createdServices, setCreatedServices] = useState<Servicio[]>([]);
  const [newSvc, setNewSvc] = useState({
    nombre: '', precio: 0, duracionAgendaMin: 30, modalidadPrestacion: 'Presencial' as ModalidadPrestacion,
  });
  const [addingSvc, setAddingSvc]   = useState(false);
  const [svcError, setSvcError]     = useState('');

  // Team
  const [createdUsers, setCreatedUsers] = useState<string[]>([]); // emails
  const [newUser, setNewUser] = useState({
    nombre: '', apellido: '', email: '', telefono: '', rol: 'Profesional' as RolUsuario,
  });
  const [addingUser, setAddingUser] = useState(false);
  const [userError, setUserError]   = useState('');

  // MP
  const [mpConectado, setMpConectado] = useState(false);

  // ── Load existing ajustes ──────────────────────────────────────────────────
  useEffect(() => {
    if (!sucursalId) return;
    ajustesApi
      .obtener(sucursalId)
      .then((data) => {
        setForm({
          ...data,
          horariosAtencion:
            data.horariosAtencion && Object.keys(data.horariosAtencion).length > 0
              ? data.horariosAtencion
              : defaultHorarios(),
        });
        const m = data.minutosAnticipacionMinimaReserva;
        setAnticUnidad(m >= 60 && m % 60 === 0 ? 'horas' : 'minutos');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [sucursalId]);

  // ── Form helpers ──────────────────────────────────────────────────────────
  const set = useCallback(<K extends keyof AjustesSucursal>(key: K, val: AjustesSucursal[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  }, []);

  const toggleRubro = (rubro: string) =>
    setForm((f) => ({
      ...f,
      rubros: f.rubros.includes(rubro) ? f.rubros.filter((r) => r !== rubro) : [...f.rubros, rubro],
    }));

  const setHorarioAbierto = (dia: DiaSemana, abierto: boolean) =>
    setForm((f) => ({
      ...f,
      horariosAtencion: {
        ...f.horariosAtencion,
        [dia]: {
          ...f.horariosAtencion[dia],
          abierto,
          franjas:
            abierto && !f.horariosAtencion[dia]?.franjas?.length
              ? [{ apertura: '09:00', cierre: '13:00' }]
              : f.horariosAtencion[dia]?.franjas ?? [],
        },
      },
    }));

  const setFranja = (dia: DiaSemana, idx: number, field: 'apertura' | 'cierre', value: string) =>
    setForm((f) => {
      const franjas = [...(f.horariosAtencion[dia]?.franjas ?? [])];
      franjas[idx] = { ...franjas[idx], [field]: value };
      return { ...f, horariosAtencion: { ...f.horariosAtencion, [dia]: { ...f.horariosAtencion[dia], franjas } } };
    });

  const addFranja = (dia: DiaSemana) =>
    setForm((f) => {
      const franjas = [...(f.horariosAtencion[dia]?.franjas ?? []), { apertura: '15:00', cierre: '19:00' }];
      return { ...f, horariosAtencion: { ...f.horariosAtencion, [dia]: { ...f.horariosAtencion[dia], franjas } } };
    });

  const removeFranja = (dia: DiaSemana, idx: number) =>
    setForm((f) => {
      const franjas = (f.horariosAtencion[dia]?.franjas ?? []).filter((_, i) => i !== idx);
      return { ...f, horariosAtencion: { ...f.horariosAtencion, [dia]: { ...f.horariosAtencion[dia], franjas } } };
    });

  // ── Service creation ──────────────────────────────────────────────────────
  const handleAddService = async () => {
    if (!newSvc.nombre.trim()) { setSvcError('El nombre es obligatorio.'); return; }
    setSvcError('');
    setAddingSvc(true);
    try {
      const dto: CrearServicioDto = {
        sucursalId,
        nombre:              newSvc.nombre.trim(),
        descripcion:         '',
        aclaraciones:        '',
        precio:              newSvc.precio,
        duracionClienteMin:  newSvc.duracionAgendaMin,
        duracionAgendaMin:   newSvc.duracionAgendaMin,
        requiereSena:        false,
        tipoSena:            null,
        valorSena:           null,
        modalidadPrestacion: newSvc.modalidadPrestacion,
        tipoServicio:        'Regular',
        diasDisponibles:     [],
      };
      const svc = await serviciosApi.crear(dto);
      setCreatedServices((prev) => [...prev, svc]);
      setNewSvc({ nombre: '', precio: 0, duracionAgendaMin: 30, modalidadPrestacion: 'Presencial' });
    } catch {
      setSvcError('No se pudo crear el servicio. Revisá los datos.');
    } finally {
      setAddingSvc(false);
    }
  };

  // ── User invitation ────────────────────────────────────────────────────────
  const handleInvite = async () => {
    if (!newUser.nombre || !newUser.apellido || !newUser.email || !newUser.telefono) {
      setUserError('Completá todos los campos.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser.email.trim())) {
      setUserError('El email no es válido.'); return;
    }
    setUserError('');
    setAddingUser(true);
    try {
      await usuariosApi.crear({ sucursalId, ...newUser, permisos: [] });
      setCreatedUsers((prev) => [...prev, newUser.email]);
      setNewUser({ nombre: '', apellido: '', email: '', telefono: '', rol: 'Profesional' });
    } catch (err) {
      setUserError(err instanceof Error ? err.message : 'No se pudo invitar al usuario.');
    } finally {
      setAddingUser(false);
    }
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      await handleFinish();
    }
  };

  const handlePrev = () => setStep((s) => Math.max(0, s - 1));

  const handleSkipStep = () => setStep((s) => s + 1);

  const handleFinish = async () => {
    if (!sucursalId) return;
    setSaving(true);
    setSaveError(null);
    try {
      await ajustesApi.actualizar(sucursalId, form);
      navigate('/admin');
    } catch {
      setSaveError('No se pudieron guardar los ajustes. Podés completarlos más tarde en Ajustes.');
      setSaving(false);
    }
  };

  const handleExit = () => setShowExitConfirm(true);
  const confirmExit = () => navigate('/admin');
  const cancelExit  = () => setShowExitConfirm(false);

  // ── Step content ───────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Paso 0: Perfil ──────────────────────────────────────────────────
      case 0:
        return (
          <div className="space-y-6">
            {/* Welcome card */}
            <div className="flex items-start gap-4 p-5 bg-primary/5 border border-primary/20 rounded-xl">
              <SparklesIcon className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-primary">Bienvenido a Meta Turnos</p>
                <p className="text-sm text-slate-600 mt-1">
                  En pocos pasos configuraremos tu negocio para empezar a recibir turnos.
                  Toda esta información se puede modificar luego desde <strong>Ajustes</strong>.
                </p>
                <a
                  href="/manual.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-medium mt-2 hover:underline"
                >
                  <BookOpenIcon className="w-3.5 h-3.5" />
                  Ver manual de usuario
                </a>
              </div>
            </div>

            <Field label="Nombre del negocio">
              <input
                className={inputCls}
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                placeholder="Ej: Studio Glamour"
              />
            </Field>

            <Field label="Slogan" hint="Frase corta que describe tu negocio (opcional).">
              <input
                className={inputCls}
                value={form.slogan ?? ''}
                onChange={(e) => set('slogan', e.target.value)}
                placeholder="Tu slogan aquí..."
              />
            </Field>

            <Field label="Moneda">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MONEDAS.map((m) => (
                  <label
                    key={m.codigo}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                      form.moneda === m.codigo
                        ? 'border-primary bg-primary/5 text-slate-800'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-primary/50'
                    }`}
                  >
                    <input
                      type="radio"
                      className="hidden"
                      value={m.codigo}
                      checked={form.moneda === m.codigo}
                      onChange={() => set('moneda', m.codigo)}
                    />
                    <span className={`text-base font-bold ${form.moneda === m.codigo ? 'text-primary' : 'text-slate-400'}`}>
                      {m.simbolo}
                    </span>
                    <div>
                      <p className="text-xs font-semibold leading-tight">{m.codigo}</p>
                      <p className="text-xs text-slate-400 leading-tight">{m.nombre}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Rubro" hint="Seleccioná los servicios que ofrece tu local (opcional).">
              <div className="flex flex-wrap gap-2">
                {RUBROS_DISPONIBLES.map((rubro) => {
                  const active = form.rubros.includes(rubro);
                  return (
                    <button
                      key={rubro}
                      type="button"
                      onClick={() => toggleRubro(rubro)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                        active
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-primary hover:text-primary'
                      }`}
                    >
                      {rubro}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
        );

      // ── Paso 1: Contacto ────────────────────────────────────────────────
      case 1:
        return (
          <div className="space-y-5">
            <Field label="Dirección">
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className={`${inputCls} pl-9`}
                  value={form.direccion}
                  onChange={(e) => set('direccion', e.target.value)}
                  placeholder="Calle 123, Ciudad, Provincia"
                />
              </div>
            </Field>

            <Field label="Link de Google Maps" hint="Entrá a Google Maps, buscá tu negocio, presioná el botón Compartir y copiá el enlace. El cliente podrá abrir la ubicación directamente desde la página de reservas.">
              <div className="relative">
                <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className={`${inputCls} pl-9`}
                  value={form.googleMapsUrl ?? ''}
                  onChange={(e) => set('googleMapsUrl', e.target.value)}
                  placeholder="https://maps.app.goo.gl/..."
                />
              </div>
            </Field>

            <Field label="Teléfono">
              <div className="relative">
                <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  className={`${inputCls} pl-9`}
                  value={form.telefono}
                  onChange={(e) => set('telefono', e.target.value)}
                  placeholder="+54 11 1234-5678"
                />
              </div>
            </Field>

            <Field label="Email de contacto">
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  className={`${inputCls} pl-9`}
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="contacto@tunegocio.com"
                />
              </div>
            </Field>
          </div>
        );

      // ── Paso 2: Horarios ────────────────────────────────────────────────
      case 2:
        return (
          <div className="space-y-2">
            {DIAS_SEMANA.map((dia) => {
              const h = form.horariosAtencion[dia] ?? { abierto: false, franjas: [] };
              const franjas = h.franjas ?? [];
              return (
                <div
                  key={dia}
                  className={`rounded-lg border transition-colors ${
                    h.abierto ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4 px-4 py-3">
                    <span className={`w-28 text-sm font-medium flex-shrink-0 ${h.abierto ? 'text-slate-800' : 'text-slate-400'}`}>
                      {DIAS_LABELS[dia]}
                    </span>
                    <Toggle checked={h.abierto} onChange={(v) => setHorarioAbierto(dia, v)} />
                    {!h.abierto && (
                      <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-white border border-slate-200 text-slate-400">
                        Cerrado
                      </span>
                    )}
                    {h.abierto && (
                      <button
                        type="button"
                        onClick={() => addFranja(dia)}
                        className="ml-auto flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <span className="text-base leading-none">+</span> Agregar franja
                      </button>
                    )}
                  </div>
                  {h.abierto && franjas.length > 0 && (
                    <div className="px-4 pb-3 space-y-2 border-t border-slate-100 pt-3">
                      {franjas.map((franja, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{idx + 1}.</span>
                          <input
                            type="time"
                            value={franja.apertura}
                            onChange={(e) => setFranja(dia, idx, 'apertura', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                          <span className="text-slate-400 text-sm">—</span>
                          <input
                            type="time"
                            value={franja.cierre}
                            onChange={(e) => setFranja(dia, idx, 'cierre', e.target.value)}
                            className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          />
                          {franjas.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFranja(dia, idx)}
                              className="ml-1 p-1 text-slate-400 hover:text-red-500 transition-colors rounded"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      // ── Paso 3: Reservas ────────────────────────────────────────────────
      case 3:
        return (
          <div className="space-y-1 divide-y divide-slate-100">
            {/* Modo confirmación */}
            <div className="py-4">
              <p className="text-sm font-medium text-slate-700 mb-1">Modo de confirmación de turnos</p>
              <p className="text-xs text-slate-400 mb-3">Define si los turnos quedan confirmados al instante o requieren aprobación del staff.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(['Automatico', 'Manual'] as ModoConfirmacionTurnos[]).map((modo) => {
                  const isSelected = form.modoConfirmacionTurnos === modo;
                  return (
                    <button
                      key={modo}
                      type="button"
                      onClick={() => set('modoConfirmacionTurnos', modo)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected ? 'border-primary bg-primary/5' : 'border-slate-200 bg-white hover:border-primary/40'
                      }`}
                    >
                      <p className={`text-sm font-semibold mb-1 ${isSelected ? 'text-primary' : 'text-slate-800'}`}>
                        {modo === 'Automatico' ? 'Automático' : 'Manual'}
                      </p>
                      <p className="text-xs text-slate-500 leading-snug">
                        {modo === 'Automatico'
                          ? 'El turno queda Confirmado al instante. Sin intervención del staff.'
                          : 'El turno queda Pendiente hasta que el staff lo confirme.'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Anticipación */}
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Anticipación mínima para reservar</p>
                <p className="text-xs text-slate-400 mt-0.5">Tiempo mínimo antes del turno para que el cliente pueda reservar.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  value={anticUnidad === 'horas'
                    ? Math.round(form.minutosAnticipacionMinimaReserva / 60)
                    : form.minutosAnticipacionMinimaReserva}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    set('minutosAnticipacionMinimaReserva', anticUnidad === 'horas' ? v * 60 : v);
                  }}
                  onFocus={(e) => e.target.select()}
                  className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <select
                  value={anticUnidad}
                  onChange={(e) => setAnticUnidad(e.target.value as 'minutos' | 'horas')}
                  className="px-2 py-1.5 text-sm border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                >
                  <option value="minutos">min</option>
                  <option value="horas">horas</option>
                </select>
              </div>
            </div>

            {/* Días máximos */}
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Días máximos reserva futura</p>
                <p className="text-xs text-slate-400 mt-0.5">Hasta cuántos días en el futuro puede reservar un cliente.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={form.diasMaximosReservaFutura}
                  onChange={(e) => set('diasMaximosReservaFutura', Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <span className="text-xs text-slate-400 w-10">días</span>
              </div>
            </div>

            {/* Buffer */}
            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Buffer entre turnos</p>
                <p className="text-xs text-slate-400 mt-0.5">Tiempo libre entre un turno y el siguiente.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={form.minutosBufferEntreTurnos}
                  onChange={(e) => set('minutosBufferEntreTurnos', Number(e.target.value))}
                  onFocus={(e) => e.target.select()}
                  className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
                <span className="text-xs text-slate-400 w-10">min</span>
              </div>
            </div>

            {/* Cancelación */}
            <div className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Permite cancelación por cliente</p>
                  <p className="text-xs text-slate-400 mt-0.5">El cliente puede cancelar su propio turno.</p>
                </div>
                <Toggle checked={form.permiteCancelacionCliente} onChange={(v) => set('permiteCancelacionCliente', v)} />
              </div>
              {form.permiteCancelacionCliente && (
                <div className="flex items-center justify-between mt-3 pl-4">
                  <div>
                    <p className="text-sm text-slate-600">Horas mínimas para cancelar</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={720}
                      value={form.horasMinimasCancelacion}
                      onChange={(e) => set('horasMinimasCancelacion', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-20 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <span className="text-xs text-slate-400 w-6">hs</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      // ── Paso 4: Servicios ───────────────────────────────────────────────
      case 4: {
        const diasAbiertos = DIAS_SEMANA.filter((d) => form.horariosAtencion[d]?.abierto);
        return (
          <div className="space-y-5">
            <p className="text-sm text-slate-500">
              Agregá al menos un servicio para que los clientes puedan reservar. Podés editar todos los detalles luego desde <strong>Servicios</strong>.
            </p>

            {/* Info dias */}
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
              <p className="text-xs font-medium text-amber-800">
                Cada servicio puede habilitarse solo para días específicos. Por ejemplo: "Coloración" solo los miércoles.
                Podés configurarlo desde la sección <strong>Servicios</strong> una vez creados.
              </p>
              {diasAbiertos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-xs text-amber-700 font-medium mr-1">Tus días abiertos:</span>
                  {diasAbiertos.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 rounded-full"
                    >
                      {DIAS_LABELS[d]}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Servicios creados */}
            {createdServices.length > 0 && (
              <div className="space-y-2">
                {createdServices.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2Icon className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{s.nombre}</p>
                      <p className="text-xs text-slate-500">{s.duracionAgendaMin} min · ${s.precio} · {s.modalidadPrestacion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario nuevo servicio */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
              <p className="text-sm font-medium text-slate-700">Nuevo servicio</p>

              <Field label="Nombre del servicio">
                <input
                  className={inputCls}
                  value={newSvc.nombre}
                  onChange={(e) => setNewSvc((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Ej: Corte de cabello"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio">
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={newSvc.precio}
                    onChange={(e) => setNewSvc((p) => ({ ...p, precio: Number(e.target.value) }))}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                  />
                </Field>
                <Field label="Duración (min)">
                  <input
                    type="number"
                    min={5}
                    step={5}
                    className={inputCls}
                    value={newSvc.duracionAgendaMin}
                    onChange={(e) => setNewSvc((p) => ({ ...p, duracionAgendaMin: Number(e.target.value) }))}
                    onFocus={(e) => e.target.select()}
                  />
                </Field>
              </div>

              <Field label="Modalidad">
                <div className="flex gap-2">
                  {(['Presencial', 'Online', 'Domicilio'] as ModalidadPrestacion[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setNewSvc((p) => ({ ...p, modalidadPrestacion: m }))}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                        newSvc.modalidadPrestacion === m
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-primary/40'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </Field>

              {svcError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-3.5 h-3.5" /> {svcError}
                </p>
              )}

              <button
                type="button"
                onClick={handleAddService}
                disabled={addingSvc}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-all"
              >
                {addingSvc ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <PlusIcon className="w-4 h-4" />}
                {addingSvc ? 'Guardando...' : 'Agregar servicio'}
              </button>
            </div>
          </div>
        );
      }

      // ── Paso 5: Equipo ──────────────────────────────────────────────────
      case 5:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <UsersIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Este paso es <strong>opcional</strong>. Podés invitar colaboradores y configurar sus horarios y servicios más adelante desde <strong>Equipo</strong>.
              </p>
            </div>

            {/* Usuarios invitados */}
            {createdUsers.length > 0 && (
              <div className="space-y-2">
                {createdUsers.map((email) => (
                  <div key={email} className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle2Icon className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <p className="text-sm text-slate-700">{email}</p>
                    <span className="ml-auto text-xs text-green-600 font-medium">Invitación enviada</span>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario invitación */}
            <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
              <p className="text-sm font-medium text-slate-700">Invitar colaborador</p>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Nombre">
                  <input
                    className={inputCls}
                    value={newUser.nombre}
                    onChange={(e) => setNewUser((p) => ({ ...p, nombre: e.target.value }))}
                    placeholder="Juan"
                  />
                </Field>
                <Field label="Apellido">
                  <input
                    className={inputCls}
                    value={newUser.apellido}
                    onChange={(e) => setNewUser((p) => ({ ...p, apellido: e.target.value }))}
                    placeholder="García"
                  />
                </Field>
              </div>

              <Field label="Email">
                <input
                  type="email"
                  className={inputCls}
                  value={newUser.email}
                  onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                  placeholder="juan@ejemplo.com"
                />
              </Field>

              <Field label="Teléfono">
                <input
                  className={inputCls}
                  value={newUser.telefono}
                  onChange={(e) => setNewUser((p) => ({ ...p, telefono: e.target.value }))}
                  placeholder="+54 11 1234-5678"
                />
              </Field>

              <Field label="Rol">
                <div className="flex gap-2">
                  {(['Profesional', 'Administrativo', 'Caja'] as RolUsuario[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewUser((p) => ({ ...p, rol: r }))}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                        newUser.rol === r
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-primary/40'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </Field>

              {userError && (
                <p className="text-xs text-red-600 flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-3.5 h-3.5" /> {userError}
                </p>
              )}

              <button
                type="button"
                onClick={handleInvite}
                disabled={addingUser}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-60 transition-all"
              >
                {addingUser ? <Loader2Icon className="w-4 h-4 animate-spin" /> : <MailIcon className="w-4 h-4" />}
                {addingUser ? 'Enviando invitación...' : 'Invitar colaborador'}
              </button>
            </div>
          </div>
        );

      // ── Paso 6: MercadoPago ─────────────────────────────────────────────
      case 6:
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <CreditCardIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                Conectá tu cuenta de <strong>Mercado Pago</strong> para aceptar pagos online en tus turnos. Este paso es <strong>opcional</strong> y podés hacerlo más adelante desde <strong>Ajustes → Pagos</strong>.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 py-6">
              {mpConectado ? (
                <div className="flex items-center gap-3 px-5 py-4 bg-green-50 border border-green-200 rounded-xl">
                  <CheckCircle2Icon className="w-5 h-5 text-green-600" />
                  <p className="text-sm font-medium text-green-700">Mercado Pago conectado exitosamente.</p>
                </div>
              ) : (
                <ConectarMercadoPagoButton
                  sucursalId={sucursalId}
                  yaConectado={false}
                  newTab
                  onConectado={() => setMpConectado(true)}
                  onDesconectado={() => setMpConectado(false)}
                />
              )}
              <p className="text-xs text-slate-400 text-center max-w-xs">
                Se abrirá Mercado Pago en una nueva pestaña. Una vez autorizado podés volver aquí y continuar.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const currentStepDef = STEPS[step];
  const isLastStep     = step === STEPS.length - 1;
  const isFirstStep    = step === 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 flex items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">T</span>
          </div>
          <span className="text-sm font-semibold text-slate-700 hidden sm:block">Configuración inicial</span>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Paso {step + 1} de {STEPS.length}
        </div>

        <button
          onClick={handleExit}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          <XIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </header>

      {/* ── Step indicator ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const done    = idx < step;
              const current = idx === step;
              return (
                <React.Fragment key={s.id}>
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        done    ? 'bg-primary text-white'
                        : current ? 'bg-primary/10 border-2 border-primary text-primary'
                        : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {done ? (
                        <CheckIcon className="w-4 h-4" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className={`text-[10px] font-medium hidden sm:block ${current ? 'text-primary' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                      {s.title}
                    </span>
                  </div>
                  {idx < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 transition-all ${idx < step ? 'bg-primary' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <main className="flex-1 py-6 px-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Step header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-slate-900">{currentStepDef.title}</h1>
              {currentStepDef.optional && (
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                  Opcional
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">
              {step === 0 && 'Contanos un poco sobre tu negocio.'}
              {step === 1 && 'Dónde y cómo contactarte.'}
              {step === 2 && 'Configurá los días y horarios de atención.'}
              {step === 3 && 'Parámetros para la gestión de turnos.'}
              {step === 4 && 'Definí qué servicios ofrecés.'}
              {step === 5 && 'Invitá colaboradores a tu equipo.'}
              {step === 6 && 'Aceptá pagos online con Mercado Pago.'}
            </p>
          </div>

          {/* Loading state */}
          {!loaded && step <= 3 ? (
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-white border border-slate-100 rounded-xl" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          )}

          {/* Save error */}
          {saveError && (
            <div className="mt-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
              {saveError}
            </div>
          )}
        </div>
      </main>

      {/* ── Footer navigation ────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 px-4 py-4 sticky bottom-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Anterior */}
          <button
            onClick={handlePrev}
            disabled={isFirstStep}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeftIcon className="w-4 h-4" />
            Anterior
          </button>

          <div className="flex items-center gap-2">
            {/* Omitir — visible en paso 0, 5 y 6 */}
            {(isFirstStep || currentStepDef.optional) && (
              <button
                onClick={isFirstStep ? handleExit : handleSkipStep}
                className="px-4 py-2.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-50"
              >
                {isFirstStep ? 'Omitir configuración' : 'Omitir este paso'}
              </button>
            )}

            {/* Siguiente / Finalizar */}
            <button
              onClick={handleNext}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm"
            >
              {saving ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : isLastStep ? (
                <CheckCircle2Icon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
              {saving ? 'Guardando...' : isLastStep ? 'Finalizar' : 'Siguiente'}
            </button>
          </div>
        </div>
      </footer>

      {/* ── Exit confirmation dialog ────────────────────────────────────── */}
      <AnimatePresence>
        {showExitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangleIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">¿Salir de la configuración?</p>
                  <p className="text-xs text-slate-500 mt-0.5">Los datos no guardados se perderán.</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 mb-5">
                Todo se puede configurar después desde <strong>Ajustes</strong>, <strong>Servicios</strong> y <strong>Equipo</strong> en el panel de administración.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelExit}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Continuar configurando
                </button>
                <button
                  onClick={confirmExit}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Salir igual
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
