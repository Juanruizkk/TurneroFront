import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  SparklesIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  BuildingIcon,
  UserIcon,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth, getHomeRoute } from '../../contexts/AuthContext';
import type { LoginResponseDto } from '../../types';

interface InfoInvitacion {
  nombre: string;
  apellido: string;
  email: string;
  nombreSucursal: string;
  rol: string;
  yaRegistrado: boolean;
}

const ROL_LABEL: Record<string, string> = {
  Administrativo: 'Administrador',
  Profesional:    'Profesional',
  Caja:           'Operador de caja',
};

export function AceptarInvitacion() {
  const { token }  = useParams<{ token: string }>();
  const navigate   = useNavigate();
  const { login }  = useAuth();

  const [info, setInfo]           = useState<InfoInvitacion | null>(null);
  const [loadingInfo, setLoading] = useState(true);
  const [infoError, setInfoError] = useState('');

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done, setDone]           = useState(false);

  // Cargar info pública del token
  useEffect(() => {
    if (!token) { setInfoError('Token inválido.'); setLoading(false); return; }
    api.get<InfoInvitacion>(`/auth/invitacion/${token}`)
      .then(setInfo)
      .catch((err: Error) => setInfoError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const passwordsMatch = password && confirm && password === confirm;
  const canSubmit      = passwordsMatch && password.length >= 6 && !saving;

  const handleSubmitConPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !token) return;
    await aceptarInvitacion(password);
  };

  const handleAceptarExistente = async () => {
    if (!token || saving) return;
    await aceptarInvitacion(null);
  };

  const aceptarInvitacion = async (nuevaPassword: string | null) => {
    setSubmitError('');
    setSaving(true);
    try {
      const response = await api.post<LoginResponseDto>('/auth/invitacion/aceptar', {
        token,
        nuevaPassword,
      });

      const session = {
        token:        response.token,
        rol:          response.rol,
        nombre:       response.nombre,
        apellido:     response.apellido,
        email:        response.email,
        esSuperAdmin: response.esSuperAdmin,
        esOwner:      response.esOwner,
        userId:       response.userId,
        sucursalId:   response.sucursalId,
      };
      localStorage.setItem('turnero_session', JSON.stringify(session));

      setDone(true);

      setTimeout(() => {
        navigate(getHomeRoute(session as Parameters<typeof getHomeRoute>[0]), { replace: true });
      }, 2000);
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Error al activar la cuenta.');
    } finally {
      setSaving(false);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Token inválido ─────────────────────────────────────────────────────────
  if (infoError || !info) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-card border border-border shadow-sm p-8 max-w-sm w-full text-center"
        >
          <div className="w-14 h-14 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircleIcon className="w-7 h-7 text-error" />
          </div>
          <h2 className="font-heading font-bold text-xl text-text-primary mb-2">Enlace inválido</h2>
          <p className="text-text-secondary text-sm mb-6">{infoError || 'Este enlace de invitación no es válido o ya fue utilizado.'}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors"
          >
            Ir al inicio de sesión
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Éxito ──────────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-background p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-surface rounded-card border border-border shadow-sm p-8 max-w-sm w-full text-center"
        >
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="font-heading font-bold text-xl text-text-primary mb-2">¡Cuenta activada!</h2>
          <p className="text-text-secondary text-sm">Redirigiendo al panel...</p>
          <div className="mt-4 flex justify-center">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Card de info del usuario (común a ambos flujos) ────────────────────────
  const infoCard = (
    <div className="bg-surface rounded-card border border-border p-5">
      <p className="text-xs text-text-muted font-semibold uppercase tracking-wider mb-3">Tu invitación</p>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-text-primary text-sm">{info.nombre} {info.apellido}</p>
            <p className="text-xs text-text-muted">{info.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <BuildingIcon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="font-medium text-text-primary text-sm">{info.nombreSucursal}</p>
            <p className="text-xs text-text-muted">{ROL_LABEL[info.rol] ?? info.rol}</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Flujo: usuario ya registrado ───────────────────────────────────────────
  if (info.yaRegistrado) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-background p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6"
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-text-primary">TurneroApp</h1>
          </div>

          {infoCard}

          <div className="bg-surface rounded-card border border-border p-6">
            <h2 className="font-heading font-semibold text-text-primary mb-1">Tu cuenta ya existe</h2>
            <p className="text-text-secondary text-sm mb-5">
              Tu correo ya está registrado en TurneroApp. Solo aceptá la invitación para acceder a{' '}
              <strong>{info.nombreSucursal}</strong> con tu contraseña actual.
            </p>

            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-error/8 border border-error/20 rounded-input mb-4">
                <AlertCircleIcon className="w-4 h-4 text-error flex-shrink-0" />
                <p className="text-sm text-error">{submitError}</p>
              </div>
            )}

            <button
              onClick={handleAceptarExistente}
              disabled={saving}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-button font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Aceptando...</>
              ) : (
                'Aceptar invitación y entrar'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Flujo: usuario nuevo (establecer contraseña) ───────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-text-primary">TurneroApp</h1>
        </div>

        {infoCard}

        <div className="bg-surface rounded-card border border-border p-6">
          <h2 className="font-heading font-semibold text-text-primary mb-1">Establecé tu contraseña</h2>
          <p className="text-text-secondary text-sm mb-5">Elegí una contraseña segura para acceder al panel.</p>

          <form onSubmit={handleSubmitConPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Nueva contraseña
              </label>
              <div className="relative">
                <LockIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-10 pr-10 py-2.5 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  {showPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Confirmar contraseña
              </label>
              <div className="relative">
                <LockIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type={showConf ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repetí la contraseña"
                  className={`w-full pl-10 pr-10 py-2.5 rounded-input border bg-surface-background focus:outline-none focus:ring-2 transition-all text-sm ${
                    confirm && !passwordsMatch
                      ? 'border-error focus:ring-error/20 focus:border-error'
                      : 'border-border focus:ring-primary/20 focus:border-primary'
                  }`}
                />
                <button type="button" onClick={() => setShowConf(!showConf)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  {showConf ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              {confirm && !passwordsMatch && (
                <p className="text-xs text-error mt-1">Las contraseñas no coinciden.</p>
              )}
            </div>

            {submitError && (
              <div className="flex items-center gap-2 p-3 bg-error/8 border border-error/20 rounded-input">
                <AlertCircleIcon className="w-4 h-4 text-error flex-shrink-0" />
                <p className="text-sm text-error">{submitError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-button font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {saving ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Activando cuenta...</>
              ) : (
                'Activar cuenta y entrar'
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
