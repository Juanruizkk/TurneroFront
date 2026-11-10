import { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SparklesIcon, ClockIcon, ArrowLeftIcon } from 'lucide-react';
import { demoApi } from '../../api/demo';
import { ApiError } from '../../api/client';
import { useAuth, getHomeRoute } from '../../contexts/AuthContext';
import type { DemoSesionResponse, DemoUsuario, PermisoSistema } from '../../types';

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

function decodeJwt(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return {};
  }
}

const ROLE_DESC: Record<string, string> = {
  Owner:          'Acceso total: agenda, caja, equipo, reportes y ajustes.',
  Administrativo: 'Gestiona turnos, clientes, servicios y caja.',
  Profesional:    'Agenda sus turnos y ve su propia disponibilidad.',
  Caja:           'Registra cobros y movimientos de caja.',
};

/**
 * Guardamos la sesión demo (los 4 tokens + expiración) para reusarla al volver
 * al selector sin recrear otra sucursal demo (que gastaría cupo por IP).
 */
const DEMO_SESION_KEY = 'turnero_demo_sesion';

function loadDemoSesion(): DemoSesionResponse | null {
  try {
    // localStorage (no sessionStorage) para sobrevivir al cierre de la ventana:
    // mientras no venza, reabrir reusa la misma demo sin gastar otro cupo por IP.
    const raw = localStorage.getItem(DEMO_SESION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as DemoSesionResponse;
    // Solo válida si todavía no venció.
    if (!s.expiraEn || new Date(s.expiraEn).getTime() <= Date.now()) {
      localStorage.removeItem(DEMO_SESION_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export default function ProbarDemo() {
  const navigate = useNavigate();
  const { loginWithSession } = useAuth();
  const [sesion, setSesion] = useState<DemoSesionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const crear = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nueva = await demoApi.crear();
      localStorage.setItem(DEMO_SESION_KEY, JSON.stringify(nueva));
      setSesion(nueva);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo crear la demo. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Reusar la sesión demo existente si sigue vigente; recrear solo si no hay.
    const existente = loadDemoSesion();
    if (existente) {
      setSesion(existente);
      setLoading(false);
      return;
    }
    crear();
  }, [crear]);

  function elegir(u: DemoUsuario) {
    if (!sesion) return;
    const claims = decodeJwt(u.token);
    const permisoRaw = claims['permiso'];
    const permisos = (Array.isArray(permisoRaw) ? permisoRaw : permisoRaw ? [permisoRaw] : []) as PermisoSistema[];

    const user = loginWithSession({
      token:        u.token,
      rol:          (claims[ROLE_CLAIM] as string) ?? (u.esOwner ? 'Profesional' : u.rol),
      nombre:       u.nombre,
      apellido:     (claims['apellido'] as string) ?? '',
      email:        (claims['email'] as string) ?? '',
      esSuperAdmin: false,
      esOwner:      u.esOwner,
      userId:       claims['userId'] as string | undefined,
      sucursalId:   claims['sucursalId'] as string | undefined,
      permisos:     permisos as unknown as string[],
      esDemo:       true,
      demoExpiraEn: sesion.expiraEn,
    });
    navigate(getHomeRoute(user));
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-b from-[#F2F8F5] to-white px-4">
      <div className="max-w-2xl w-full py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-primary mb-6 transition-colors">
          <ArrowLeftIcon size={16} /> Volver al inicio
        </Link>

        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20 mb-3">
            <SparklesIcon size={13} /> Demo interactiva
          </span>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-text-primary">
            Elegí un rol para explorar
          </h1>
          <p className="text-sm text-text-muted mt-2 flex items-center justify-center gap-1.5">
            <ClockIcon size={14} /> Datos de ejemplo aislados · se borran en 30 minutos · sin emails reales.
          </p>
        </div>

        {loading && (
          <div className="text-center py-16 text-text-secondary">Preparando tu demo…</div>
        )}

        {!loading && error && (
          <div className="text-center py-12 flex flex-col items-center gap-4">
            <p className="text-text-secondary max-w-md">{error}</p>
            <button
              onClick={crear}
              className="px-5 py-2.5 rounded-button bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && sesion && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sesion.usuarios.map((u) => (
              <button
                key={u.token}
                onClick={() => elegir(u)}
                className="p-5 rounded-xl border border-border bg-white hover:border-primary/50 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-heading font-bold text-text-primary">{u.rol}</p>
                  {u.esOwner && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      Dueño
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-secondary mb-2">{u.nombre}</p>
                <p className="text-xs text-text-muted leading-relaxed">{ROLE_DESC[u.rol] ?? ''}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
