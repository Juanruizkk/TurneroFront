import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon,
  CalendarDaysIcon, BellIcon, BarChart3Icon, UsersIcon,
  SmartphoneIcon, ShieldCheckIcon, ZapIcon, ClockIcon,
  StarIcon, TrendingUpIcon,
} from 'lucide-react';
import { planesPublicoApi } from '../../api/planes';
import type { Plan } from '../../types';

// ─── Demo calendar data ────────────────────────────────────────────────────────

const DEMO_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];
const DEMO_DATES = ['14', '15', '16', '17', '18'];

type TurnoStatus = 'confirmado' | 'pendiente' | 'cancelado';

interface DemoTurno {
  id: number;
  dia: number;
  hora: string;
  servicio: string;
  cliente: string;
  status: TurnoStatus;
  color: string;
}

const DEMO_TURNOS: DemoTurno[] = [
  { id: 1, dia: 0, hora: '09:00', servicio: 'Consulta gral.', cliente: 'María López', status: 'confirmado', color: '#2F7D6B' },
  { id: 2, dia: 0, hora: '11:30', servicio: 'Control anual', cliente: 'Juan García', status: 'pendiente', color: '#5B8DEF' },
  { id: 3, dia: 1, hora: '10:00', servicio: 'Kinesiología', cliente: 'Ana Torres', status: 'confirmado', color: '#8B5CF6' },
  { id: 4, dia: 1, hora: '14:00', servicio: 'Nutrición', cliente: 'Paula Soto', status: 'confirmado', color: '#EC4899' },
  { id: 5, dia: 2, hora: '09:30', servicio: 'Nutrición', cliente: 'Carlos Ruiz', status: 'cancelado', color: '#EF4444' },
  { id: 6, dia: 2, hora: '15:00', servicio: 'Fisioterapia', cliente: 'Marta Gil', status: 'confirmado', color: '#2F7D6B' },
  { id: 7, dia: 3, hora: '14:00', servicio: 'Psicología', cliente: 'Laura Vidal', status: 'confirmado', color: '#F59E0B' },
  { id: 8, dia: 4, hora: '16:30', servicio: 'Odontología', cliente: 'Diego Méndez', status: 'pendiente', color: '#5B8DEF' },
];

