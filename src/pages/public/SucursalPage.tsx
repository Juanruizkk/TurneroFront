import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  PhoneIcon,
  MailIcon,
  CalendarCheckIcon,
  SparklesIcon,
  ClockIcon,
  ScissorsIcon,
  TimerIcon,
} from 'lucide-react';
import { publicoApi } from '../../api/publico';
import type { PerfilPublico, Servicio, DiaSemana } from '../../types';
import { DIAS_SEMANA, DIAS_LABELS } from '../../types';
import { BookingFlow } from './BookingFlow';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY_MAP: Record<number, DiaSemana> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miercoles',
  4: 'Jueves', 5: 'Viernes', 6: 'Sabado', 0: 'Domingo',
};

function formatFranjas(dia: PerfilPublico['horariosAtencion'][DiaSemana]): string {
  if (!dia?.abierto || !dia.franjas?.length) return 'Cerrado';
  return dia.franjas.map((f) => `${f.apertura} – ${f.cierre}`).join(' / ');
}

function getInitials(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatMoneda(n: number) {
  return `$${n.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SucursalPageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-primary-light animate-pulse relative">
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
      <div className="relative min-h-screen flex flex-col justify-end p-6 sm:p-10 pb-8 gap-6">
        <div>
          <div className="w-14 h-14 rounded-full bg-white/20 mb-3" />
          <div className="h-8 w-52 bg-white/20 rounded-lg mb-2" />
          <div className="h-4 w-72 bg-white/15 rounded-lg mb-4" />
          <div className="h-11 w-44 bg-white/20 rounded-button" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-40 bg-white/10 rounded-xl" />
          <div className="h-40 bg-white/10 rounded-xl" />
          <div className="h-40 bg-white/10 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ─── Not Found ────────────────────────────────────────────────────────────────

function SucursalNotFound({ slug }: { slug: string }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-surface-background flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-surface-soft flex items-center justify-center mb-4 shadow-inner">
        <SparklesIcon className="w-6 h-6 text-text-muted" />
      </div>
      <h1 className="font-heading font-bold text-xl text-text-primary mb-2">Negocio no encontrado</h1>
      <p className="text-text-secondary text-sm mb-1">
        No existe ningún negocio con el enlace{' '}
        <code className="font-mono bg-surface-soft px-1.5 py-0.5 rounded text-xs">/s/{slug}</code>.
      </p>
      <p className="text-text-muted text-xs mb-7">Verificá la URL o pedile el link correcto al negocio.</p>
      <button
        onClick={() => navigate('/')}
        className="px-6 py-2.5 rounded-button bg-primary hover:bg-primary-dark text-white font-medium transition-colors text-sm"
      >
        Ir al inicio
      </button>
    </div>
  );
}

// ─── Glass card ───────────────────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 p-4 ${className}`}>
      {children}
    </div>
  );
}

function GlassLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-2.5">{children}</p>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SucursalPage() {
  const { slug } = useParams<{ slug: string }>();

  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [servicios, setServicios] = useState<Servicio[]>([]);

  useEffect(() => {
    if (!slug) return;
    publicoApi
      .perfilBySlug(slug)
      .then((data) => {
        setPerfil(data);
        document.title = `${data.nombre} — MetaTurnos`;
        publicoApi
          .serviciosBySlug(slug)
          .then((svcs) => setServicios(svcs.filter((s) => s.activo)))
          .catch(() => {});
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));

    return () => { document.title = 'MetaTurnos'; };
  }, [slug]);

  if (loading) return <SucursalPageSkeleton />;
  if (notFound || !perfil) return <SucursalNotFound slug={slug ?? ''} />;

  const todayKey = TODAY_MAP[new Date().getDay()];
  const todayHorario = perfil.horariosAtencion[todayKey];
  const isOpenToday = todayHorario?.abierto;

  const contactItems = [
    { icon: MapPinIcon, label: 'Dirección', value: perfil.direccion, href: perfil.googleMapsUrl },
    { icon: PhoneIcon,  label: 'Teléfono',  value: perfil.telefono,  href: perfil.telefono ? `tel:${perfil.telefono}` : undefined },
    { icon: MailIcon,   label: 'Email',     value: perfil.email,     href: perfil.email ? `mailto:${perfil.email}` : undefined },
  ].filter((i) => i.value);

  const diasAbiertos = DIAS_SEMANA.filter((dia) => perfil.horariosAtencion[dia]?.abierto);

  return (
    <div className="min-h-screen relative font-body">

      {/* ── Background image ─────────────────────────────────────────────────── */}
      {perfil.backgroundUrl ? (
        <img
          src={perfil.backgroundUrl}
          alt=""
          className="fixed inset-0 w-full h-full object-cover -z-10"
        />
      ) : (
        <div className="fixed inset-0 bg-gradient-to-br from-primary-dark via-primary to-primary-light -z-10" />
      )}
      {/* Gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/25 -z-10" />

      {/* ── Page content ─────────────────────────────────────────────────────── */}
      <div className="min-h-screen flex flex-col justify-end px-5 sm:px-10 pt-16 pb-8">

        {/* Identity */}
        <div className="mb-6">
          {/* Avatar */}
          <div className="w-14 h-14 rounded-full border-2 border-white/60 shadow-xl overflow-hidden bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
            {perfil.fotoUrl ? (
              <img src={perfil.fotoUrl} alt={perfil.nombre} className="w-full h-full object-cover" />
            ) : (
              <span className="font-heading font-bold text-lg text-white select-none">
                {getInitials(perfil.nombre)}
              </span>
            )}
          </div>

          <h1 className="font-heading font-bold text-3xl sm:text-4xl text-white leading-tight drop-shadow mb-1">
            {perfil.nombre}
          </h1>
          {perfil.slogan && (
            <p className="text-white/70 text-sm mb-3">{perfil.slogan}</p>
          )}

          {/* Status */}
          <div className="flex items-center gap-1.5 mb-4">
            <span className={`w-2 h-2 rounded-full ${isOpenToday ? 'bg-green-400' : 'bg-white/30'}`} />
            <span className={`text-sm font-medium ${isOpenToday ? 'text-green-300' : 'text-white/50'}`}>
              {isOpenToday
                ? `Abierto hoy · ${formatFranjas(todayHorario)}`
                : 'Cerrado hoy'}
            </span>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsBookingOpen(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-button bg-primary hover:bg-primary-dark text-white font-heading font-bold text-sm shadow-lg transition-colors"
          >
            <CalendarCheckIcon className="w-4 h-4" />
            Reservar turno
          </motion.button>
        </div>

        {/* ── 3-col grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 md:items-start">

          {/* Col 1: Contacto + Rubros */}
          <GlassCard>
            <GlassLabel>Información de contacto</GlassLabel>
            <ul className="space-y-3">
              {contactItems.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-white/80" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-white/45 font-semibold mb-0.5">{label}</p>
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-white/90 break-words underline underline-offset-2 decoration-white/30 hover:decoration-white/70 transition-colors"
                      >
                        {value}
                      </a>
                    ) : (
                      <p className="text-sm text-white/90 break-words">{value}</p>
                    )}
                  </div>
                </li>
              ))}
              {contactItems.length === 0 && (
                <li className="text-sm text-white/40">Sin datos de contacto.</li>
              )}
            </ul>

            {perfil.rubros.length > 0 && (
              <div className="mt-4 pt-3 border-t border-white/15">
                <p className="text-[10px] uppercase tracking-wide text-white/45 font-semibold mb-2">Rubros</p>
                <div className="flex flex-wrap gap-1.5">
                  {perfil.rubros.map((r) => (
                    <span
                      key={r}
                      className="px-2.5 py-0.5 rounded-full bg-white/15 text-white/90 text-xs font-medium border border-white/20"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Col 2: Horarios (solo días abiertos) */}
          <GlassCard>
            <GlassLabel>Horarios de atención</GlassLabel>
            {diasAbiertos.length === 0 ? (
              <p className="text-sm text-white/40">Sin horarios configurados.</p>
            ) : (
              <ul className="space-y-1.5">
                {diasAbiertos.map((dia) => {
                  const horarioDia = perfil.horariosAtencion[dia];
                  const isToday = dia === todayKey;
                  return (
                    <li
                      key={dia}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm ${
                        isToday ? 'bg-white/15 ring-1 ring-white/25' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                        <span className={`${isToday ? 'font-bold text-white' : 'text-white/80'}`}>
                          {DIAS_LABELS[dia]}
                        </span>
                        {isToday && (
                          <span className="text-[9px] font-bold bg-primary text-white rounded-full px-1.5 py-0.5 leading-none uppercase tracking-wide">
                            hoy
                          </span>
                        )}
                      </div>
                      <span className={`text-xs tabular-nums ${isToday ? 'text-white font-semibold' : 'text-white/60'}`}>
                        {formatFranjas(horarioDia)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassCard>

          {/* Col 3: Servicios */}
          <GlassCard>
            <GlassLabel>Servicios</GlassLabel>
            {servicios.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <ScissorsIcon className="w-6 h-6 text-white/30" />
                <p className="text-sm text-white/40">Sin servicios publicados.</p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {servicios.map((s) => (
                  <li
                    key={s.id}
                    onClick={() => setIsBookingOpen(true)}
                    className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg hover:bg-white/15 cursor-pointer transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white/90 truncate group-hover:text-white transition-colors">{s.nombre}</p>
                      <span className="flex items-center gap-1 text-[11px] text-white/45">
                        <TimerIcon className="w-3 h-3" />
                        {s.duracionClienteMin} min
                      </span>
                    </div>
                    <span className="text-primary-light font-bold text-sm flex-shrink-0">{formatMoneda(s.precio)}</span>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </div>

        {/* Footer branding */}
        <div className="flex items-center justify-center gap-1.5 pb-2">
          <SparklesIcon className="w-3 h-3 text-white/25" />
          <span className="text-[10px] text-white/25 font-medium">Powered by MetaTurnos</span>
        </div>
      </div>

      {/* ── BookingFlow modal ─────────────────────────────────────────────────── */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <BookingFlow
            onClose={() => setIsBookingOpen(false)}
            sucursalId={perfil.sucursalId}
            slug={slug}
          />
        </div>
      )}
    </div>
  );
}
