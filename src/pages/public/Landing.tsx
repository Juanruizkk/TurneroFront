import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarDaysIcon, BellIcon, BarChart3Icon, UsersIcon,
  SmartphoneIcon, ShieldCheckIcon, ZapIcon, ClockIcon,
  StarIcon, TrendingUpIcon, CheckIcon, ChevronLeftIcon, ChevronRightIcon,
  ChevronDownIcon, ScissorsIcon, StethoscopeIcon, SparklesIcon,
  HeartPulseIcon, CreditCardIcon, MessageCircleIcon, Maximize2Icon,
  XIcon, ExternalLinkIcon, LinkedinIcon, ArrowRightIcon, LayersIcon,
  CheckCircle2Icon, AlertCircleIcon
} from 'lucide-react';
import Silk from '../../components/Silk';

// ─── Demo calendar data (Hero) ──────────────────────────────────────────────────

const DEMO_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const DEMO_DATES = ['14', '15', '16', '17', '18'];

type TurnoStatus = 'confirmado' | 'pendiente' | 'cancelado';

interface DemoTurno {
  id: number;
  dia: number;
  hora: string;
  servicio: string;
  cliente: string;
  rubroTag: string;
  status: TurnoStatus;
  color: string;
}

const DEMO_TURNOS: DemoTurno[] = [
  { id: 1, dia: 0, hora: '09:00', servicio: 'Corte + Barba', cliente: 'Mateo Rossi', rubroTag: 'Barbería', status: 'confirmado', color: '#2F7D6B' },
  { id: 2, dia: 0, hora: '11:30', servicio: 'Consulta Gratuita', cliente: 'Lucas Giménez', rubroTag: 'Clínica', status: 'pendiente', color: '#5B8DEF' },
  { id: 3, dia: 1, hora: '10:00', servicio: 'Kinesiología Deportiva', cliente: 'Ana Torres', rubroTag: 'Salud', status: 'confirmado', color: '#8B5CF6' },
  { id: 4, dia: 1, hora: '14:00', servicio: 'Esmaltado Semipermanente', cliente: 'Paula Soto', rubroTag: 'Estética', status: 'confirmado', color: '#EC4899' },
  { id: 5, dia: 2, hora: '09:30', servicio: 'Sesión Terapia Online', cliente: 'Carlos Ruiz', rubroTag: 'Psicología', status: 'cancelado', color: '#EF4444' },
  { id: 6, dia: 2, hora: '15:00', servicio: 'Limpieza Facial Profunda', cliente: 'Marta Gil', rubroTag: 'Estética', status: 'confirmado', color: '#2F7D6B' },
  { id: 7, dia: 3, hora: '14:00', servicio: 'Perfilado de Cejas', cliente: 'Laura Vidal', rubroTag: 'Belleza', status: 'confirmado', color: '#F59E0B' },
  { id: 8, dia: 4, hora: '16:30', servicio: 'Control Odontológico', cliente: 'Diego Méndez', rubroTag: 'Salud', status: 'pendiente', color: '#5B8DEF' },
];