const STATUS_STYLES: Record<TurnoStatus, { ribbon: string; bg: string; dot: string }> = {
  confirmado: { ribbon: 'bg-primary', bg: 'bg-primary/10', dot: 'bg-primary' },
  pendiente:  { ribbon: 'bg-warning',  bg: 'bg-warning/10',  dot: 'bg-warning' },
  cancelado:  { ribbon: 'bg-error',    bg: 'bg-error/10',    dot: 'bg-error' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrecio(precio: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(precio);
}

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
    { label: 'Capturas', id: 'capturas' },
    { label: 'Planes', id: 'planes' },
    { label: 'Testimonios', id: 'testimonios' },
    { label: 'FAQ', id: 'faq' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'shadow-[0_2px_24px_rgba(13,28,46,0.10)] backdrop-blur-xl bg-white/90'
          : 'backdrop-blur-md bg-white/70'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <img src="/logo.png" alt="MetaTurnos" className="h-8 w-auto" />

        <nav className="hidden md:flex items-center gap-7 text-sm font-body text-text-secondary">
          {navLinks.map((l) => (
            <button
              key={l.id}
              onClick={() => scrollTo(l.id)}
              className="hover:text-primary transition-colors font-medium"
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden md:block px-4 py-2 rounded-button text-sm font-semibold font-body text-primary border border-primary/30 hover:bg-primary/5 transition-colors"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-button text-sm font-semibold font-body text-white bg-gradient-to-r from-[#096453] to-primary hover:opacity-90 transition-opacity shadow-sm"
          >
            Probar gratis
          </Link>
          <button
            className="md:hidden p-2 text-text-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            <div className="w-5 h-0.5 bg-current mb-1 transition-all" />
            <div className="w-5 h-0.5 bg-current mb-1" />
            <div className="w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-border px-6 py-4 flex flex-col gap-3">
          {navLinks.map((l) => (
            <button
              key={l.id}
              onClick={() => { scrollTo(l.id); setMobileOpen(false); }}
              className="text-left text-sm font-body text-text-secondary hover:text-primary py-1"
            >
              {l.label}
            </button>
          ))}
          <div className="border-t border-border pt-3 mt-1">
            <Link
              to="/login"
              onClick={() => setMobileOpen(false)}
              className="block w-full text-center px-4 py-2.5 rounded-button text-sm font-semibold font-body text-primary border border-primary/30 hover:bg-primary/5 transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

// ─── 3D Tilt Calendar (hero) ─────────────────────────────────────────────────

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
      setTilt({ x: dy * -10, y: dx * 12 });
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
      className="relative flex items-center justify-center w-full h-full min-h-[480px]"
      style={{ perspective: '1200px' }}
    >
      {/* Glow blobs */}
      <div className="absolute top-10 right-10 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-36 h-36 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      <div
        ref={cardRef}
        className="relative w-full max-w-[520px] rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(13,28,46,0.18),0_0_0_1px_rgba(47,125,107,0.12)]"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(${isHovered ? 1.02 : 1})`,
          transition: isHovered ? 'transform 0.08s linear' : 'transform 0.6s cubic-bezier(0.23,1,0.32,1)',
          transformStyle: 'preserve-3d',
          background: 'rgba(255,255,255,0.97)',
        }}
      >
        {/* Calendar header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDaysIcon size={14} className="text-primary" />
            </div>
            <span className="font-heading font-bold text-text-primary text-sm">Agenda Semanal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-0.5 text-xs font-body">
              {['Día', 'Semana', 'Mes'].map((tab, i) => (
                <span
                  key={tab}
                  className={`px-2.5 py-1 rounded-badge cursor-default text-[11px] font-medium ${
                    i === 1
                      ? 'bg-primary text-white'
                      : 'text-text-muted'
                  }`}
                >
                  {tab}
                </span>
              ))}
            </div>
            <div className="flex gap-0.5">
              <button className="p-1 rounded text-text-muted hover:bg-surface-soft">
                <ChevronLeftIcon size={14} />
              </button>
              <button className="p-1 rounded text-text-muted hover:bg-surface-soft">
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-5 border-b border-border bg-surface-background">
          {DEMO_DAYS.map((day, i) => (
            <div key={day} className="py-2 flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-bold text-text-muted uppercase tracking-wide">{day}</span>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 1 ? 'bg-primary text-white' : 'text-text-secondary'
                }`}
              >
                {DEMO_DATES[i]}
              </div>
            </div>
          ))}
        </div>

        {/* Grid columns */}
        <div className="grid grid-cols-5 divide-x divide-border" style={{ minHeight: 240 }}>
          {DEMO_DAYS.map((day, i) => (
            <div key={day} className="p-1.5 flex flex-col gap-1.5">
              {byDay[i].map((turno) => {
                const s = STATUS_STYLES[turno.status];
                return (
                  <div
                    key={turno.id}
                    className={`flex overflow-hidden rounded-md shadow-sm`}
                    style={{ background: `${turno.color}14` }}
                  >
                    <div className="w-1 shrink-0 rounded-l-md" style={{ background: turno.color }} />
                    <div className="px-1.5 py-1.5 min-w-0">
                      <p className="text-[9px] font-bold leading-tight text-text-primary truncate">{turno.hora}</p>
                      <p className="text-[9px] leading-tight text-text-secondary truncate">{turno.servicio}</p>
                      <p className="text-[9px] leading-none text-text-muted truncate">{turno.cliente.split(' ')[0]}</p>
                    </div>
                  </div>
                );
              })}
              {byDay[i].length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full h-px bg-border/40" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex gap-4 px-4 py-2.5 border-t border-border bg-surface-background/60">
          {(Object.entries({ confirmado: 'Confirmado', pendiente: 'Pendiente', cancelado: 'Cancelado' }) as [TurnoStatus, string][]).map(
            ([key, label]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${STATUS_STYLES[key].dot}`} />
                <span className="text-[9px] font-body text-text-muted">{label}</span>
              </div>
            )
          )}
        </div>

        {/* Reflection sheen */}
        <div
          className="absolute inset-0 pointer-events-none rounded-2xl"
          style={{
            background: `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 50%, transparent 100%)`,
          }}
        />
      </div>

      {/* Floating badges */}
      <div
        className="absolute top-8 -left-4 bg-white rounded-xl px-3 py-2 shadow-[0_8px_24px_rgba(13,28,46,0.12)] flex items-center gap-2 border border-border"
        style={{ transform: 'translateZ(20px)' }}
      >
        <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
          <TrendingUpIcon size={14} className="text-success" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-primary leading-none">+32%</p>
          <p className="text-[9px] text-text-muted">menos ausentes</p>
        </div>
      </div>

      <div
        className="absolute bottom-10 -right-4 bg-white rounded-xl px-3 py-2 shadow-[0_8px_24px_rgba(13,28,46,0.12)] flex items-center gap-2 border border-border"
        style={{ transform: 'translateZ(20px)' }}
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <BellIcon size={14} className="text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-text-primary leading-none">Recordatorio</p>
          <p className="text-[9px] text-text-muted">enviado vía WhatsApp</p>
        </div>
      </div>
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

// ─── Install Modal ────────────────────────────────────────────────────────────

function InstallModal({ isIOS, onClose }: { isIOS: boolean; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mb-5 sm:hidden" />
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <SmartphoneIcon size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-text-primary text-base">Instalar MetaTurnos</h3>
              <p className="text-xs font-body text-text-muted">Acceso rápido desde tu pantalla de inicio</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface text-text-muted text-xl leading-none">×</button>
        </div>
        {isIOS ? (
          <>
            <p className="text-sm font-body text-text-secondary mb-4">Seguí estos pasos en Safari:</p>
            <ol className="flex flex-col gap-3">
              {[
                { step: '1', text: 'Tocá el botón Compartir', icon: '⬆️' },
                { step: '2', text: 'Deslizá y elegí "Agregar a pantalla de inicio"', icon: '➕' },
                { step: '3', text: 'Confirmá tocando "Agregar"', icon: '✅' },
              ].map(({ step, text, icon }) => (
                <li key={step} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <span className="text-[10px] font-bold font-body text-text-muted uppercase tracking-wider">Paso {step}</span>
                    <p className="text-sm font-body text-text-primary">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs font-body text-text-muted mt-4 text-center">Asegurate de usar Safari para que funcione</p>
          </>
        ) : (
          <>
            <p className="text-sm font-body text-text-secondary mb-4">Seguí estos pasos en Chrome:</p>
            <ol className="flex flex-col gap-3">
              {[
                { step: '1', text: 'Tocá el menú ⋮ arriba a la derecha', icon: '⋮' },
                { step: '2', text: 'Elegí "Agregar a pantalla de inicio"', icon: '➕' },
                { step: '3', text: 'Confirmá tocando "Agregar"', icon: '✅' },
              ].map(({ step, text, icon }) => (
                <li key={step} className="flex items-center gap-3 p-3 rounded-xl bg-surface">
                  <span className="text-xl w-6 text-center">{icon}</span>
                  <div>
                    <span className="text-[10px] font-bold font-body text-text-muted uppercase tracking-wider">Paso {step}</span>
                    <p className="text-sm font-body text-text-primary">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function Hero() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const isIOS = /iphone|ipad|ipod/i.test(typeof navigator !== 'undefined' ? navigator.userAgent : '');

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      (deferredPrompt as any).prompt();
      await (deferredPrompt as any).userChoice;
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <>
    <section className="relative pt-28 pb-16 px-6 overflow-hidden bg-gradient-to-b from-[#F0F7F4] to-white">
      {/* Background pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #2F7D6B22 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left column */}
          <div className="flex flex-col gap-6 lg:gap-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-badge bg-primary/10 text-primary text-xs font-bold font-body tracking-wider uppercase w-fit border border-primary/20">
              <ZapIcon size={12} />
              Sin instalaciones · 100% en la nube
            </span>

            <div>
              <h1 className="font-heading text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-text-primary leading-[1.15] tracking-tight">
                La agenda online que tu clínica
                {' '}
                <span className="relative">
                  <span className="relative z-10 text-primary">necesitaba</span>
                  <span
                    className="absolute bottom-1 left-0 right-0 h-3 bg-primary/10 -z-0 rounded-sm"
                  />
                </span>
              </h1>
              <p className="mt-5 font-body text-lg text-text-secondary leading-relaxed max-w-lg">
                Gestioná turnos, enviá recordatorios automáticos y cobrá en línea — todo desde el navegador, sin instalar nada.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-button font-bold font-body text-white bg-gradient-to-r from-[#096453] to-primary hover:opacity-90 transition-opacity shadow-[0_4px_20px_rgba(47,125,107,0.35)] text-sm"
              >
                Empezar gratis — 14 días
                <ChevronRightIcon size={16} />
              </Link>
              <button
                onClick={() => scrollTo('capturas')}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-button font-semibold font-body text-primary border-2 border-primary/30 bg-white hover:bg-primary/5 transition-colors text-sm"
              >
                Ver capturas
              </button>
            </div>

            {/* Mobile-only: login + install app */}
            {!isStandalone && (
              <div className="flex sm:hidden gap-3">
                <Link
                  to="/login"
                  className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-button text-sm font-semibold font-body text-primary border border-primary/30 bg-white hover:bg-primary/5 transition-colors"
                >
                  Iniciar sesión
                </Link>
                <button
                  onClick={handleInstall}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-button text-sm font-semibold font-body text-text-secondary border border-border bg-white hover:bg-surface transition-colors"
                >
                  <SmartphoneIcon size={15} />
                  Instalar app
                </button>
              </div>
            )}

            <div className="flex items-center gap-6 pt-2">
              <div className="flex -space-x-2">
                {['#2F7D6B', '#5B8DEF', '#8B5CF6', '#EC4899'].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-[10px] font-bold"
                    style={{ background: c }}
                  >
                    {['MR', 'JG', 'AT', 'PV'][i]}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => <StarIcon key={i} size={12} className="text-warning fill-warning" />)}
                </div>
                <p className="text-xs font-body text-text-muted mt-0.5">+500 profesionales de la salud</p>
              </div>
            </div>
          </div>

          {/* Right column — tilt calendar */}
          <div className="relative">
            <TiltCalendar />
          </div>
        </div>
      </div>
    </section>

    {showInstallModal && <InstallModal isIOS={isIOS} onClose={() => setShowInstallModal(false)} />}
    </>
  );
}

// ─── Counters ─────────────────────────────────────────────────────────────────

interface CounterProps { target: number; suffix?: string; prefix?: string; label: string; icon: React.ReactNode; }

function Counter({ target, suffix = '', prefix = '', label, icon }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const animated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1800;
          const start = performance.now();
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3 p-6">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="text-center">
        <p className="font-heading text-3xl md:text-4xl font-bold text-text-primary tabular-nums">
          {prefix}{count.toLocaleString('es-AR')}{suffix}
        </p>
        <p className="font-body text-sm text-text-secondary mt-1">{label}</p>
      </div>
    </div>
  );
}

function Stats() {
  const stats = [
    { target: 500, suffix: '+', label: 'Profesionales activos', icon: <UsersIcon size={22} /> },
    { target: 100, suffix: '%', label: 'Web · sin instalar nada', icon: <SmartphoneIcon size={22} /> },
    { target: 10000, suffix: '+', label: 'Turnos gestionados', icon: <CalendarDaysIcon size={22} /> },
    { target: 14, suffix: ' días', prefix: '', label: 'Prueba gratuita completa', icon: <ClockIcon size={22} /> },
  ];

  return (
    <section className="py-4 px-6 bg-white border-y border-border">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border">
          {stats.map((s) => (
            <Counter key={s.label} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  const items = [
    {
      icon: <CalendarDaysIcon size={22} />,
      title: 'Agenda inteligente',
      desc: 'Vista diaria, semanal y mensual. Arrastrá, reagendá y confirmá turnos al instante desde cualquier dispositivo.',
      color: '#2F7D6B',
    },
    {
      icon: <BellIcon size={22} />,
      title: 'Recordatorios automáticos',
      desc: 'Reducí el ausentismo con notificaciones por WhatsApp y email antes de cada turno.',
      color: '#5B8DEF',
    },
    {
      icon: <BarChart3Icon size={22} />,
      title: 'Reportes y caja',
      desc: 'Controlá ingresos, facturación y métricas clave desde el panel de administración en tiempo real.',
      color: '#8B5CF6',
    },
    {
      icon: <UsersIcon size={22} />,
      title: 'Multi-profesional',
      desc: 'Gestioná varios profesionales con colores, roles y permisos diferenciados dentro del mismo panel.',
      color: '#EC4899',
    },
    {
      icon: <SmartphoneIcon size={22} />,
      title: 'Reservas online 24/7',
      desc: 'Tus pacientes reservan desde el celular sin llamadas ni intermediarios, a cualquier hora del día.',
      color: '#F59E0B',
    },
    {
      icon: <ShieldCheckIcon size={22} />,
      title: 'Seguro y privado',
      desc: 'Datos cifrados, acceso por rol y cumplimiento de privacidad en cada consulta. Tu información protegida.',
      color: '#10B981',
    },
  ];

  return (
    <section id="caracteristicas" className="py-24 px-6 bg-surface-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-badge bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4 border border-primary/20">
            Características
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
            Todo lo que tu clínica necesita
          </h2>
          <p className="font-body text-text-secondary mt-4 max-w-2xl mx-auto text-lg">
            Diseñado para equipos de salud que quieren enfocarse en sus pacientes, no en la administración.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <div
              key={item.title}
              className="group p-6 rounded-card bg-white border border-border hover:border-primary/30 shadow-[0_2px_12px_rgba(13,28,46,0.04)] hover:shadow-[0_8px_32px_rgba(47,125,107,0.10)] transition-all duration-300 flex flex-col gap-4"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{ background: `${item.color}18`, color: item.color }}
              >
                {item.icon}
              </div>
              <div>
                <h3 className="font-heading font-bold text-text-primary text-base mb-1.5">{item.title}</h3>
                <p className="font-body text-text-secondary text-sm leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Screenshots ──────────────────────────────────────────────────────────────

function Screenshots() {
  const [active, setActive] = useState(0);

  const screens = [
    {
      title: 'Panel de agenda',
      desc: 'Vista semanal con todos los turnos por profesional, códigos de color y estados en tiempo real.',
      mockup: (
        <div className="w-full bg-white rounded-xl overflow-hidden border border-border shadow-inner">
          {/* Toolbar mock */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-background">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-error/60" />
              <div className="w-3 h-3 rounded-full bg-warning/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <div className="flex-1 h-6 bg-border/40 rounded-badge mx-4 flex items-center px-3">
              <span className="text-[10px] text-text-muted">app.metaturnos.com/admin/agenda</span>
            </div>
          </div>
          {/* Simulated agenda */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading font-bold text-xs text-text-primary">Semana del 14 al 18 de abril</span>
              <div className="flex gap-1">
                {['Día', 'Semana', 'Mes'].map((v, i) => (
                  <span key={v} className={`px-2 py-0.5 rounded text-[9px] font-medium ${i===1?'bg-primary text-white':'text-text-muted'}`}>{v}</span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {DEMO_DAYS.map((day, di) => (
                <div key={day} className="flex flex-col gap-1">
                  <div className="text-center">
                    <p className="text-[8px] font-bold text-text-muted uppercase">{day}</p>
                    <div className={`w-5 h-5 mx-auto rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5 ${di===1?'bg-primary text-white':'text-text-secondary'}`}>
                      {DEMO_DATES[di]}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 min-h-[100px]">
                    {DEMO_TURNOS.filter(t=>t.dia===di).map(t => (
                      <div key={t.id} className="rounded overflow-hidden flex" style={{background:`${t.color}18`}}>
                        <div className="w-0.5 shrink-0" style={{background:t.color}} />
                        <div className="px-1 py-0.5">
                          <p className="text-[7px] font-bold text-text-primary leading-none">{t.hora}</p>
                          <p className="text-[7px] text-text-muted leading-tight truncate">{t.cliente.split(' ')[0]}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Ficha del paciente',
      desc: 'Historial completo de turnos, notas y datos de contacto de cada cliente en un solo lugar.',
      mockup: (
        <div className="w-full bg-white rounded-xl overflow-hidden border border-border shadow-inner">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-background">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-error/60" /><div className="w-3 h-3 rounded-full bg-warning/60" /><div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <div className="flex-1 h-6 bg-border/40 rounded-badge mx-4 flex items-center px-3">
              <span className="text-[10px] text-text-muted">app.metaturnos.com/admin/clientes</span>
            </div>
          </div>
          <div className="p-4 flex gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">ML</div>
                <div>
                  <p className="font-heading font-bold text-sm text-text-primary">María López</p>
                  <p className="text-[10px] text-text-muted">maria.lopez@email.com · +54 11 4567-8901</p>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[9px] font-bold text-text-muted uppercase tracking-wide">Últimos turnos</p>
                {[
                  { f: '14/04', s: 'Consulta gral.', st: 'confirmado' },
                  { f: '28/03', s: 'Control anual', st: 'confirmado' },
                  { f: '15/03', s: 'Kinesiología', st: 'cancelado' },
                ].map((t, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/40">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${t.st==='confirmado'?'bg-success':'bg-error'}`} />
                      <p className="text-[9px] font-medium text-text-primary">{t.f} — {t.s}</p>
                    </div>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-badge ${t.st==='confirmado'?'bg-success/10 text-success':'bg-error/10 text-error'}`}>
                      {t.st}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Reportes y caja',
      desc: 'Estadísticas claras de ingresos, turnos atendidos, cancelaciones y tendencias mensuales.',
      mockup: (
        <div className="w-full bg-white rounded-xl overflow-hidden border border-border shadow-inner">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-background">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-error/60" /><div className="w-3 h-3 rounded-full bg-warning/60" /><div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <div className="flex-1 h-6 bg-border/40 rounded-badge mx-4 flex items-center px-3">
              <span className="text-[10px] text-text-muted">app.metaturnos.com/admin/reportes</span>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Ingresos', value: '$284.500', color: '#2F7D6B', delta: '+12%' },
                { label: 'Turnos', value: '147', color: '#5B8DEF', delta: '+8%' },
                { label: 'Cancelados', value: '9', color: '#EF4444', delta: '-3%' },
              ].map((c) => (
                <div key={c.label} className="rounded-lg p-2 border border-border">
                  <p className="text-[8px] text-text-muted font-medium uppercase">{c.label}</p>
                  <p className="font-heading font-bold text-xs text-text-primary mt-0.5">{c.value}</p>
                  <span className="text-[8px] font-bold" style={{color:c.color}}>{c.delta}</span>
                </div>
              ))}
            </div>
            {/* Bar chart mock */}
            <p className="text-[8px] font-bold text-text-muted uppercase tracking-wide mb-1.5">Turnos por día</p>
            <div className="flex items-end gap-1 h-16">
              {[45, 80, 60, 95, 70, 55, 85, 40, 90, 75, 65, 88].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm"
                  style={{ height: `${h}%`, background: i === 9 ? '#2F7D6B' : '#2F7D6B22' }}
                />
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Reservas de pacientes',
      desc: 'Tu link personalizado donde los pacientes eligen servicio, profesional, día y hora sin llamarte.',
      mockup: (
        <div className="w-full bg-white rounded-xl overflow-hidden border border-border shadow-inner">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface-background">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-error/60" /><div className="w-3 h-3 rounded-full bg-warning/60" /><div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <div className="flex-1 h-6 bg-border/40 rounded-badge mx-4 flex items-center px-3">
              <span className="text-[10px] text-text-muted">metaturnos.com/r/clinica-bienestar</span>
            </div>
          </div>
          <div className="p-4">
            <div className="text-center mb-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-1.5">
                <CalendarDaysIcon size={18} className="text-primary" />
              </div>
              <p className="font-heading font-bold text-xs text-text-primary">Clínica Bienestar</p>
              <p className="text-[9px] text-text-muted">Elegí tu turno</p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[8px] font-bold text-text-muted uppercase tracking-wide">Servicios</p>
              {['Consulta general', 'Kinesiología', 'Nutrición'].map((s, i) => (
                <div key={s} className={`flex items-center justify-between p-2 rounded-lg border text-[9px] font-medium ${i===0?'border-primary/50 bg-primary/5 text-primary':'border-border text-text-secondary'}`}>
                  {s}
                  {i===0 && <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center"><CheckIcon size={7} className="text-white" /></div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="capturas" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-badge bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4 border border-primary/20">
            Capturas de pantalla
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
            Mirá cómo se ve por dentro
          </h2>
          <p className="font-body text-text-secondary mt-4 max-w-xl mx-auto text-base">
            Una interfaz limpia y moderna que hace que gestionar tu agenda sea un placer.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Tab list */}
          <div className="flex flex-col gap-3">
            {screens.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setActive(i)}
                className={`flex items-start gap-4 p-4 rounded-card text-left transition-all duration-200 border ${
                  active === i
                    ? 'bg-primary/5 border-primary/30 shadow-sm'
                    : 'bg-surface-background border-transparent hover:border-border'
                }`}
              >
                <div
                  className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    active === i ? 'bg-primary text-white' : 'bg-border text-text-muted'
                  }`}
                >
                  {i + 1}
                </div>
                <div>
                  <p className={`font-heading font-bold text-sm ${active === i ? 'text-primary' : 'text-text-primary'}`}>
                    {s.title}
                  </p>
                  <p className="font-body text-xs text-text-secondary mt-0.5 leading-relaxed">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl blur-xl" />
            <div className="relative bg-surface-background rounded-2xl p-4 border border-border shadow-[0_20px_60px_rgba(13,28,46,0.08)]">
              {screens[active].mockup}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Plans ────────────────────────────────────────────────────────────────────

function PlanCard({ plan, destacado }: { plan: Plan; destacado: boolean }) {
  const navigate = useNavigate();
  const esCustom = plan.precioMensual === 0;

  const features: string[] = [
    plan.maxTurnosMes == null ? 'Turnos ilimitados' : `Hasta ${plan.maxTurnosMes} turnos/mes`,
    `Hasta ${plan.maxUsuarios} profesionale${plan.maxUsuarios === 1 ? '' : 's'}`,
    ...(plan.tieneReportes ? ['Reportes avanzados'] : []),
    ...(plan.descripcion ? [plan.descripcion] : []),
    'Soporte por WhatsApp',
    'Actualizaciones incluidas',
  ];

  return (
    <div
      className={`relative flex flex-col rounded-card p-7 transition-all duration-300 hover:-translate-y-1 ${
        destacado
          ? 'bg-gradient-to-b from-[#0A6B58] to-primary text-white shadow-[0_24px_60px_rgba(47,125,107,0.35)]'
          : 'bg-white shadow-[0_8px_32px_rgba(13,28,46,0.06)] border border-border hover:border-primary/30'
      }`}
    >
      {destacado && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="px-4 py-1 rounded-badge text-[11px] font-bold text-primary bg-white shadow-sm uppercase tracking-wide">
            Más popular
          </span>
        </div>
      )}

      {plan.duracionTrialDias > 0 && (
        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-badge text-[11px] font-semibold w-fit mb-4 ${
          destacado ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
        }`}>
          <ZapIcon size={10} />
          {plan.duracionTrialDias} días gratis
        </div>
      )}

      <h3 className={`font-heading text-xl font-bold ${destacado ? 'text-white' : 'text-text-primary'}`}>
        {plan.nombre}
      </h3>

      <div className="mt-4 mb-7">
        {esCustom ? (
          <span className={`font-heading text-3xl font-bold ${destacado ? 'text-white' : 'text-text-primary'}`}>Custom</span>
        ) : (
          <>
            <span className={`font-heading text-4xl font-bold ${destacado ? 'text-white' : 'text-text-primary'}`}>
              {formatPrecio(plan.precioMensual)}
            </span>
            <span className={`font-body text-sm ml-1 ${destacado ? 'text-white/70' : 'text-text-muted'}`}>/mes</span>
          </>
        )}
      </div>

      <ul className="flex flex-col gap-3 mb-8 flex-1">
        {features.map((f) => (
          <li key={f} className={`flex items-start gap-2.5 font-body text-sm ${destacado ? 'text-white/90' : 'text-text-secondary'}`}>
            <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${destacado ? 'bg-white/25' : 'bg-primary/10'}`}>
              <CheckIcon size={10} className={destacado ? 'text-white' : 'text-primary'} />
            </div>
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-auto">
        {esCustom ? (
          <a
            href="mailto:ventas@metaturnos.com"
            className={`block w-full text-center px-4 py-3 rounded-button font-semibold font-body text-sm transition-colors ${
              destacado
                ? 'bg-white/20 text-white hover:bg-white/30 border border-white/30'
                : 'text-primary border-2 border-primary hover:bg-primary/5'
            }`}
          >
            Contactar ventas
          </a>
        ) : (
          <button
            onClick={() => navigate(`/register?planId=${plan.id}`)}
            className={`w-full px-4 py-3 rounded-button font-semibold font-body text-sm transition-all ${
              destacado
                ? 'bg-white text-primary hover:bg-white/90 shadow-md'
                : 'text-white bg-gradient-to-r from-[#096453] to-primary hover:opacity-90 shadow-sm'
            }`}
          >
            Elegir {plan.nombre}
          </button>
        )}
      </div>
    </div>
  );
}

function PlanSkeleton() {
  return (
    <div className="rounded-card p-7 bg-white border border-border animate-pulse">
      <div className="h-5 w-24 bg-surface-soft rounded mb-5" />
      <div className="h-7 w-36 bg-surface-soft rounded mb-4" />
      <div className="h-10 w-28 bg-surface-soft rounded mb-7" />
      {[1,2,3,4].map((i) => <div key={i} className="h-4 w-full bg-surface-soft rounded mb-3" />)}
      <div className="h-11 w-full bg-surface-soft rounded mt-8" />
    </div>
  );
}

function Planes() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    planesPublicoApi.listar().then((data) => {
      setPlanes(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <section id="planes" className="py-24 px-6 bg-surface-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-badge bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4 border border-primary/20">
            Precios
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
            Planes diseñados para crecer
          </h2>
          <p className="font-body text-text-secondary mt-4 max-w-xl mx-auto text-lg">
            Sin costos ocultos. Elegí el plan que mejor se adapta a tu volumen de pacientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-center">
          {loading
            ? [1,2,3].map((i) => <PlanSkeleton key={i} />)
            : planes.map((plan, idx) => (
                <PlanCard key={plan.id} plan={plan} destacado={idx === 1} />
              ))}
        </div>

        <p className="text-center font-body text-xs text-text-muted mt-8">
          * Precios en ARS. Podés cancelar en cualquier momento durante el período de prueba.
        </p>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials() {
  const items = [
    {
      quote: 'Desde que usamos MetaTurnos nuestros pacientes ya no llaman para sacar turno. Todo es automático y los recordatorios redujeron los ausentes a casi cero.',
      name: 'Dra. Valentina Ríos',
      role: 'Médica clínica · Córdoba',
      avatar: 'VR',
      color: '#2F7D6B',
      stars: 5,
    },
    {
      quote: 'La agenda semanal es exactamente lo que necesitábamos. Tres kinesiólogos coordinados, sin superposición de turnos y con vista de caja integrada.',
      name: 'Lic. Matías Fernández',
      role: 'Centro de Kinesiología · Rosario',
      avatar: 'MF',
      color: '#5B8DEF',
      stars: 5,
    },
    {
      quote: 'Probé muchas plataformas y esta es la única que funciona perfectamente desde el celular. Mis pacientes pueden reservar solos y yo manejo todo desde donde estoy.',
      name: 'Lic. Camila Torres',
      role: 'Psicóloga · Buenos Aires',
      avatar: 'CT',
      color: '#8B5CF6',
      stars: 5,
    },
    {
      quote: 'El onboarding fue rapidísimo. En menos de una hora ya tenía el sistema funcionando con todos mis servicios cargados y el link para compartir con pacientes.',
      name: 'Dr. Sebastián Morales',
      role: 'Odontólogo · Mendoza',
      avatar: 'SM',
      color: '#EC4899',
      stars: 5,
    },
    {
      quote: 'Los reportes de caja me ahorraron horas de trabajo manual. Ahora sé exactamente cuánto facturó cada profesional por semana con un solo vistazo.',
      name: 'Lic. Florencia Castro',
      role: 'Directora de clínica · Santa Fe',
      avatar: 'FC',
      color: '#F59E0B',
      stars: 5,
    },
    {
      quote: 'Nunca imaginé que un sistema de turnos podría ser tan intuitivo. En dos días mi recepcionista ya lo manejaba sola sin necesitar capacitación extra.',
      name: 'Dr. Nicolás Herrera',
      role: 'Traumatólogo · La Plata',
      avatar: 'NH',
      color: '#10B981',
      stars: 5,
    },
  ];

  return (
    <section id="testimonios" className="py-24 px-6 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-badge bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4 border border-primary/20">
            Testimonios
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
            Lo que dicen los profesionales
          </h2>
          <p className="font-body text-text-secondary mt-4 max-w-xl mx-auto text-base">
            Más de 500 profesionales de la salud ya confían en MetaTurnos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((t) => (
            <div
              key={t.name}
              className="flex flex-col gap-4 p-6 rounded-card bg-surface-background border border-border hover:border-primary/20 hover:shadow-[0_8px_32px_rgba(47,125,107,0.08)] transition-all duration-300"
            >
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <StarIcon key={i} size={14} className="text-warning fill-warning" />
                ))}
              </div>
              <p className="font-body text-text-secondary text-sm leading-relaxed flex-1">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}bb)` }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="font-heading font-bold text-sm text-text-primary">{t.name}</p>
                  <p className="font-body text-xs text-text-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
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
      q: '¿Necesito instalar algo para usar MetaTurnos?',
      a: 'No. MetaTurnos es 100% web. Accedés desde cualquier navegador, en computadora o celular, sin descargar ni instalar ninguna aplicación.',
    },
    {
      q: '¿Cómo funciona el período de prueba gratuito?',
      a: 'Tenés 14 días de acceso completo a todas las funcionalidades del plan elegido, sin necesidad de tarjeta de crédito. Si no te convence, no se te cobra nada.',
    },
    {
      q: '¿Puedo tener múltiples profesionales en el mismo panel?',
      a: 'Sí. Podés agregar tantos profesionales como permita tu plan, cada uno con sus propios turnos, disponibilidades y colores identificadores en la agenda.',
    },
    {
      q: '¿Los pacientes pueden reservar solos?',
      a: 'Exactamente. Tenés un link personalizado (metaturnos.com/r/tu-clinica) que podés compartir por WhatsApp, Instagram o tu sitio web. Tus pacientes eligen servicio, profesional y horario sin llamarte.',
    },
    {
      q: '¿Cómo se envían los recordatorios automáticos?',
      a: 'Los recordatorios se envían automáticamente por WhatsApp y/o email según configuración, con antelación configurable (24hs, 2hs antes, etc.). Ayudan a reducir significativamente los ausentes.',
    },
    {
      q: '¿Puedo cancelar el plan en cualquier momento?',
      a: 'Sí. No hay contratos de permanencia. Podés cancelar tu suscripción cuando quieras desde el panel de ajustes, sin penalidades.',
    },
    {
      q: '¿Los datos de mis pacientes están seguros?',
      a: 'Totalmente. Usamos cifrado en tránsito y en reposo, acceso por roles con permisos granulares, y nuestros servidores cumplen con estándares de privacidad de datos médicos.',
    },
    {
      q: '¿Puedo integrar pagos online?',
      a: 'Sí. MetaTurnos se integra con Mercado Pago para cobrar turnos online al momento de la reserva, facilitando el cobro anticipado y reduciendo el ausentismo.',
    },
  ];

  return (
    <section id="faq" className="py-24 px-6 bg-surface-background">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 rounded-badge bg-primary/10 text-primary text-xs font-bold tracking-wider uppercase mb-4 border border-primary/20">
            FAQ
          </span>
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-text-primary">
            Preguntas frecuentes
          </h2>
          <p className="font-body text-text-secondary mt-4 text-base">
            ¿Tenés dudas? Acá respondemos las más comunes.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <div
              key={i}
              className={`rounded-card border transition-all duration-200 overflow-hidden ${
                open === i
                  ? 'border-primary/30 bg-white shadow-[0_4px_20px_rgba(47,125,107,0.08)]'
                  : 'border-border bg-white hover:border-primary/20'
              }`}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left"
              >
                <span className={`font-heading font-semibold text-sm ${open === i ? 'text-primary' : 'text-text-primary'}`}>
                  {item.q}
                </span>
                <ChevronDownIcon
                  size={18}
                  className={`shrink-0 text-text-muted transition-transform duration-200 ${open === i ? 'rotate-180 text-primary' : ''}`}
                />
              </button>
              {open === i && (
                <div className="px-6 pb-5">
                  <p className="font-body text-sm text-text-secondary leading-relaxed">{item.a}</p>
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
    <section className="py-24 px-6 bg-gradient-to-br from-[#075E4E] via-[#096453] to-primary relative overflow-hidden">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '28px 28px',
          }}
        />
      </div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto text-center flex flex-col items-center gap-6">
        <span className="inline-block px-4 py-1.5 rounded-badge bg-white/15 text-white text-xs font-bold tracking-wider uppercase border border-white/20">
          Empezá hoy mismo
        </span>
        <h2 className="font-heading text-3xl md:text-5xl font-bold text-white leading-tight">
          ¿Listo para transformar tu clínica?
        </h2>
        <p className="font-body text-white/80 text-lg max-w-lg">
          Uníte a los profesionales de la salud que ya simplifican su agenda con MetaTurnos. Sin instalaciones. Sin complicaciones.
        </p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-button font-bold font-body text-primary bg-white hover:bg-white/90 transition-all shadow-[0_8px_32px_rgba(0,0,0,0.2)] text-sm"
        >
          Empezar gratis — 14 días
          <ChevronRightIcon size={16} />
        </Link>
        <p className="font-body text-white/50 text-sm">Sin tarjeta de crédito. Cancelás cuando quieras.</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="py-12 px-6 bg-[#0F1A14]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="md:col-span-2">
            <img src="/logo.png" alt="MetaTurnos" className="h-7 w-auto mb-3 brightness-0 invert opacity-90" />
            <p className="font-body text-sm text-white/50 max-w-xs leading-relaxed">
              La plataforma todo-en-uno para clínicas y consultorios. Gestioná turnos, recordatorios y cobros desde un solo lugar.
            </p>
          </div>

          <div>
            <p className="font-heading font-semibold text-white/90 text-sm mb-3">Producto</p>
            <nav className="flex flex-col gap-2">
              {[
                { label: 'Características', id: 'caracteristicas' },
                { label: 'Capturas', id: 'capturas' },
                { label: 'Planes', id: 'planes' },
                { label: 'FAQ', id: 'faq' },
              ].map((l) => (
                <button
                  key={l.id}
                  onClick={() => scrollTo(l.id)}
                  className="text-left font-body text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  {l.label}
                </button>
              ))}
            </nav>
          </div>

          <div>
            <p className="font-heading font-semibold text-white/90 text-sm mb-3">Acceso</p>
            <nav className="flex flex-col gap-2">
              <Link to="/login" className="font-body text-sm text-white/50 hover:text-white/80 transition-colors">
                Iniciar sesión
              </Link>
              <Link to="/register" className="font-body text-sm text-white/50 hover:text-white/80 transition-colors">
                Crear cuenta gratis
              </Link>
              <a href="mailto:ventas@metaturnos.com" className="font-body text-sm text-white/50 hover:text-white/80 transition-colors">
                Contacto
              </a>
            </nav>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="font-body text-xs text-white/30">© {year} MetaTurnos. Todos los derechos reservados.</p>
          <p className="font-body text-xs text-white/30">Hecho con ♥ para profesionales de la salud</p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Screenshots />
        <Planes />
        <Testimonials />
        <FAQ />
        <CtaFinal />
      </main>
      <Footer />
    </div>
  );
}
