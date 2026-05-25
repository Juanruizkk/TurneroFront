import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BuildingIcon,
  ShieldIcon,
  LogOutIcon,
  CreditCardIcon,
  WrenchIcon,
  MenuIcon,
  XIcon,
} from 'lucide-react';
import logo from '../../assets/logo.png';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Sucursales',   path: '/superadmin/sucursales',   icon: BuildingIcon   },
  { name: 'Planes',       path: '/superadmin/planes',       icon: CreditCardIcon },
  { name: 'Herramientas', path: '/superadmin/herramientas', icon: WrenchIcon     },
];

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentPage =
    navItems.find((i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))
      ?.name ?? 'Super Admin';

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 flex-shrink-0">
        <Link to="/superadmin" onClick={() => setSidebarOpen(false)}>
          <img src={logo} alt="MetaTurnos" className="h-10 w-auto object-contain" />
        </Link>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 text-white/40 hover:text-white transition-colors rounded-lg"
        >
          <XIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative ${
                isActive
                  ? 'text-white font-medium'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4 relative z-10 flex-shrink-0" />
              <span className="relative z-10 text-sm">{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="superAdminNav"
                  className="absolute inset-0 bg-white/10 rounded-lg"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <ShieldIcon className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Super Admin</p>
            <p className="text-xs text-white/40 truncate">Plataforma</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="p-1.5 text-white/30 hover:text-white transition-colors rounded-lg hover:bg-white/5"
            title="Salir"
          >
            <LogOutIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-dvh w-full bg-surface-background overflow-hidden">

      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-[240px] bg-[#1E1E2E] flex-col flex-shrink-0 z-20">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile (drawer) */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 w-[240px] bg-[#1E1E2E] flex flex-col z-40 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-surface border-b border-border flex items-center px-4 sm:px-8 flex-shrink-0 gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-surface-background rounded-lg transition-colors flex-shrink-0"
          >
            <MenuIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-heading font-semibold text-text-primary truncate">{currentPage}</h1>
          <div className="ml-auto flex-shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
              <ShieldIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Super Admin</span>
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-safe-8 relative">{children}</main>
      </div>
    </div>
  );
}
