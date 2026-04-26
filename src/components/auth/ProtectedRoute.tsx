import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import type { RolSession } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Si se especifica, solo estos roles pueden acceder */
  roles?: RolSession[];
  /** Si true, solo el SuperAdmin puede acceder */
  soloSuperAdmin?: boolean;
}

export function ProtectedRoute({ children, roles, soloSuperAdmin }: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (soloSuperAdmin && !user!.esSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // SA no puede acceder a rutas de sucursal — siempre va a su panel
  if (user!.esSuperAdmin && !soloSuperAdmin) {
    return <Navigate to="/superadmin" replace />;
  }

  if (roles && !roles.includes(user!.rol)) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