const STATUS_STYLES: Record<TurnoStatus, { ribbon: string; bg: string; dot: string }> = {
  confirmado: { ribbon: 'bg-primary', bg: 'bg-primary/10', dot: 'bg-primary' },
  pendiente:  { ribbon: 'bg-warning',  bg: 'bg-warning/10',  dot: 'bg-warning' },
  cancelado:  { ribbon: 'bg-error',    bg: 'bg-error/10',    dot: 'bg-error' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}

// ─── Navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const navLinks = [
    { label: 'Características', id: 'caracteristicas' },
    { label: 'Rubros', id: 'rubros' },
    { label: 'Capturas Reales', id: 'capturas' },
    { label: 'Cómo funciona', id: 'como-funciona' },
    { label: 'Stack Técnico', id: 'tecnologia' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'shadow-[0_4px_30px_rgba(13,28,46,0.08)] backdrop-blur-xl bg-white/90 border-b border-border/80'
          : 'backdrop-blur-md bg-white/75 border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt="MetaTurnos" className="h-8 w-auto object-contain transition-transform group-hover:scale-105" />
          </Link>
          <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            Open & Gratuito
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-body text-text-secondary">
          {navLinks.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className="hover:text-primary transition-colors font-medium text-xs lg:text-sm"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-semibold text-text-secondary hover:text-primary hover:bg-surface-soft transition-colors border border-border"
          >
            <LinkedinIcon size={14} className="text-[#0A66C2]" />
            LinkedIn
          </a>
          <Link
            to="/login"
            className="hidden md:inline-flex items-center justify-center px-3.5 py-2 rounded-button text-xs font-semibold font-body text-text-primary hover:text-primary transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-button text-xs sm:text-sm font-semibold font-body text-white bg-gradient-to-r from-[#1D6052] via-primary to-[#3DA38D] hover:opacity-95 transition-all shadow-[0_2px_12px_rgba(47,125,107,0.3)] hover:shadow-[0_4px_18px_rgba(47,125,107,0.45)]"
          >
            <ZapIcon size={14} className="text-yellow-300" />
            Probar demo gratis
          </Link>
          <button
            className="md:hidden p-2 text-text-secondary hover:text-text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Abrir menú"
          >
            {mobileOpen ? <XIcon size={22} /> : (
              <div className="w-5 flex flex-col gap-1">
                <span className="w-full h-0.5 bg-current rounded-full" />
                <span className="w-full h-0.5 bg-current rounded-full" />
                <span className="w-full h-0.5 bg-current rounded-full" />
              </div>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-t border-border px-6 py-5 flex flex-col gap-3 shadow-xl">
          {navLinks.map((l) => (
            <button
              key={l.id}
              onClick={() => { scrollTo(l.id); setMobileOpen(false); }}
              className="text-left text-sm font-body text-text-secondary hover:text-primary py-1.5 font-medium"
            >
              {l.label}
            </button>
          ))}
          <div className="border-t border-border pt-4 mt-2 flex flex-col gap-2.5">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-2.5 rounded-button text-sm font-semibold font-body text-primary border border-primary/30 hover:bg-primary/5 transition-colors"
            >
              Iniciar sesión
            </Link>
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button text-sm font-semibold text-text-secondary border border-border hover:bg-surface-soft"
            >
              <LinkedinIcon size={16} className="text-[#0A66C2]" />
              Conectar en LinkedIn
            </a>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── 3D Tilt Calendar (hero interactive element) ──────────────────────────────

function TiltCalendar() {
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number>(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const byDay = DEMO_DAYS.map((_, i) => DEMO_TURNOS.filter((t) => t.dia === i));

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      setTilt({ x: dy * -8, y: dx * 10 });
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', () => { setIsHovered(false); setTilt({ x: 0, y: 0 }); });
    el.addEventListener('mouseenter', () => setIsHovered(true));
    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleMouseMove]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center w-full h-full min-h-[460px] sm:min-h-[500px]"
      style={{ perspective: '1200px' }}
    >
      {/* Decorative Glow Blobs */}
      <div className="absolute top-6 right-6 w-56 h-56 bg-primary/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-6 left-6 w-48 h-48 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      <div
        ref={cardRef}
        className="relative w-full max-w-[530px] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(13,28,46,0.18),0_0_0_1px_rgba(47,125,107,0.15)] bg-white/95 backdrop-blur-md transition-shadow duration-300"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`,
          transition: isHovered ? 'transform 0.08s linear' : 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Calendar header with live pulse */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-gradient-to-r from-white via-surface-soft/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDaysIcon size={16} className="text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-bold text-text-primary text-sm">Agenda en Vivo</span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Sincronizado
                </span>
              </div>
              <p className="text-[10px] text-text-muted">Turnos de hoy · Varios profesionales</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="hidden sm:flex gap-0.5 text-xs font-body bg-surface-background p-0.5 rounded-lg border border-border/60">
              {['Día', 'Semana', 'Mes'].map((tab, i) => (
                <span
                  key={tab}
                  className={`px-2 py-0.5 rounded-md cursor-default text-[10px] font-semibold transition-colors ${
                    i === 1 ? 'bg-primary text-white shadow-xs' : 'text-text-muted'
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="flex gap-0.5">
              <button className="p-1 rounded text-text-muted hover:bg-surface-soft transition-colors" aria-label="Semana anterior">
                <ChevronLeftIcon size={14} />
              </button>
              <button className="p-1 rounded text-text-muted hover:bg-surface-soft transition-colors" aria-label="Semana siguiente">
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-5 border-b border-border bg-surface-background/80">
          {DEMO_DAYS.map((day, i) => (
            <div key={day} className="py-2 flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">{day}</span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-transform ${
                  i === 1 ? 'bg-primary text-white shadow-xs scale-105' : 'text-text-secondary'
                }`}
              >
                {DEMO_DATES[i]}
              </div>
            </div>
          ))}
        </div>

        {/* Grid columns */}
        <div className="grid grid-cols-5 divide-x divide-border bg-white" style={{ minHeight: 250 }}>
          {DEMO_DAYS.map((day, i) => (
            <div key={day} className="p-1.5 flex flex-col gap-1.5">
              {byDay[i].map((turno) => (
                <div
                  key={turno.id}
                  className="group/item flex flex-col overflow-hidden rounded-md shadow-xs border border-border/40 hover:border-primary/40 transition-all cursor-pointer p-1.5 relative"
                  style={{ background: `${turno.color}10` }}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] font-bold leading-tight text-text-primary">{turno.hora}</span>
                    <span className="text-[8px] font-medium px-1 rounded text-white" style={{ background: turno.color }}>
                      {turno.rubroTag}
                    </span>
                  </div>
                  <p className="text-[8.5px] font-medium leading-tight text-text-secondary truncate">{turno.servicio}</p>
                  <div className="flex items-center gap-1 mt-1 pt-1 border-t border-black/5">
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLES[turno.status].dot}`} />
                    <span className="text-[8px] text-text-muted truncate">{turno.cliente}</span>
                  </div>
                </div>
              ))}
              {byDay[i].length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-6 h-px bg-border/60" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-surface-background/70">
          <div className="flex gap-3">
            {(Object.entries({ confirmado: 'Confirmado', pendiente: 'Pendiente', cancelado: 'Cancelado' }) as [TurnoStatus, string][]).map(
              ([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${STATUS_STYLES[key].dot}`} />
                  <span className="text-[10px] font-body text-text-secondary font-medium">{label}</span>
                </div>
              )
            )}
          </div>
          <span className="text-[10px] font-semibold text-primary">WebSockets en vivo</span>
        </div>

        {/* Reflection sheen */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 45%, transparent 100%)`,
          }}
        />
      </div>

      {/* Floating badge 1: Ausentes */}
      <div
        className="absolute top-6 -left-3 sm:-left-5 bg-white/95 backdrop-blur-md rounded-xl px-3.5 py-2.5 shadow-[0_12px_32px_rgba(13,28,46,0.14)] flex items-center gap-2.5 border border-border animate-bounce"
        style={{ animationDuration: '6s', transform: 'translateZ(30px)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
          <TrendingUpIcon size={16} className="text-emerald-700" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-text-primary leading-none">+35% Asistencia</p>
          <p className="text-[9.5px] text-text-muted mt-0.5">Señas previas con Mercado Pago</p>
        </div>
      </div>

      {/* Floating badge 2: WhatsApp */}
      <div
        className="absolute bottom-6 -right-3 sm:-right-5 bg-white/95 backdrop-blur-md rounded-xl px-3.5 py-2.5 shadow-[0_12px_32px_rgba(13,28,46,0.14)] flex items-center gap-2.5 border border-border"
        style={{ transform: 'translateZ(30px)' }}
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <MessageCircleIcon size={16} className="text-primary" />
        </div>
        <div>
          <p className="text-[11px] font-bold text-text-primary leading-none">Recordatorio WhatsApp</p>
          <p className="text-[9.5px] text-text-muted mt-0.5">Enviado 24hs antes del turno</p>
        </div>
      </div>
    </div>
  );
}

// ─── Hero Section with Silk Background ────────────────────────────────────────

function Hero() {
  return (
    <section className="relative pt-24 sm:pt-28 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden bg-gradient-to-b from-[#F2F8F5] via-[#EBF4F0]/60 to-white">
      {/* ── React Bits Silk Animated Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-35 md:opacity-45 mix-blend-multiply">
        <Silk
          color="#2F7D6B"
          speed={2.8}
          scale={1.15}
          noiseIntensity={1.1}
          rotation={0.15}
          lightMode={true}
        />
      </div>

      {/* Subtle radial gradients overlay for readability */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(255,255,255,0.7),rgba(255,255,255,0.92))]" />

      <div className="relative max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-14 items-center">

          {/* Left column */}
          <div className="flex flex-col gap-6 lg:gap-7 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-bold font-body tracking-wide uppercase border border-primary/25 shadow-xs">
                <SparklesIcon size={13} className="text-primary" />
                Para Barberías, Médicos, Estética, Terapeutas y más
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-[11px] font-semibold border border-emerald-500/20">
                100% Web · Sin instalar apps
              </span>
            </div>

            <div>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-text-primary leading-[1.12] tracking-tight">
                La agenda online que tu negocio{' '}
                <span className="relative whitespace-nowrap">
                  <span className="relative z-10 text-primary">necesitaba</span>
                  <span className="absolute bottom-1.5 left-0 right-0 h-3.5 bg-primary/15 -z-0 rounded-sm" />
                </span>
              </h1>
              <p className="mt-5 font-body text-base sm:text-lg text-text-secondary leading-relaxed max-w-xl">
                Automatizá tus turnos, cobrá señas con <strong className="text-text-primary font-semibold">Mercado Pago</strong> y enviá recordatorios automáticos.
                Tus clientes reservan solos en <strong className="text-primary font-semibold">30 segundos</strong> desde el celular sin llamadas ni chats desordenados.
              </p>
            </div>

            {/* Main CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-button font-bold font-body text-white bg-gradient-to-r from-[#1D6052] via-primary to-[#3DA38D] hover:opacity-95 transition-all shadow-[0_4px_24px_rgba(47,125,107,0.35)] text-sm sm:text-base group"
              >
                Probar sistema gratis
                <ArrowRightIcon size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <button
                onClick={() => scrollTo('capturas')}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-button font-semibold font-body text-primary border-2 border-primary/30 bg-white/90 hover:bg-primary/5 transition-all text-sm sm:text-base shadow-xs"
              >
                <LayersIcon size={17} />
                Ver capturas reales
              </button>
            </div>

            {/* Social proof & author note for LinkedIn */}
            <div className="pt-3 border-t border-border/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {['#2F7D6B', '#5B8DEF', '#8B5CF6', '#EC4899', '#F59E0B'].map((c, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-xs"
                      style={{ background: c }}
                    >
                      {['💈', '🩺', '💅', '🧠', '🐾'][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <StarIcon key={i} size={13} className="text-warning fill-warning" />
                    ))}
                    <span className="text-xs font-bold text-text-primary ml-1">Multirubro</span>
                  </div>
                  <p className="text-[11px] font-body text-text-muted">Adaptable a cualquier profesional o comercio</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-border text-xs text-text-secondary">
                <LinkedinIcon size={14} className="text-[#0A66C2]" />
                <span>Desarrollado por <strong>Juan Ruiz</strong></span>
              </div>
            </div>
          </div>

          {/* Right column — 3D Tilt Calendar */}
          <div className="relative w-full">
            <TiltCalendar />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Metrics Strip (Inspo Pedi.bot) ───────────────────────────────────────────

function MetricsStrip() {
  const metrics = [
    { value: 'Multirubro', desc: 'Barberías, Salud, Estética, Más', icon: <LayersIcon size={20} /> },
    { value: '< 30 seg', desc: 'Tiempo para sacar turno', icon: <ClockIcon size={20} /> },
    { value: '24/7', desc: 'Autogestión sin llamadas', icon: <SmartphoneIcon size={20} /> },
    { value: 'Tiempo Real', desc: 'WebSockets con SignalR', icon: <ZapIcon size={20} /> },
  ];

  return (
    <section className="border-y border-border bg-white/90 backdrop-blur-xs py-6 px-4">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:grid-cols-4">
        {metrics.map((m) => (
          <div key={m.value} className="text-center flex flex-col items-center">
            <div className="text-primary mb-1">{m.icon}</div>
            <p className="text-xl sm:text-2xl font-bold font-heading text-text-primary tracking-tight">{m.value}</p>
            <p className="mt-0.5 text-xs text-text-muted">{m.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Problem Section ("¿Te suena familiar?" - Inspo Pedi.bot) ─────────────────

function ProblemsSection() {
  const problems = [
    {
      title: 'Mensajes a las 11 de la noche',
      desc: 'Clientes y pacientes escribiendo por WhatsApp a deshoras preguntando "¿te queda algún hueco mañana?" y esperando respuesta inmediata.',
      icon: <ClockIcon size={20} className="text-destructive" />,
    },
    {
      title: 'Cancelaciones y huecos vacíos',
      desc: 'Clientes que no se presentan a su turno sin avisar, dejándote una hora muerta en la agenda y haciéndote perder ingresos.',
      icon: <AlertCircleIcon size={20} className="text-destructive" />,
    },
    {
      title: 'Cuadernos o notas desordenadas',
      desc: 'Anotar turnos en papel, agendas físicas o notas de chat donde los sobreturnos y los solapamientos de horario son inevitables.',
      icon: <CalendarDaysIcon size={20} className="text-destructive" />,
    },
    {
      title: 'Horas respondiendo lo mismo',
      desc: 'Pasar la mitad de tu jornada enviando listas de precios, horarios libres y datos de transferencia en lugar de enfocarte en atender.',
      icon: <MessageCircleIcon size={20} className="text-destructive" />,
    },
  ];

  return (
    <section className="px-4 py-16 sm:py-20 bg-surface-background">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary">
            ¿Te suena familiar?
          </p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-heading text-text-primary">
            Coordinar turnos por WhatsApp o papel te hace perder tiempo y dinero
          </h2>
          <p className="mt-3 text-sm sm:text-base text-text-secondary max-w-2xl mx-auto">
            La gestión manual desgasta tu energía y limita el crecimiento de tu negocio.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {problems.map((p, idx) => (
            <div
              key={idx}
              className="p-5 sm:p-6 rounded-xl border border-red-200/80 bg-red-50/40 flex items-start gap-4 transition-all hover:bg-red-50/70"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                {p.icon}
              </div>
              <div>
                <h3 className="font-heading font-bold text-text-primary text-base mb-1">{p.title}</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center p-6 rounded-2xl bg-primary/10 border border-primary/20 max-w-3xl mx-auto">
          <p className="text-base sm:text-lg font-medium text-text-primary">
            <strong className="text-primary font-bold">MetaTurnos soluciona todo esto.</strong> Tus clientes reservan solos, pagan seña si lo deseás y reciben recordatorios automáticos.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Multirubro Showcase Section ──────────────────────────────────────────────

interface RubroItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  tag: string;
  headline: string;
  description: string;
  bullets: string[];
  sampleDuration: string;
  sampleDeposit: string;
}

const RUBROS: RubroItem[] = [
  {
    id: 'barberias',
    name: 'Barberías & Peluquerías',
    icon: <ScissorsIcon size={18} />,
    tag: 'Cortes y Estilo',
    headline: 'Agenda por barbero y servicios con duración exacta',
    description: 'Tus clientes eligen su barbero preferido, ven los horarios libres en tiempo real y reservan en 10 segundos desde su celular.',
    bullets: [
      'Turnos sincronizados por cada sillón o estilista',
      'Servicios combinados: Corte, Barba, Tintura, Lavado',
      'Evitá filas y esperas eternas en tu local',
      'Configurá descansos y horarios de almuerzo',
    ],
    sampleDuration: '30 a 60 min',
    sampleDeposit: 'Seña opcional',
  },
  {
    id: 'salud',
    name: 'Médicos & Consultorios',
    icon: <StethoscopeIcon size={18} />,
    tag: 'Salud y Medicina',
    headline: 'Atención profesional con ficha clínica y recordatorios',
    description: 'Ideal para médicos clínicos, pediatras, odontólogos y consultorios. Organizá sobreturnos y adjuntá órdenes o estudios.',
    bullets: [
      'Recordatorios automáticos para reducir ausentismo',
      'Adjuntos de estudios y notas privadas en cada turno',
      'Múltiples especialidades en la misma clínica',
      'Reserva sin que el paciente tenga que crear cuenta',
    ],
    sampleDuration: '20 a 45 min',
    sampleDeposit: 'Cobro de consulta o libre',
  },
  {
    id: 'estetica',
    name: 'Estética & Uñas',
    icon: <SparklesIcon size={18} />,
    tag: 'Belleza y Cuidado',
    headline: 'Congelá turnos cobrando seña previa por Mercado Pago',
    description: 'Protegé tus horas de trabajo en manicuría, pedicuría, pestañas o depilación exigiendo una seña para confirmar el turno.',
    bullets: [
      'Cobro del 30%, 50% o 100% mediante Mercado Pago',
      'Catálogo de servicios con fotos y tiempos de aplicación',
      'Notificación inmediata al acreditarse el pago',
      'Historial de visitas y preferencias de cada clienta',
    ],
    sampleDuration: '45 a 120 min',
    sampleDeposit: 'Seña previa del 50%',
  },
  {
    id: 'psicologia',
    name: 'Psicólogos & Terapeutas',
    icon: <HeartPulseIcon size={18} />,
    tag: 'Terapia y Coaching',
    headline: 'Sesiones presenciales o virtuales con máxima privacidad',
    description: 'Gestión discreta de pacientes para psicólogos, terapeutas holísticos y coaches. Bloqueo de intervalos para descanso entre sesiones.',
    bullets: [
      'Intervalos automáticos de 10-15 min entre pacientes',
      'Enlaces a videollamada incluidos en la confirmación',
      'Manejo de sesiones recurrentes semanales o quincenales',
      'Historial confidencial de cada paciente',
    ],
    sampleDuration: '50 a 60 min',
    sampleDeposit: 'Pago adelantado integrado',
  },
];

function RubrosSection() {
  const [activeRubro, setActiveRubro] = useState(RUBROS[0].id);
  const current = RUBROS.find((r) => r.id === activeRubro) || RUBROS[0];

  return (
    <section id="rubros" className="py-20 px-4 sm:px-6 bg-white border-y border-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-3 border border-primary/20">
            Versatilidad Total
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary">
            Diseñado para cualquier rubro que necesite turnos
          </h2>
          <p className="font-body text-text-secondary mt-3 max-w-2xl mx-auto text-base sm:text-lg">
            No importa si atendés en un consultorio, tenés 4 sillones de barbería o hacés uñas a domicilio. MetaTurnos se adapta a tus reglas.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          {RUBROS.map((r) => {
            const isActive = r.id === activeRubro;
            return (
              <button
                key={r.id}
                onClick={() => setActiveRubro(r.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/25 scale-102'
                    : 'bg-surface-background text-text-secondary hover:bg-surface-soft hover:text-text-primary border border-border/80'
                }`}
              >
                {r.icon}
                <span>{r.name}</span>
              </button>
            );
          })}
        </div>

        {/* Rubro content card */}
        <div className="bg-surface-background rounded-2xl border border-border p-6 sm:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
                  {current.tag}
                </span>
                <span className="text-xs text-text-muted">· Duración estimada: {current.sampleDuration}</span>
              </div>
              <h3 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
                {current.headline}
              </h3>
              <p className="font-body text-text-secondary text-base leading-relaxed">
                {current.description}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {current.bullets.map((b, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2Icon size={18} className="text-primary shrink-0 mt-0.5" />
                    <span className="text-sm font-medium text-text-primary">{b}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-xl p-6 border border-border shadow-md">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {current.icon}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{current.name}</p>
                    <p className="text-xs text-text-muted">Configuración lista</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                  {current.sampleDeposit}
                </span>
              </div>

              <div className="space-y-3 mt-4 text-xs font-body text-text-secondary">
                <div className="p-3 rounded-lg bg-surface-soft/60 flex items-center justify-between">
                  <span>Enlace de reservas directo:</span>
                  <strong className="text-primary font-mono text-[11px]">metaturnos.com/r/tu-negocio</strong>
                </div>
                <div className="p-3 rounded-lg bg-surface-soft/60 flex items-center justify-between">
                  <span>Duración de servicio:</span>
                  <span className="font-semibold text-text-primary">{current.sampleDuration}</span>
                </div>
                <div className="p-3 rounded-lg bg-surface-soft/60 flex items-center justify-between">
                  <span>Notificaciones:</span>
                  <span className="font-semibold text-text-primary">WhatsApp & Email</span>
                </div>
              </div>

              <Link
                to="/register"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-button text-sm font-bold text-white bg-primary hover:bg-primary-dark transition-colors shadow-xs"
              >
                Crear agenda para {current.name.split('&')[0]}
                <ArrowRightIcon size={15} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Real App Screenshots Showcase (Inspo Pedi.bot "Así se ve por dentro") ────

interface ScreenshotItem {
  id: string;
  category: string;
  title: string;
  subtitle: string;
  image: string;
  description: string;
  highlights: string[];
}

const SCREENSHOTS: ScreenshotItem[] = [
  {
    id: 'turnos',
    category: 'Agenda & Calendario',
    title: 'Panel de Agenda en Tiempo Real',
    subtitle: 'Visualización clara de turnos diarios y semanales con estados por color',
    image: '/capturas/Vista_turnos.png',
    description: 'Mirá en un solo vistazo toda la ocupación de la semana. Creá turnos manuales, cambiá estados (Confirmado, Pendiente, Cancelado) y recibí avisos en vivo cuando alguien reserve desde la web.',
    highlights: ['Vistas diaria y semanal', 'Filtro por profesional o consultorio', 'Actualización en tiempo real vía WebSockets'],
  },
  {
    id: 'reservas',
    category: 'Experiencia del Cliente',
    title: 'Página Pública de Reservas',
    subtitle: 'Lo que ven tus clientes en su celular: eligen servicio, profesional, fecha y hora',
    image: '/capturas/pagina_reservas.png',
    description: 'Tu link exclusivo para compartir en Instagram o WhatsApp. El cliente elige su turno en tres toques sin necesidad de registrarse ni instalar aplicaciones pesadas.',
    highlights: ['100% adaptado a móviles', 'Selección de profesional y servicio', 'Confirmación inmediata y comprobante digital'],
  },
  {
    id: 'reportes',
    category: 'Métricas & Finanzas',
    title: 'Panel de Reportes y Facturación',
    subtitle: 'Estadísticas de ingresos, volumen de turnos y tasa de ausentismo',
    image: '/capturas/reportes.png',
    description: 'Controlá cuánto factura tu negocio por día, semana y mes. Identificá qué servicios son los más solicitados y medí el rendimiento individual de cada profesional.',
    highlights: ['Gráficos de facturación periódica', 'Turnos completados vs cancelados', 'Exportación de datos'],
  },
  {
    id: 'equipo',
    category: 'Equipo & Horarios',
    title: 'Gestión de Profesionales y Disponibilidad',
    subtitle: 'Horarios personalizados, días laborales y descansos por colaborador',
    image: '/capturas/equipo.png',
    description: 'Coordiná a todos los integrantes de tu equipo. Asignales horarios de atención específicos, descansos de almuerzo y servicios que cada uno puede atender.',
    highlights: ['Permisos diferenciados por rol', 'Disponibilidad horaria por día', 'Colores distintivos en la agenda'],
  },
  {
    id: 'pagos',
    category: 'Mercado Pago',
    title: 'Cobro de Señas e Integración MP',
    subtitle: 'Asegurá tus turnos cobrando un anticipo mediante Mercado Pago',
    image: '/capturas/Turno_pagos.png',
    description: 'Conectá tu cuenta de Mercado Pago en dos clicks. Cuando un cliente solicita un turno, puede abonar la seña o el total antes de confirmar para garantizar su asistencia.',
    highlights: ['Integración con SDK oficial MP', 'Acreditación instantánea de señas', 'Menor tasa de no-shows (ausentes)'],
  },
];

function ScreenshotsGallery() {
  const [activeTab, setActiveTab] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const activeScreen = SCREENSHOTS[activeTab];

  return (
    <section id="capturas" className="py-24 px-4 sm:px-6 bg-surface-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-3 border border-primary/20">
            Capturas Reales de la App
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-text-primary">
            Así se ve por dentro
          </h2>
          <p className="font-body text-text-secondary mt-3 max-w-2xl mx-auto text-base sm:text-lg">
            Imágenes reales del sistema en funcionamiento. Tocá cualquier captura para ampliarla en pantalla completa.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {SCREENSHOTS.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveTab(idx)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === idx
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-white text-text-secondary hover:text-primary hover:bg-surface-soft border border-border'
              }`}
            >
              {s.category}
            </button>
          ))}
        </div>

        {/* Featured Screenshot Container with Browser Mockup */}
        <div className="bg-white rounded-2xl border border-border shadow-[0_20px_60px_rgba(13,28,46,0.08)] overflow-hidden">
          {/* Browser Chrome Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-background">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 max-w-md mx-4 h-7 bg-white rounded-md border border-border flex items-center px-3 text-xs text-text-muted truncate">
              <span className="text-primary font-medium mr-1">https://</span>
              <span>app.metaturnos.com/admin/{activeScreen.id}</span>
            </div>
            <button
              onClick={() => setLightboxImage(activeScreen.image)}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark transition-colors px-2 py-1 rounded hover:bg-surface-soft"
            >
              <Maximize2Icon size={14} />
              <span className="hidden sm:inline">Ampliar</span>
            </button>
          </div>

          {/* Main Screenshot Image + Zoom Button */}
          <div className="relative group cursor-zoom-in bg-zinc-900/5 p-2 sm:p-4" onClick={() => setLightboxImage(activeScreen.image)}>
            <img
              src={activeScreen.image}
              alt={activeScreen.title}
              className="w-full h-auto max-h-[640px] object-contain rounded-lg shadow-sm border border-border/60 mx-auto transition-transform duration-300 group-hover:scale-[1.008]"
            />
            <div className="absolute bottom-6 right-6 bg-black/75 backdrop-blur-md text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-medium shadow-lg pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
              <Maximize2Icon size={14} />
              <span>Click para ver en tamaño completo</span>
            </div>
          </div>

          {/* Screenshot details caption */}
          <div className="p-6 sm:p-8 bg-white border-t border-border flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">{activeScreen.category}</span>
              <h3 className="font-heading text-xl sm:text-2xl font-bold text-text-primary mt-1">
                {activeScreen.title}
              </h3>
              <p className="font-body text-sm text-text-secondary mt-2 leading-relaxed">
                {activeScreen.description}
              </p>
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              {activeScreen.highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-medium text-text-primary">
                  <CheckIcon size={14} className="text-primary" />
                  <span>{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary thumbnails grid */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { img: '/capturas/Turno_exitoso.png', label: 'Comprobante digital del turno', tag: 'Cliente' },
            { img: '/capturas/disponibilidad_profecional.png', label: 'Configuración de horarios', tag: 'Admin' },
            { img: '/capturas/Servicios.png', label: 'Catálogo de servicios y precios', tag: 'Servicios' },
            { img: '/capturas/Vista_drawer_turno.png', label: 'Ficha y notas del turno', tag: 'Detalle' },
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => setLightboxImage(item.img)}
              className="group cursor-zoom-in rounded-xl border border-border bg-white overflow-hidden shadow-xs hover:shadow-md hover:border-primary/40 transition-all p-2 flex flex-col gap-2"
            >
              <div className="relative aspect-video rounded-lg overflow-hidden bg-zinc-100">
                <img
                  src={item.img}
                  alt={item.label}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {item.tag}
                </span>
              </div>
              <p className="text-xs font-semibold text-text-primary line-clamp-1">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[300] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-6xl w-full max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-primary transition-colors flex items-center gap-1.5 text-sm font-semibold bg-white/10 px-3 py-1 rounded-full"
            >
              <XIcon size={18} />
              <span>Cerrar (Esc)</span>
            </button>
            <img
              src={lightboxImage}
              alt="Captura ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>
        </div>
      )}
    </section>
  );
}

// ─── Value Prop Pipeline ("No es solo un calendario" - Inspo Pedi.bot) ────────

function WorkflowPipeline() {
  const steps = [
    { num: '01', title: 'Link Único', desc: 'Pegás tu enlace en la biografía de Instagram o enviás por WhatsApp.' },
    { num: '02', title: 'Reserva sin Fricción', desc: 'Tu cliente elige profesional, servicio y fecha sin registrarse.' },
    { num: '03', title: 'Seña con Mercado Pago', desc: 'Pago seguro para congelar el turno y asegurar asistencia.' },
    { num: '04', title: 'Recordatorio Automático', desc: 'Notificación 24hs antes con detalles y opción de reagendar.' },
    { num: '05', title: 'Control en Vivo', desc: 'Tu agenda se llena sola mientras vos atendés tu negocio.' },
  ];

  return (
    <section className="py-20 px-4 sm:px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="mb-3 text-xs sm:text-sm font-semibold uppercase tracking-widest text-primary">
            Ciclo Automatizado
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold font-heading text-text-primary">
            Un calendario anota turnos. MetaTurnos los hace rendir.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-text-secondary max-w-2xl mx-auto">
            El sistema cubre el viaje completo: desde que el cliente descubre tu negocio hasta que asiste a su turno y queda en tu base de datos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {steps.map((st, i) => (
            <div
              key={st.num}
              className="relative p-6 rounded-2xl bg-surface-background border border-border hover:border-primary/30 transition-all flex flex-col justify-between"
            >
              <div>
                <span className="font-heading text-2xl font-bold text-primary/40 mb-2 block">{st.num}</span>
                <h3 className="font-heading font-bold text-base text-text-primary mb-1">{st.title}</h3>
                <p className="font-body text-xs sm:text-sm text-text-secondary leading-relaxed">{st.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-primary/40">
                  <ArrowRightIcon size={16} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it Works (4 Steps) ───────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      step: '1',
      title: 'Creás tu cuenta gratis',
      desc: 'En menos de 2 minutos tenés tu espacio listo con el nombre de tu marca o negocio.',
      icon: <ZapIcon size={20} className="text-primary" />,
    },
    {
      step: '2',
      title: 'Cargás servicios y horarios',
      desc: 'Definís qué servicios ofrecés, cuánto duran, sus precios y los horarios de atención.',
      icon: <CalendarDaysIcon size={20} className="text-primary" />,
    },
    {
      step: '3',
      title: 'Compartís tu link en redes',
      desc: 'Pegás tu enlace en Instagram, envialo por WhatsApp o ponelo en tu web.',
      icon: <SmartphoneIcon size={20} className="text-primary" />,
    },
    {
      step: '4',
      title: 'Recibís turnos en vivo',
      desc: 'Tus clientes reservan solos, el sistema valida solapamientos y les manda recordatorio.',
      icon: <CheckCircle2Icon size={20} className="text-primary" />,
    },
  ];

  return (
    <section id="como-funciona" className="py-20 px-4 sm:px-6 bg-surface-background border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-3 border border-primary/20">
            Sin Complicaciones
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary">
            Empezá a recibir reservas en 4 pasos
          </h2>
          <p className="mt-3 text-base sm:text-lg text-text-secondary max-w-xl mx-auto">
            Configuración intuitiva sin curva de aprendizaje.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((st) => (
            <div
              key={st.step}
              className="relative p-6 rounded-2xl bg-white border border-border shadow-xs flex flex-col items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-heading font-bold text-primary text-base">
                {st.step}
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-text-primary mb-1.5">{st.title}</h3>
                <p className="font-body text-xs sm:text-sm text-text-secondary leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Technical Showcase (LinkedIn Post Hook) ──────────────────────────────────

function TechShowcase() {
  const techStack = [
    { name: '.NET 8 C#', role: 'Backend REST API & Clean Architecture' },
    { name: 'SignalR', role: 'WebSockets y sincronización en tiempo real' },
    { name: 'Entity Framework Core', role: 'ORM con soporte PostgreSQL / SQL Server' },
    { name: 'React 18 & TypeScript', role: 'Frontend modular, tipado estricto y Vite' },
    { name: 'Tailwind CSS', role: 'Diseño accesible y tokens personalizados' },
    { name: 'Mercado Pago SDK', role: 'Pasarela de pagos y cobro de señas' },
    { name: 'PWA Ready', role: 'Instalable en iOS y Android sin App Store' },
    { name: 'Docker & CI/CD', role: 'Contenedores listos para deploy en nube' },
  ];

  return (
    <section id="tecnologia" className="py-20 px-4 sm:px-6 bg-[#0E1A16] text-white overflow-hidden relative">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 flex flex-col gap-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-400 text-xs font-bold uppercase tracking-wider w-fit border border-white/15">
              <SparklesIcon size={14} />
              Ingeniería de Software
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Construido con tecnología moderna para resolver un problema real
            </h2>
            <p className="font-body text-white/75 text-base sm:text-lg leading-relaxed">
              Diseñé este proyecto como una demostración integral de ingeniería de software:
              rendimiento de alta concurrencia, sincronización de turnos en milisegundos mediante WebSockets,
              arquitectura limpia y una experiencia de usuario que no requiere manuales.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-button font-bold text-sm bg-[#0A66C2] hover:bg-[#004182] text-white transition-all shadow-md"
              >
                <LinkedinIcon size={18} />
                Conectar con Juan Ruiz en LinkedIn
              </a>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-button font-semibold text-sm bg-white/10 hover:bg-white/15 text-white transition-all border border-white/20"
              >
                Probar la app en vivo
                <ArrowRightIcon size={15} />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8 backdrop-blur-md">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-4">
                Stack de Tecnologías & Arquitectura
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {techStack.map((tech) => (
                  <div key={tech.name} className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-1">
                    <span className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      {tech.name}
                    </span>
                    <span className="text-xs text-white/60">{tech.role}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                <span>Totalmente funcional y desplegable</span>
                <span className="text-emerald-400 font-semibold">100% Responsive</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const items = [
    {
      q: '¿El sistema sirve para cualquier rubro o solo clínicas?',
      a: 'Sirve para cualquier actividad que requiera turnos: barberías, peluquerías, centros de estética, pedicuras, consultorios médicos, psicólogos, kinesiólogos, veterinarias, clases particulares o consultoría. Podés configurar la duración de los servicios y reglas según tu necesidad.',
    },
    {
      q: '¿Mis clientes tienen que descargarse una app para sacar turno?',
      a: 'No. No necesitan instalar ninguna app ni crearse cuenta. Entran directo a tu link (desde Instagram, WhatsApp o navegador), seleccionan el servicio y horario, completan su nombre y teléfono, y confirman en menos de 30 segundos.',
    },
    {
      q: '¿Cómo funciona el cobro de señas con Mercado Pago?',
      a: 'Podés vincular tu cuenta de Mercado Pago desde la sección de ajustes. Al crear un servicio, podés definir si requiere seña previa (ej. 30% o el total) para que el turno quede confirmado únicamente cuando el pago impacte.',
    },
    {
      q: '¿Puedo tener varios profesionales o empleados?',
      a: 'Sí. Podés dar de alta a todo tu equipo. Cada profesional tiene sus propios horarios de atención, sus servicios asignados y un color distintivo en la agenda.',
    },
    {
      q: '¿Cómo se evitan solapamientos y sobreturnos?',
      a: 'El backend calcula automáticamente los bloques libres según la duración de cada servicio y la disponibilidad del profesional. Además, mediante SignalR, si dos clientes intentan reservar el mismo horario, se bloquea al instante para evitar duplicados.',
    },
    {
      q: '¿Puedo instalarlo como app en mi celular?',
      a: 'Sí. MetaTurnos es una Progressive Web App (PWA). Podés agregarla a la pantalla de inicio de tu iPhone o Android y abrirla como cualquier aplicación nativa, rápida y sin ocupar espacio.',
    },
  ];

  return (
    <section id="faq" className="py-24 px-4 sm:px-6 bg-surface-background">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-3 border border-primary/20">
            Preguntas Frecuentes
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-text-primary">
            Todo lo que necesitás saber
          </h2>
          <p className="font-body text-text-secondary mt-3 text-base">
            Respuestas directas sobre el funcionamiento y características de la plataforma.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                open === i
                  ? 'border-primary/40 bg-white shadow-md'
                  : 'border-border bg-white hover:border-primary/25'
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
              >
                <span className={`font-heading font-semibold text-sm sm:text-base ${open === i ? 'text-primary' : 'text-text-primary'}`}>
                  {item.q}
                </span>
                <ChevronDownIcon
                  size={18}
                  className={`shrink-0 text-text-muted transition-transform duration-200 ${open === i ? 'rotate-180 text-primary' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5 pt-1 text-sm font-body text-text-secondary leading-relaxed border-t border-border/40">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA Final ────────────────────────────────────────────────────────────────

function CtaFinal() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-gradient-to-br from-[#164E43] via-[#1D6052] to-[#2F7D6B] relative overflow-hidden text-center text-white">
      {/* Decorative Silk in Background */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden mix-blend-overlay">
        <Silk color="#ffffff" speed={2} scale={1.2} noiseIntensity={0.8} lightMode={false} />
      </div>

      <div className="relative max-w-3xl mx-auto z-10 flex flex-col items-center gap-6">
        <span className="inline-block px-4 py-1.5 rounded-full bg-white/15 text-white text-xs font-bold tracking-wider uppercase border border-white/20">
          Disponible para la comunidad
        </span>
        <h2 className="font-heading text-3xl sm:text-5xl font-bold leading-tight">
          ¿Listo para automatizar los turnos de tu negocio?
        </h2>
        <p className="font-body text-white/85 text-base sm:text-lg max-w-xl">
          Probá el sistema ahora mismo sin costo o conectemos en LinkedIn para charlar sobre desarrollo, arquitectura o implementaciones.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-button font-bold text-primary bg-white hover:bg-white/95 transition-all shadow-xl text-base"
          >
            Crear mi agenda gratis
            <ArrowRightIcon size={18} />
          </Link>
          <a
            href="https://www.linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-button font-semibold text-white bg-white/15 hover:bg-white/25 border border-white/25 transition-all text-base"
          >
            <LinkedinIcon size={18} />
            Conectar en LinkedIn
          </a>
        </div>
        <p className="text-white/60 text-xs">Sin contratos ni tarjeta de crédito requerida.</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-12 px-4 sm:px-6 bg-[#0B1411] text-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <img src="/logo.png" alt="MetaTurnos" className="h-7 w-auto mb-3 brightness-0 invert opacity-90" />
            <p className="font-body text-sm text-white/60 max-w-sm leading-relaxed">
              Sistema integral de gestión y autogestión de turnos para profesionales y comercios.
              Desarrollado con arquitectura moderna .NET 8, SignalR y React.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white transition-colors"
              >
                <LinkedinIcon size={14} className="text-[#0A66C2]" />
                Juan Ruiz
              </a>
            </div>
          </div>

          <div>
            <p className="font-heading font-semibold text-white/90 text-sm mb-3">Navegación</p>
            <nav className="flex flex-col gap-2">
              {[
                { label: 'Características', id: 'caracteristicas' },
                { label: 'Rubros', id: 'rubros' },
                { label: 'Capturas Reales', id: 'capturas' },
                { label: 'Stack Técnico', id: 'tecnologia' },
                { label: 'FAQ', id: 'faq' },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className="text-left font-body text-xs text-white/50 hover:text-white/80 transition-colors"
                >
                  {l.label}
                </button>
              ))}
            </nav>
          </div>

          <div>
            <p className="font-heading font-semibold text-white/90 text-sm mb-3">Acceso al Sistema</p>
            <nav className="flex flex-col gap-2">
              <Link to="/login" className="font-body text-xs text-white/50 hover:text-white/80 transition-colors">
                Iniciar sesión
              </Link>
              <Link to="/register" className="font-body text-xs text-white/50 hover:text-white/80 transition-colors">
                Registrarse gratis
              </Link>
              <Link to="/r/demo" className="font-body text-xs text-white/50 hover:text-white/80 transition-colors">
                Ver flujo de reserva cliente
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/40">
          <p>© {year} MetaTurnos. Proyecto abierto desarrollado por Juan Ruiz.</p>
          <p>Hecho con ♥ para barberos, médicos, estéticas y profesionales independientes.</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page Component ──────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <MetricsStrip />
        <ProblemsSection />
        <WorkflowPipeline />
        <RubrosSection />
        <ScreenshotsGallery />
        <HowItWorks />
        <TechShowcase />
        <FAQ />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  );
}
