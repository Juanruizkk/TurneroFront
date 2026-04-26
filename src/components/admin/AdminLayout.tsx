import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, tienePermiso } from '../../contexts/AuthContext';
import { publicoApi } from '../../api/publico';
import { suscripcionApi } from '../../api/suscripcion';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboardIcon,
  CalendarDaysIcon,
  UsersIcon,
  Users2Icon,
  ScissorsIcon,
  WalletIcon,
  BarChart3Icon,
  SettingsIcon,
  ClockIcon,
  SearchIcon,
  BellIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  AlertTriangleIcon,
  CreditCardIcon,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { useSignalR, type TurnoNotificacion } from '../../hooks/useSignalR';
import type { SuscripcionInfo } from '../../types';

interface Notificacion {
  id: string;
  tipo: 'nuevo' | 'cancelado';
  mensaje: string;
  hora: string;
  leida: boolean;
}

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navSections = [
  {
    title: 'PRINCIPAL',
    items: [
      { name: 'Dashboard', path: '/admin', icon: LayoutDashboardIcon },
      { name: 'Caja',      path: '/admin/caja', icon: WalletIcon },
    ],
  },
  {
    title: 'GESTIÓN',
    items: [
      { name: 'Turnos',    path: '/admin/turnos',   icon: ClockIcon },
      { name: 'Clientes',  path: '/admin/clientes',  icon: UsersIcon  },
      { name: 'Servicios', path: '/admin/servicios', icon: ScissorsIcon },
      { name: 'Equipo',    path: '/admin/usuarios',  icon: Users2Icon  },
    ],
  },
  {
    title: 'FINANZAS',
    items: [
      { name: 'Reportes', path: '/admin/reportes', icon: BarChart3Icon },
    ],
  },
  {
    title: 'CONFIGURACIÓN',
    items: [
      { name: 'Ajustes',      path: '/admin/ajustes',      icon: SettingsIcon   },
      { name: 'Suscripción',  path: '/admin/suscripcion',  icon: CreditCardIcon },
    ],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const esAdmin = user?.esOwner || user?.rol === 'Administrativo';
  const [searchQuery, setSearchQuery] = useState('');
  const [sucursalNombre, setSucursalNombre] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [suscripcion, setSuscripcion] = useState<SuscripcionInfo | null>(null);

  // ── Notificaciones en tiempo real ────────────────────────────────────────
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const agregarNotificacion = useCallback((tipo: 'nuevo' | 'cancelado', turno: TurnoNotificacion) => {
    const nueva: Notificacion = {
      id: `${Date.now()}-${turno.id}`,
      tipo,
      mensaje: tipo === 'nuevo'
        ? `Nuevo turno: ${turno.clienteNombre} — ${turno.servicioNombre}`
        : `Turno cancelado: ${turno.clienteNombre} — ${turno.servicioNombre}`,
      hora: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      leida: false,
    };
    setNotificaciones((prev) => [nueva, ...prev].slice(0, 50));
  }, []);

  useSignalR({
    token: user?.token,
    onNuevoTurno:    (turno) => agregarNotificacion('nuevo', turno),
    onTurnoCancelado:(turno) => agregarNotificacion('cancelado', turno),
  });

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user?.sucursalId) {
      publicoApi.perfil(user.sucursalId)
        .then((p) => setSucursalNombre(p.nombre))
        .catch(() => {});

      suscripcionApi.getSuscripcion(user.sucursalId)
        .then(setSuscripcion)
        .catch(() => {});
    }
  }, [user?.sucursalId]);

  const currentPage =
    navSections.flatMap((s) => s.items).find((i) => location.pathname === i.path)?.name ?? 'Panel';

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center justify-center px-6 border-b border-border">
        <Link to="/admin" onClick={() => setSidebarOpen(false)}>
          <img src={logo} alt="MetaTurnos" className="h-10 w-auto object-contain" />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-4">
        {navSections.map((section, idx) => (
          <div key={idx} className="mb-8">
            <h3 className="px-3 text-xs font-semibold text-text-muted tracking-wider mb-3">
              {section.title}
            </h3>
            <ul className="space-y-1">
              {section.items.filter((item) => {
                if (item.path === '/admin/usuarios')    return esAdmin;
                if (item.path === '/admin/ajustes')     return esAdmin || tienePermiso(user, 'GestionarAjustes');
                if (item.path === '/admin/suscripcion') return user?.esOwner ?? false;
                return true;
              }).map((item) => {
                const isActive = location.pathname === item.path ||
                  (item.path !== '/admin' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-button transition-colors relative ${
                        isActive
                          ? 'text-white font-medium'
                          : 'text-text-secondary hover:bg-primary-light/10 hover:text-primary'
                      }`}
                    >
                      <Icon className="w-5 h-5 relative z-10" />
                      <span className="relative z-10">{item.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeNav"
                          className="absolute inset-0 bg-primary rounded-button -z-0"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold text-sm">
            {user ? `${user.nombre.charAt(0)}${user.apellido.charAt(0)}` : 'AD'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary truncate">
              {user ? `${user.nombre} ${user.apellido}` : 'Administrador'}
            </p>
            <p className="text-xs text-text-muted truncate">
              {user?.esOwner ? 'Owner · ' : ''}{user?.rol ?? ''}
            </p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-2 text-text-muted hover:text-error transition-colors rounded-lg hover:bg-error/10"
            title="Cerrar sesión"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen w-full bg-surface-background overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — mobile (overlay) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-surface border-r border-border flex flex-col flex-shrink-0 transition-transform duration-300 md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar — desktop (always visible) */}
      <aside className="hidden md:flex w-[260px] bg-surface border-r border-border flex-col flex-shrink-0 z-20">
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4 md:px-8 flex-shrink-0 relative z-30 gap-3">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-md text-text-secondary hover:bg-surface-background transition-colors"
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-heading font-semibold text-text-primary">{currentPage}</h1>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <div className="relative hidden sm:block w-48 md:w-64">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Buscar cliente, turno..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-surface-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="relative" ref={bellRef}>
              <button
                className="relative p-2 text-text-secondary hover:text-primary transition-colors"
                onClick={() => {
                  setBellOpen((o) => !o);
                  if (!bellOpen) {
                    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
                  }
                }}
                aria-label="Notificaciones"
              >
                <BellIcon className="w-5 h-5" />
                {noLeidas > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-error rounded-full border-2 border-surface flex items-center justify-center text-[10px] text-white font-bold leading-none">
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {bellOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <span className="text-sm font-semibold text-text-primary">Notificaciones</span>
                      <button
                        onClick={() => setBellOpen(false)}
                        className="text-text-muted hover:text-text-primary transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notificaciones.length === 0 ? (
                        <p className="text-sm text-text-muted text-center py-8">
                          Sin notificaciones recientes
                        </p>
                      ) : (
                        notificaciones.map((n) => (
                          <div
                            key={n.id}
                            className={`px-4 py-3 border-b border-border/50 last:border-0 ${
                              !n.leida ? 'bg-primary/5' : ''
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span
                                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                                  n.tipo === 'nuevo' ? 'bg-success' : 'bg-error'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-text-primary leading-snug">{n.mensaje}</p>
                                <p className="text-xs text-text-muted mt-0.5">{n.hora}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    {notificaciones.length > 0 && (
                      <button
                        onClick={() => setNotificaciones([])}
                        className="w-full py-2.5 text-xs text-text-muted hover:text-text-primary transition-colors border-t border-border"
                      >
                        Limpiar todo
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Subscription alert banner */}
        {suscripcion && (suscripcion.estado === 'PruebActiva' || suscripcion.estado === 'PruebVencida' || suscripcion.estado === 'Vencida' || suscripcion.estado === 'Cancelada') && (
          <div
            className={`flex items-center gap-3 px-4 py-2.5 text-sm font-medium flex-shrink-0 ${
              suscripcion.estado === 'Vencida' || suscripcion.estado === 'PruebVencida' || suscripcion.estado === 'Cancelada' || suscripcion.diasRestantes <= 3
                ? 'bg-red-50 border-b border-red-200 text-red-800'
                : 'bg-amber-50 border-b border-amber-200 text-amber-800'
            }`}
          >
            <AlertTriangleIcon className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">
              {suscripcion.estado === 'Vencida'
                ? 'Tu suscripción venció. Renovála para seguir usando el sistema.'
                : suscripcion.estado === 'Cancelada'
                  ? 'Tu suscripción fue cancelada.'
                  : suscripcion.estado === 'PruebVencida'
                    ? 'Tu período de prueba venció.'
                    : suscripcion.diasRestantes <= 3
                      ? `Tu período de prueba vence en ${suscripcion.diasRestantes} día${suscripcion.diasRestantes !== 1 ? 's' : ''}.`
                      : `Estás en tu período de prueba gratuito. Te quedan ${suscripcion.diasRestantes} días.`}
            </span>
            <Link
              to="/admin/suscripcion"
              className={`flex-shrink-0 px-3 py-1 rounded-button text-xs font-semibold whitespace-nowrap transition-colors ${
                suscripcion.estado === 'Vencida' || suscripcion.estado === 'PruebVencida' || suscripcion.estado === 'Cancelada' || suscripcion.diasRestantes <= 3
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-amber-700 text-white hover:bg-amber-800'
              }`}
            >
              Ver suscripción
            </Link>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">{children}</main>
      </div>
    </div>
  );
}
