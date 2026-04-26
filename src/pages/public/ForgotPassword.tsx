import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MailIcon, AlertCircleIcon, CheckCircleIcon, ArrowLeftIcon } from 'lucide-react';
import { authApi } from '../../api/auth';
import logo from '../../assets/logo.png';

export function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch {
      // Siempre mostrar mensaje genérico para no filtrar info
      setSent(true);
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
            Gestión de turnos para salones de belleza y barberías
          </p>
        </motion.div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-surface-background">

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
          {sent ? (
            /* ── Estado: email enviado ── */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircleIcon className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">
                ¡Revisá tu casilla!
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-8">
                Si el email <strong>{email}</strong> está registrado en el sistema,
                recibirás un enlace para restablecer tu contraseña. El link es válido durante 1 hora.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            /* ── Estado: formulario ── */
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-heading font-bold text-text-primary">¿Olvidaste tu contraseña?</h2>
                <p className="text-text-secondary mt-1 text-sm leading-relaxed">
                  Ingresá tu email y te enviaremos un enlace para crear una nueva contraseña.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
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
                      autoFocus
                      className="w-full pl-10 pr-4 py-3 rounded-input border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    />
                  </div>
                </div>

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
                  disabled={!email || loading}
                  className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-button font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar enlace'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  <ArrowLeftIcon className="w-3.5 h-3.5" />
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
