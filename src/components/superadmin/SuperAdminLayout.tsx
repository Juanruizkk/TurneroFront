import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  BuildingIcon,
  ShieldIcon,
  LogOutIcon,
  CreditCardIcon,
} from 'lucide-react';
import logo from '../../assets/logo.png';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Sucursales', path: '/superadmin/sucursales', icon: BuildingIcon   },
  { name: 'Planes',     path: '/superadmin/planes',     icon: CreditCardIcon },
];

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const currentPage =
    navItems.find((i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/'))
      ?.name ?? 'Super Admin';

  return (
    <div className="flex h-screen w-full bg-surface-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-[240px] bg-[#1E1E2E] flex flex-col flex-shrink-0 z-20">

        {/* Logo */}
        <div className="h-16 flex items-center justify-center px-6 border-b border-white/10">
          <Link to="/superadmin">
            <img src={logo} alt="MetaTurnos" className="h-10 w-auto object-contain" />
          </Link>
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
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
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
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 bg-surface border-b border-border flex items-center px-8 flex-shrink-0">
          <h1 className="text-xl font-heading font-semibold text-text-primary">{currentPage}</h1>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
              <ShieldIcon className="w-3 h-3" />
              Super Admin
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">{children}</main>
      </div>
    </div>
  );
}
