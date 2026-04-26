import React, { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../api/auth';
import type { PermisoSistema, OpcionSucursal } from '../types';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type RolSession =
  | 'SuperAdmin'
  | 'Administrativo'
  | 'Profesional'
  | 'Caja';

export interface SessionUser {
  token: string;
  rol: RolSession;
  nombre: string;
  apellido: string;
  email: string;
  esSuperAdmin: boolean;
  esOwner: boolean;
  userId?: string;
  sucursalId?: string;
  permisos: PermisoSistema[];
}

export type LoginResult =
  | { type: 'session'; user: SessionUser }
  | { type: 'requiere-seleccion'; seleccionToken: string; opciones: OpcionSucursal[] };

export function tienePermiso(user: SessionUser | null, permiso: PermisoSistema): boolean {
  if (!user) return false;
  if (user.esSuperAdmin || user.esOwner || user.rol === 'Administrativo') return true;
  return (user.permisos ?? []).includes(permiso);
}

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  seleccionarSucursal: (seleccionToken: string, sucursalId: string) => Promise<SessionUser>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loginWithSession: (response: Record<string, any>) => SessionUser;
  logout: () => void;
}

// ─── Contexto ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'turnero_session';

function loadSession(): SessionUser | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SessionUser;
    if (!s.permisos) s.permisos = [];
    return s;
  } catch {
    return null;
  }
}

function buildSession(response: {
  token?: string;
  rol?: string;
  nombre?: string;
  apellido?: string;
  email?: string;
  esSuperAdmin?: boolean;
  esOwner?: boolean;
  userId?: string;
  sucursalId?: string;
  permisos?: PermisoSistema[];
}): SessionUser {
  return {
    token:        response.token!,
    rol:          response.rol as RolSession,
    nombre:       response.nombre ?? '',
    apellido:     response.apellido ?? '',
    email:        response.email ?? '',
    esSuperAdmin: response.esSuperAdmin ?? false,
    esOwner:      response.esOwner ?? false,
    userId:       response.userId,
    sucursalId:   response.sucursalId,
    permisos:     response.permisos ?? [],
  };
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(loadSession);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    const response = await authApi.login(email, password);

    if (response.requiereSeleccion) {
      return {
        type:           'requiere-seleccion',
        seleccionToken: response.seleccionToken!,
        opciones:       response.opciones!,
      };
    }

    const session = buildSession(response);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return { type: 'session', user: session };
  }, []);

  const seleccionarSucursal = useCallback(async (
    seleccionToken: string,
    sucursalId: string,
  ): Promise<SessionUser> => {
    const response = await authApi.seleccionarSucursal(seleccionToken, sucursalId);
    const session  = buildSession(response);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }, []);

  const loginWithSession = useCallback((response: {
    token?: string;
    rol?: string;
    nombre?: string;
    apellido?: string;
    email?: string;
    esSuperAdmin?: boolean;
    esOwner?: boolean;
    userId?: string;
    sucursalId?: string;
    permisos?: string[];
  }): SessionUser => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = buildSession(response as any);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, login, seleccionarSucursal, loginWithSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/** Ruta de redirección post-login según el rol */
export function getHomeRoute(user: SessionUser): string {
  if (user.esSuperAdmin)           return '/superadmin';
  if (user.rol === 'Caja')         return '/admin/caja';
  return '/admin';
}
