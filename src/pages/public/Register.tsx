import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MailIcon, LockIcon, UserIcon, BuildingIcon,
  EyeIcon, EyeOffIcon, AlertCircleIcon,
  CheckCircleIcon, ArrowRightIcon,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuth, getHomeRoute } from '../../contexts/AuthContext';
import { authApi } from '../../api/auth';

export function Register() {
  const navigate      = useNavigate();
  const { loginWithSession } = useAuth();

  const [nombre,        setNombre]        = useState('');
  const [apellido,      setApellido]      = useState('');
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [showPass,      setShowPass]      = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState('');

  const isValid = nombre && apellido && email && password.length >= 6 && nombreNegocio;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError('');
    setLoading(true);

    try {
      const dto = await authApi.register({
        nombre:        nombre.trim(),
        apellido:      apellido.trim(),
        email:         email.trim(),
        password,
        nombreNegocio: nombreNegocio.trim(),
      });
      const user = loginWithSession(dto);
      navigate(getHomeRoute(user), { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al registrarse. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

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
          <img src={logo} alt="MetaTurnos" className="w-32 h-auto object-contain mx-auto mb-6 drop-shadow-lg" />
          <h1 className="text-4xl font-heading font-bold text-white mb-3">MetaTurnos</h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Comenzá gratis — 14 días de prueba, sin tarjeta
          </p>

          <div className="mt-12 space-y-4 text-left">
            {[
              { icon: '✅', text: 'Agenda inteligente por profesional' },
              { icon: '✅', text: 'Reservas online con seña MP' },
              { icon: '✅', text: 'Gestión de caja y reportes' },
              { icon: '✅', text: 'Clientes, servicios y equipo' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-base">{icon}</span>
                <p className="text-white/60 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-background overflow-y-auto">

        {/* Logo mobile */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <img src={logo} alt="MetaTurnos" className="w-9 h-9 object-contain" />
          <span className="text-2xl font-heading font-bold text-text-primary">MetaTurnos</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-heading font-bold text-text-primary">Crear tu cuenta</h2>
            <p className="text-text-secondary mt-1">14 días gratis, sin tarjeta de crédito</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nombre + Apellido */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Nombre</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Juan"
                    autoComplete="given-name"
                    className="w-full pl-10 pr-4 py-3 rounded-input border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">Apellido</label>
                <input
                  type="text"
                  value={apellido}
                  onChange={(e) => setApellido(e.target.value)}
                  placeholder="García"
                  autoComplete="family-name"
                  className="w-full px-4 py-3 rounded-input border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            {/* Nombre del negocio */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1.5">
                Nombre del negocio
              </label>
              <div className="relative">
                <BuildingIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={nombreNegocio}
                  onChange={(e) => setNombreNegocio(e.target.value)}
                  placeholder="Mi Estética"
                  className="w-full pl-10 pr-4 py-3 rounded-input border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

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
                  maxLength={100}
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
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
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
              {password.length > 0 && password.length < 6 && (
                <p className="text-xs text-error mt-1">Mínimo 6 caracteres</p>
              )}
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
              disabled={!isValid || loading}
              className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-button font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                <>
                  Crear cuenta gratis
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Términos */}
          <p className="text-xs text-text-muted text-center mt-4">
            Al registrarte aceptás los{' '}
            <span className="text-primary cursor-pointer hover:underline">términos de servicio</span>
            {' '}y la{' '}
            <span className="text-primary cursor-pointer hover:underline">política de privacidad</span>.
          </p>

          {/* Ya tenés cuenta */}
          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              ¿Ya tenés cuenta?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Iniciá sesión
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
