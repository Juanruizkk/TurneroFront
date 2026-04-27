import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon, AlertCircleIcon, CheckCircleIcon } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuth, getHomeRoute } from '../../contexts/AuthContext';
import { SucursalSelector } from './SucursalSelector';
import type { OpcionSucursal } from '../../types';

type LoginStep = 'credentials' | 'select-branch';

export function Login() {
  const navigate               = useNavigate();
  const location               = useLocation();
  const { login, seleccionarSucursal } = useAuth();

  const from              = (location.state as { from?: string })?.from ?? null;
  const passwordReseteado = (location.state as { passwordReseteado?: boolean })?.passwordReseteado ?? false;

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [step, setStep]                   = useState<LoginStep>('credentials');
  const [seleccionToken, setSeleccionToken] = useState('');
  const [opciones, setOpciones]           = useState<OpcionSucursal[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setError('');
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result.type === 'requiere-seleccion') {
        setSeleccionToken(result.seleccionToken);
        setOpciones(result.opciones);
        setStep('select-branch');
      } else {
        const destination = result.user.esSuperAdmin
          ? '/superadmin'
          : (from ?? getHomeRoute(result.user));
        navigate(destination, { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccion = async (sucursalId: string) => {
    try {
      const user = await seleccionarSucursal(seleccionToken, sucursalId);
      const destination = user.esSuperAdmin
        ? '/superadmin'
        : (from ?? getHomeRoute(user));
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      setStep('credentials');
      setError(err instanceof Error ? err.message : 'Error al seleccionar la sucursal.');
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A2E] flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute top-[-120px] left-[-120px] w-[400px] h-[400px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full bg-accent/10 blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 text-center max-w-sm"
        >
          <img src={logo} alt="MetaTurnos" className="w-32 h-auto  object-contain mx-auto mb-6 drop-shadow-lg" />
          <h1 className="text-4xl font-heading font-bold text-white mb-3">MetaTurnos</h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Gestión de turnos para salones de belleza y barberías
          </p>

          <div className="mt-12 space-y-3 text-left">
            {[
              { dot: 'bg-primary',  text: 'Panel de administración completo'    },
              { dot: 'bg-accent',   text: 'Agenda inteligente por profesional'  },
              { dot: 'bg-blue-400', text: 'Gestión de caja y cobranzas'         },
            ].map(({ dot, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${dot} flex-shrink-0`} />
                <p className="text-white/60 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-background">

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <img src={logo} alt="MetaTurnos" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-heading font-bold text-text-primary">MetaTurnos</span>
        </div>

        {step === 'select-branch' ? (
          <SucursalSelector
            opciones={opciones}
            onSeleccionar={handleSeleccion}
            onVolver={() => { setStep('credentials'); setError(''); }}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-heading font-bold text-text-primary">Bienvenido de vuelta</h2>
              <p className="text-text-secondary mt-1">Ingresá tus credenciales para continuar</p>
            </div>

            {passwordReseteado && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-input mb-5"
              >
                <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-sm text-green-700">Contraseña actualizada. Podés iniciar sesión.</p>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <MailIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-input border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <LockIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
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

              {/* Error */}
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

              {/* Submit */}
              <button
                type="submit"
                disabled={!email || !password || loading}
                className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-button font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Ingresando...
                  </>
                ) : (
                  'Iniciar sesión'
                )}
              </button>

              <Link
                to="/forgot-password"
                className="block w-full py-3 text-center text-sm text-text-secondary hover:text-text-primary border border-border rounded-button transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </form>

            {/* Registro */}
            <div className="mt-5 text-center">
              <p className="text-sm text-text-secondary">
                ¿No tenés cuenta?{' '}
                <Link to="/register" className="text-primary font-medium hover:underline">
                  Registrarse gratis
                </Link>
              </p>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}
