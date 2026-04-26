import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LockIcon, EyeIcon, EyeOffIcon, SparklesIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import { authApi } from '../../api/auth';

export function ResetPassword() {
  const [searchParams]          = useSearchParams();
  const navigate                = useNavigate();
  const token                   = searchParams.get('token') ?? '';

  const [password, setPassword]     = useState('');
  const [confirmar, setConfirmar]   = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [showConf, setShowConf]     = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [tokenExpirado, setTokenExpirado] = useState(false);
  const [exito, setExito]           = useState(false);

  const validar = (): string => {
    if (password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
    if (password !== confirmar) return 'Las contraseñas no coinciden.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validar();
    if (err) { setError(err); return; }
    if (!token) { setError('No se encontró el token de recuperación. Solicitá un nuevo enlace.'); return; }

    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setExito(true);
      // Redirigir al login con mensaje tras 2 s
      setTimeout(() => navigate('/login', { state: { passwordReseteado: true } }), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ocurrió un error.';
      if (msg.toLowerCase().includes('venció') || msg.toLowerCase().includes('expiró') || msg.toLowerCase().includes('válido')) {
        setTokenExpirado(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const errorValidacion = password || confirmar ? validar() : '';
  const puedeEnviar = !errorValidacion && password.length >= 8 && !loading;

  /* ── Token inexistente ── */
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-surface-background">
        <div className="text-center max-w-sm">
          <AlertCircleIcon className="w-12 h-12 text-error mx-auto mb-4" />
          <h2 className="text-xl font-heading font-bold text-text-primary mb-2">Enlace inválido</h2>
          <p className="text-text-secondary text-sm mb-6">
            El enlace de recuperación no es válido. Solicitá uno nuevo.
          </p>
          <Link to="/forgot-password" className="text-primary hover:text-primary-dark text-sm font-medium transition-colors">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A2E] flex-col items-center justify-center p-16 relative overflow-hidden">
        <div className="absolute top-[-120px] left-[-120px] w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-accent/10 blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30">
            <SparklesIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-heading font-bold text-white mb-3">TurneroApp</h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Gestión de turnos para salones de belleza y barberías
          </p>
        </motion.div>
      </div>

      {/* Panel derecho */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-background">

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <SparklesIcon className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-heading font-bold text-text-primary">TurneroApp</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* ── Token expirado ── */}
          {tokenExpirado ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <AlertCircleIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">El enlace venció</h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-8">
                El enlace de recuperación expiró (tiene validez de 1 hora). Solicitá uno nuevo y completá el proceso a tiempo.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block px-6 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors"
              >
                Solicitar nuevo enlace
              </Link>
            </div>

          /* ── Éxito ── */
          ) : exito ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">¡Contraseña actualizada!</h2>
              <p className="text-text-secondary text-sm">
                Tu contraseña se restableció correctamente. Redirigiendo al login…
              </p>
            </div>

          /* ── Formulario ── */
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-heading font-bold text-text-primary">Nueva contraseña</h2>
                <p className="text-text-secondary mt-1 text-sm">
                  Elegí una contraseña segura de al menos 8 caracteres.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* Nueva contraseña */}
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
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      autoFocus
                      className="w-full pl-10 pr-10 py-3 rounded-input border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1.5">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <LockIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type={showConf ? 'text' : 'password'}
                      value={confirmar}
                      onChange={(e) => setConfirmar(e.target.value)}
                      placeholder="Repetí la contraseña"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-10 py-3 rounded-input border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConf(!showConf)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                    >
                      {showConf ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Validación en tiempo real */}
                {errorValidacion && (
                  <p className="text-xs text-error flex items-center gap-1.5">
                    <AlertCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    {errorValidacion}
                  </p>
                )}

                {/* Error de API */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2.5 p-3 bg-error/8 border border-error/20 rounded-input"
                  >
                    <AlertCircleIcon className="w-4 h-4 text-error flex-shrink-0" />
                    <p className="text-sm text-error">{error}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={!puedeEnviar}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-button font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar contraseña'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                  Volver al inicio de sesión
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
