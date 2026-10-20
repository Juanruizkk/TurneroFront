import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingIcon, TagIcon, MapPinIcon, ClockIcon,
  SettingsIcon, SaveIcon, CheckIcon, GlobeIcon, PhoneIcon,
  MailIcon, Loader2Icon, AlertCircleIcon, LinkIcon,
} from 'lucide-react';
import { useAuth, tienePermiso } from '../../contexts/AuthContext';
import { ajustesApi } from '../../api/ajustes';
import { SlugEditor } from '../../components/admin/SlugEditor';
import { SucursalImageUploader } from '../../components/admin/SucursalImageUploader';
import type { AjustesSucursal, DiaSemana, FranjaHoraria, ModoConfirmacionTurnos } from '../../types';
import { DIAS_SEMANA, DIAS_LABELS, RUBROS_DISPONIBLES, MONEDAS } from '../../types';

// ─── Default state ────────────────────────────────────────────────────────────

const franjasCompletas: FranjaHoraria[] = [
  { apertura: '09:00', cierre: '13:00' },
  { apertura: '15:00', cierre: '19:00' },
];

const defaultHorarios = () =>
  Object.fromEntries(
    DIAS_SEMANA.map((d) => [
      d,
      {
        abierto: d !== 'Domingo',
        franjas: d === 'Domingo' ? [] : d === 'Sabado'
          ? [{ apertura: '09:00', cierre: '13:00' }]
          : franjasCompletas.map((f) => ({ ...f })),
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
  botWhatsappHabilitado: false,
  chatwootInboxId: null,
});

// ─── Toggle switch component ──────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-primary' : 'bg-border'
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

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  sectionRef,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  sectionRef: React.RefObject<HTMLDivElement>;
}) {
  return (
    <div ref={sectionRef} className="bg-surface border border-border rounded-card p-4 sm:p-6 scroll-mt-4">
      <div className="flex items-start gap-3 mb-6 pb-5 border-b border-border">
        <div className="p-2 bg-primary-light/15 rounded-lg flex-shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-text-primary">{title}</h2>
          <p className="text-sm text-text-muted mt-0.5">{description}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface border border-border rounded-card p-6 animate-pulse">
          <div className="h-5 w-48 bg-surface-background rounded mb-4" />
          <div className="space-y-3">
            <div className="h-10 bg-surface-background rounded-lg" />
            <div className="h-10 bg-surface-background rounded-lg" />
            <div className="h-10 w-2/3 bg-surface-background rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

const VARIABLES_WA = ['{{ClienteNombre}}', '{{Servicio}}', '{{Fecha}}', '{{Hora}}'];

// ─── Main component ───────────────────────────────────────────────────────────

export function Ajustes() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const tieneAcceso = user?.esOwner || user?.rol === 'Administrativo' || tienePermiso(user, 'GestionarAjustes');

  useEffect(() => {
    if (!tieneAcceso) navigate('/admin');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tieneAcceso]);

  const [form, setForm] = useState<AjustesSucursal>(defaultForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [anticUnidad, setAnticUnidad] = useState<'minutos' | 'horas'>('minutos');

  const textarea24hRef = useRef<HTMLTextAreaElement>(null);
  const textarea3hRef  = useRef<HTMLTextAreaElement>(null);

  const insertAt = (
    ref: React.RefObject<HTMLTextAreaElement>,
    variable: string,
    key: 'mensajeWhatsApp24h' | 'mensajeWhatsApp3h',
  ) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart ?? el.value.length;
    const end   = el.selectionEnd   ?? start;
    const next   = el.value.slice(0, start) + variable + el.value.slice(end);
    const cursor = start + variable.length;
    set(key, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const refs = [
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
    useRef<HTMLDivElement>(null),
  ];

  const tabs = [
    { label: 'Perfil',        icon: BuildingIcon },
    { label: 'Contacto',      icon: MapPinIcon   },
    { label: 'Horarios',      icon: ClockIcon    },
    { label: 'Configuración', icon: SettingsIcon },
    { label: 'URL Pública',   icon: LinkIcon     },
  ];

  // Load ajustes
  useEffect(() => {
    if (!user?.sucursalId) { setLoading(false); return; }
    ajustesApi.obtener(user.sucursalId)
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
      .catch(() => setError('No se pudieron cargar los ajustes.'))
      .finally(() => setLoading(false));
  }, [user?.sucursalId]);

  // Save
  const handleSave = async () => {
    if (!user?.sucursalId) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await ajustesApi.actualizar(user.sucursalId, form);
      setForm({
        ...updated,
        horariosAtencion:
          updated.horariosAtencion && Object.keys(updated.horariosAtencion).length > 0
            ? updated.horariosAtencion
            : defaultHorarios(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Error al guardar los ajustes. Verificá los datos e intentá de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const scrollTo = (idx: number) => {
    setActiveTab(idx);
    refs[idx].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const set = useCallback(<K extends keyof AjustesSucursal>(key: K, value: AjustesSucursal[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const toggleRubro = (rubro: string) => {
    setForm((f) => ({
      ...f,
      rubros: f.rubros.includes(rubro) ? f.rubros.filter((r) => r !== rubro) : [...f.rubros, rubro],
    }));
  };

  const setHorarioAbierto = (dia: DiaSemana, abierto: boolean) => {
    setForm((f) => ({
      ...f,
      horariosAtencion: {
        ...f.horariosAtencion,
        [dia]: {
          ...f.horariosAtencion[dia],
          abierto,
          // Si se abre un día sin franjas, agregar una franja por defecto
          franjas:
            abierto && (!f.horariosAtencion[dia]?.franjas?.length)
              ? [{ apertura: '09:00', cierre: '13:00' }]
              : f.horariosAtencion[dia]?.franjas ?? [],
        },
      },
    }));
  };

  const setFranja = (dia: DiaSemana, idx: number, field: 'apertura' | 'cierre', value: string) => {
    setForm((f) => {
      const franjas = [...(f.horariosAtencion[dia]?.franjas ?? [])];
      franjas[idx] = { ...franjas[idx], [field]: value };
      return {
        ...f,
        horariosAtencion: { ...f.horariosAtencion, [dia]: { ...f.horariosAtencion[dia], franjas } },
      };
    });
  };

  const addFranja = (dia: DiaSemana) => {
    setForm((f) => {
      const franjas = [...(f.horariosAtencion[dia]?.franjas ?? [])];
      franjas.push({ apertura: '15:00', cierre: '19:00' });
      return {
        ...f,
        horariosAtencion: { ...f.horariosAtencion, [dia]: { ...f.horariosAtencion[dia], franjas } },
      };
    });
  };

  const removeFranja = (dia: DiaSemana, idx: number) => {
    setForm((f) => {
      const franjas = (f.horariosAtencion[dia]?.franjas ?? []).filter((_, i) => i !== idx);
      return {
        ...f,
        horariosAtencion: { ...f.horariosAtencion, [dia]: { ...f.horariosAtencion[dia], franjas } },
      };
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 max-w-5xl">
      {/* Mobile: section selector */}
      <select
        className="md:hidden w-full px-3 py-2 border border-border rounded-lg mb-2 text-base bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        value={activeTab}
        onChange={(e) => scrollTo(Number(e.target.value))}
      >
        {tabs.map((tab, idx) => (
          <option key={tab.label} value={idx}>{tab.label}</option>
        ))}
      </select>

      {/* Desktop: left sticky nav */}
      <aside className="hidden md:block w-48 flex-shrink-0">
        <div className="sticky top-0 bg-surface border border-border rounded-card overflow-hidden">
          {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const active = activeTab === idx;
            return (
              <button
                key={tab.label}
                onClick={() => scrollTo(idx)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left border-l-2 ${
                  active
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-transparent text-text-secondary hover:bg-surface-background hover:text-text-primary'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Topbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Ajustes de la sucursal</h1>
            <p className="text-sm text-text-muted mt-0.5">Configurá el perfil, horarios y preferencias de tu local.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-60 rounded-button px-4 py-2 text-sm font-medium transition-all"
          >
            <AnimatePresence mode="wait">
              {saving ? (
                <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Loader2Icon className="w-4 h-4 animate-spin" />
                </motion.span>
              ) : saved ? (
                <motion.span key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <CheckIcon className="w-4 h-4" />
                </motion.span>
              ) : (
                <motion.span key="save" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <SaveIcon className="w-4 h-4" />
                </motion.span>
              )}
            </AnimatePresence>
            {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 mb-4 px-4 py-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
            <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <Skeleton />
        ) : (
          <div className="space-y-4">
            {/* ── SECCIÓN 1: PERFIL ──────────────────────────────────── */}
            <SectionCard
              sectionRef={refs[0]}
              icon={BuildingIcon}
              title="Perfil del negocio"
              description="Información principal que verán tus clientes."
            >
              <Field label="Nombre del negocio">
                <input
                  className={inputCls}
                  value={form.nombre}
                  onChange={(e) => set('nombre', e.target.value)}
                  placeholder="Ej: Studio Glamour"
                />
              </Field>

              <Field label="Slogan" hint="Frase corta que describe tu negocio.">
                <input
                  className={inputCls}
                  value={form.slogan ?? ''}
                  onChange={(e) => set('slogan', e.target.value)}
                  placeholder="Tu slogan aquí..."
                />
              </Field>

              <Field label="Logo del negocio" hint="Se muestra en el perfil público y en los turnos.">
                {user?.sucursalId ? (
                  <SucursalImageUploader
                    tipo="logo"
                    sucursalId={user.sucursalId}
                    currentUrl={form.fotoUrl}
                    onUpdate={(url) => set('fotoUrl', url ?? undefined)}
                  />
                ) : null}
              </Field>

              <Field label="Imagen de fondo" hint="Banner que aparece en la cabecera de tu perfil público. Recomendado: 1200 × 400 px.">
                {user?.sucursalId ? (
                  <SucursalImageUploader
                    tipo="background"
                    sucursalId={user.sucursalId}
                    currentUrl={form.backgroundUrl}
                    onUpdate={(url) => set('backgroundUrl', url ?? undefined)}
                  />
                ) : null}
              </Field>

              <Field label="Moneda">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MONEDAS.map((m) => (
                    <label
                      key={m.codigo}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        form.moneda === m.codigo
                          ? 'border-primary bg-primary/5 text-text-primary'
                          : 'border-border bg-surface-background text-text-secondary hover:border-primary/50'
                      }`}
                    >
                      <input
                        type="radio"
                        className="hidden"
                        value={m.codigo}
                        checked={form.moneda === m.codigo}
                        onChange={() => set('moneda', m.codigo)}
                      />
                      <span className={`text-base font-bold ${form.moneda === m.codigo ? 'text-primary' : 'text-text-muted'}`}>
                        {m.simbolo}
                      </span>
                      <div>
                        <p className="text-xs font-semibold leading-tight">{m.codigo}</p>
                        <p className="text-xs text-text-muted leading-tight">{m.nombre}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </Field>

              <Field label="Rubros" hint="Seleccioná los servicios que ofrece tu local.">
                <div className="flex flex-wrap gap-2 mt-1">
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
                            : 'bg-surface-background border-border text-text-secondary hover:border-primary hover:text-primary'
                        }`}
                      >
                        {rubro}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </SectionCard>

            {/* ── SECCIÓN 2: CONTACTO ────────────────────────────────── */}
            <SectionCard
              sectionRef={refs[1]}
              icon={MapPinIcon}
              title="Contacto y ubicación"
              description="Datos de contacto y dirección física del local."
            >
              <Field label="Dirección">
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    className={`${inputCls} pl-9`}
                    value={form.direccion}
                    onChange={(e) => set('direccion', e.target.value)}
                    placeholder="Calle 123, Ciudad, Provincia"
                  />
                </div>
              </Field>

              <Field label="Link de Google Maps" hint="Opcional — el cliente podrá abrir la ubicación directamente desde la página de reservas.">
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
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
                  <PhoneIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
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
                  <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    className={`${inputCls} pl-9`}
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="contacto@tunegocio.com"
                  />
                </div>
              </Field>
            </SectionCard>

            {/* ── SECCIÓN 3: HORARIOS ────────────────────────────────── */}
            <SectionCard
              sectionRef={refs[2]}
              icon={ClockIcon}
              title="Horarios de atención"
              description="Configurá los días y horarios. Podés agregar varias franjas por día (ej: mañana y tarde)."
            >
              <div className="space-y-2">
                {DIAS_SEMANA.map((dia) => {
                  const h = form.horariosAtencion[dia] ?? { abierto: false, franjas: [] };
                  const franjas = h.franjas ?? [];
                  return (
                    <div
                      key={dia}
                      className={`rounded-lg border transition-colors ${
                        h.abierto ? 'border-border bg-surface' : 'border-border/50 bg-surface-background'
                      }`}
                    >
                      {/* Row header: nombre + toggle + cerrado badge */}
                      <div className="flex items-center gap-4 px-4 py-3">
                        <span className={`w-28 text-sm font-medium flex-shrink-0 ${h.abierto ? 'text-text-primary' : 'text-text-muted'}`}>
                          {DIAS_LABELS[dia]}
                        </span>
                        <Toggle checked={h.abierto} onChange={(v) => setHorarioAbierto(dia, v)} />
                        {!h.abierto && (
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-surface-background border border-border text-text-muted">
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

                      {/* Franjas */}
                      {h.abierto && franjas.length > 0 && (
                        <div className="px-4 pb-3 space-y-2 border-t border-border/40 pt-3">
                          {franjas.map((franja, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-text-muted w-5 text-right flex-shrink-0">{idx + 1}.</span>
                              <input
                                type="time"
                                value={franja.apertura}
                                onChange={(e) => setFranja(dia, idx, 'apertura', e.target.value)}
                                className="px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              />
                              <span className="text-text-muted text-sm">—</span>
                              <input
                                type="time"
                                value={franja.cierre}
                                onChange={(e) => setFranja(dia, idx, 'cierre', e.target.value)}
                                className="px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                              />
                              {franjas.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeFranja(dia, idx)}
                                  className="ml-1 p-1 text-text-muted hover:text-error transition-colors rounded"
                                  title="Eliminar franja"
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
            </SectionCard>

            {/* ── SECCIÓN 4: CONFIG ─────────────────────────────────── */}
            <SectionCard
              sectionRef={refs[3]}
              icon={SettingsIcon}
              title="Configuración de reservas"
              description="Parámetros operativos para la gestión de turnos."
            >
              {/* Anticipación mínima */}
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-text-primary">Anticipación mínima para reservar</p>
                  <p className="text-xs text-text-muted mt-0.5">Tiempo mínimo antes del turno para que el cliente pueda reservar.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={anticUnidad === 'horas' ? 168 : 10080}
                    value={anticUnidad === 'horas'
                      ? Math.round(form.minutosAnticipacionMinimaReserva / 60)
                      : form.minutosAnticipacionMinimaReserva}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      set('minutosAnticipacionMinimaReserva', anticUnidad === 'horas' ? v * 60 : v);
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-20 px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <select
                    value={anticUnidad}
                    onChange={(e) => setAnticUnidad(e.target.value as 'minutos' | 'horas')}
                    className="px-2 py-1.5 text-sm border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  >
                    <option value="minutos">min</option>
                    <option value="horas">horas</option>
                  </select>
                </div>
              </div>

              {/* Días máximos */}
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-text-primary">Días máximos reserva futura</p>
                  <p className="text-xs text-text-muted mt-0.5">Hasta cuántos días en el futuro puede reservar un cliente.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={form.diasMaximosReservaFutura}
                    onChange={(e) => set('diasMaximosReservaFutura', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-20 px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <span className="text-xs text-text-muted w-10">días</span>
                </div>
              </div>

              {/* Buffer */}
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-text-primary">Buffer entre turnos</p>
                  <p className="text-xs text-text-muted mt-0.5">Tiempo libre entre un turno y el siguiente.</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={120}
                    value={form.minutosBufferEntreTurnos}
                    onChange={(e) => set('minutosBufferEntreTurnos', Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-20 px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <span className="text-xs text-text-muted w-10">min</span>
                </div>
              </div>

              {/* Permite cancelación */}
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-text-primary">Permite cancelación por cliente</p>
                  <p className="text-xs text-text-muted mt-0.5">El cliente puede cancelar su propio turno.</p>
                </div>
                <Toggle checked={form.permiteCancelacionCliente} onChange={(v) => set('permiteCancelacionCliente', v)} />
              </div>

              {/* Horas mínimas cancelación */}
              {form.permiteCancelacionCliente && (
                <div className="flex items-center justify-between py-3 border-b border-border/50 pl-4">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Horas mínimas para cancelar</p>
                    <p className="text-xs text-text-muted mt-0.5">Con cuánta anticipación puede cancelar el cliente.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={720}
                      value={form.horasMinimasCancelacion}
                      onChange={(e) => set('horasMinimasCancelacion', Number(e.target.value))}
                      onFocus={(e) => e.target.select()}
                      className="w-20 px-2 py-1.5 bg-surface border border-border rounded-lg text-sm text-text-primary text-center focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <span className="text-xs text-text-muted w-10">hs</span>
                  </div>
                </div>
              )}

              {/* Modo de confirmación de turnos */}
              <div className="py-4 border-b border-border/50">
                <p className="text-sm font-medium text-text-primary mb-1">Modo de confirmación de turnos</p>
                <p className="text-xs text-text-muted mb-3">Define si los turnos quedan confirmados automáticamente o requieren aprobación del staff.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(['Automatico', 'Manual'] as ModoConfirmacionTurnos[]).map((modo) => {
                    const isSelected = form.modoConfirmacionTurnos === modo;
                    return (
                      <button
                        key={modo}
                        type="button"
                        onClick={() => set('modoConfirmacionTurnos', modo)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-surface-background hover:border-primary/40'
                        }`}
                      >
                        <p className={`text-sm font-semibold mb-1 ${isSelected ? 'text-primary' : 'text-text-primary'}`}>
                          {modo === 'Automatico' ? 'Automático' : 'Manual'}
                        </p>
                        <p className="text-xs text-text-muted leading-snug">
                          {modo === 'Automatico'
                            ? 'El turno queda Confirmado al instante. Sin intervención del staff.'
                            : 'El turno queda Pendiente hasta que el staff lo confirme.'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recordatorio email */}
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-text-primary">Recordatorio por email</p>
                  <p className="text-xs text-text-muted mt-0.5">Enviar recordatorio automático al cliente por email.</p>
                </div>
                <Toggle checked={form.enviaRecordatorioEmail} onChange={(v) => set('enviaRecordatorioEmail', v)} />
              </div>

              {/* Recordatorio WhatsApp */}
              <div className="flex items-center justify-between py-3 border-b border-border/50">
                <div>
                  <p className="text-sm font-medium text-text-primary">Recordatorio por WhatsApp</p>
                  <p className="text-xs text-text-muted mt-0.5">Habilita los botones de envío manual desde el detalle del turno.</p>
                </div>
                <Toggle checked={form.enviaRecordatorioWhatsapp} onChange={(v) => set('enviaRecordatorioWhatsapp', v)} />
              </div>

              {/* Plantillas de WhatsApp */}
              {form.enviaRecordatorioWhatsapp && (
                <div className="pl-4 space-y-4 py-3">
                  <p className="text-xs text-text-muted">
                    Hacé clic en una variable para insertarla donde esté el cursor en el texto.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Mensaje recordatorio 24 h antes
                    </label>
                    <textarea
                      ref={textarea24hRef}
                      rows={3}
                      value={form.mensajeWhatsApp24h ?? ''}
                      onChange={(e) => set('mensajeWhatsApp24h', e.target.value)}
                      className={`${inputCls} resize-none`}
                      placeholder="Hola {{ClienteNombre}}! Te recordamos tu turno de {{Servicio}} mañana {{Fecha}} a las {{Hora}}."
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {VARIABLES_WA.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertAt(textarea24hRef, v, 'mensajeWhatsApp24h')}
                          className="px-2 py-0.5 bg-primary/8 border border-primary/20 rounded text-xs font-mono text-primary hover:bg-primary/15 transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      Mensaje recordatorio 3 h antes
                    </label>
                    <textarea
                      ref={textarea3hRef}
                      rows={3}
                      value={form.mensajeWhatsApp3h ?? ''}
                      onChange={(e) => set('mensajeWhatsApp3h', e.target.value)}
                      className={`${inputCls} resize-none`}
                      placeholder="Hola {{ClienteNombre}}! Tu turno de {{Servicio}} es hoy a las {{Hora}}. ¡Te esperamos pronto!"
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {VARIABLES_WA.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertAt(textarea3hRef, v, 'mensajeWhatsApp3h')}
                          className="px-2 py-0.5 bg-primary/8 border border-primary/20 rounded text-xs font-mono text-primary hover:bg-primary/15 transition-colors"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ── SECCIÓN 5: URL PÚBLICA ─────────────────────────────── */}
            <SectionCard
              sectionRef={refs[4]}
              icon={LinkIcon}
              title="URL pública"
              description="El slug identifica a tu negocio en la web. Podés personalizarlo en cualquier momento."
            >
              {user?.sucursalId ? (
                <SlugEditor sucursalId={user.sucursalId} />
              ) : (
                <p className="text-sm text-text-muted">No se encontró el ID de la sucursal.</p>
              )}
            </SectionCard>

          </div>
        )}

        {/* Botón guardar fijo al pie */}
        {!loading && (
          <div className="mt-6 pt-5 border-t border-border flex items-center justify-between">
            {error && (
              <p className="text-sm text-error flex items-center gap-2">
                <AlertCircleIcon className="w-4 h-4 flex-shrink-0" />
                {error}
              </p>
            )}
            {!error && saved && (
              <p className="text-sm text-green-600 flex items-center gap-2">
                <CheckIcon className="w-4 h-4" /> Cambios guardados correctamente.
              </p>
            )}
            {!error && !saved && <span />}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary text-white hover:bg-primary/90 disabled:opacity-60 rounded-button px-6 py-2.5 text-sm font-medium transition-all shadow-sm ml-auto"
            >
              {saving ? (
                <Loader2Icon className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckIcon className="w-4 h-4" />
              ) : (
                <SaveIcon className="w-4 h-4" />
              )}
              {saving ? 'Guardando...' : saved ? 'Guardado' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
