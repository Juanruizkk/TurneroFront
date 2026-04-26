import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BuildingIcon,
  UserCogIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
} from 'lucide-react';
import { superAdminApi } from '../../api/superadmin';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import type { CrearSucursalConOwnerDto } from '../../types';

const EMPTY: CrearSucursalConOwnerDto = {
  nombre: '',
  direccion: '',
  telefono: '',
  email: '',
  ownerNombre: '',
  ownerApellido: '',
  ownerEmail: '',
  ownerTelefono: '',
  ownerPassword: '',
};

type Field = keyof CrearSucursalConOwnerDto;

function Field({
  label, type, value, placeholder, onChange, required,
}: {
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-text-primary mb-1">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
      />
    </div>
  );
}

export function CrearSucursal() {
  const navigate = useNavigate();
  const { toasts, addToast, dismiss } = useToast();

  const [form, setForm]           = useState<CrearSucursalConOwnerDto>({ ...EMPTY });
  const [saving, setSaving]       = useState(false);
  const [showPass, setShowPass]   = useState(false);

  const set = (key: Field) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const canSubmit =
    form.nombre && form.direccion && form.telefono && form.email &&
    form.ownerNombre && form.ownerApellido && form.ownerEmail &&
    form.ownerTelefono && form.ownerPassword;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const created = await superAdminApi.crearSucursal(form);
      addToast('success', `Sucursal "${created.nombre}" creada con éxito.`);
      setTimeout(() => navigate('/superadmin/sucursales'), 1000);
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Error al crear la sucursal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/superadmin/sucursales')}
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Nueva sucursal</h2>
          <p className="text-text-secondary text-sm mt-0.5">
            Completá los datos de la sucursal y su primer administrador
          </p>
        </div>
      </div>

      {/* Aviso informativo */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-card"
      >
        <ShieldCheckIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-800">¿Qué sucede al crear una sucursal?</p>
          <ul className="mt-1 space-y-0.5 text-blue-700 list-disc list-inside">
            <li>Se crea la sucursal en el sistema</li>
            <li>Se crea el usuario owner con acceso total al panel de administración</li>
            <li>El owner podrá gestionar su local de forma autónoma</li>
          </ul>
        </div>
      </motion.div>

      {/* Sección 1: Datos de la sucursal */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-surface rounded-card border border-border p-6 space-y-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <BuildingIcon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-text-primary">Datos de la sucursal</h3>
            <p className="text-xs text-text-muted">Información principal del local</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Nombre" value={form.nombre} onChange={set('nombre')}
              placeholder="Belleza Studio - Palermo" required />
          </div>
          <div className="sm:col-span-2">
            <Field label="Dirección" value={form.direccion} onChange={set('direccion')}
              placeholder="Av. Santa Fe 2345, CABA" required />
          </div>
          <Field label="Teléfono" type="tel" value={form.telefono} onChange={set('telefono')}
            placeholder="11 4567 8901" required />
          <Field label="Email" type="email" value={form.email} onChange={set('email')}
            placeholder="palermo@bellezastudio.com" required />
        </div>
      </motion.div>

      {/* Sección 2: Owner inicial */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface rounded-card border border-border p-6 space-y-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
            <UserCogIcon className="w-4 h-4 text-accent" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-text-primary">Owner inicial</h3>
            <p className="text-xs text-text-muted">Primer administrador del local</p>
          </div>
        </div>

        {/* Info badge */}
        <div className="flex flex-wrap gap-2">
          {[
            'Rol: Administrativo',
            'Todos los permisos',
            'Estado: Activo',
          ].map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium"
            >
              <CheckIcon className="w-3 h-3" />
              {tag}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre" value={form.ownerNombre} onChange={set('ownerNombre')}
            placeholder="María" required />
          <Field label="Apellido" value={form.ownerApellido} onChange={set('ownerApellido')}
            placeholder="González" required />
          <div className="sm:col-span-2">
            <Field label="Email" type="email" value={form.ownerEmail} onChange={set('ownerEmail')}
              placeholder="maria@bellezastudio.com" required />
          </div>
          <Field label="Teléfono" type="tel" value={form.ownerTelefono} onChange={set('ownerTelefono')}
            placeholder="11 5678 9012" required />
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              Contraseña temporal<span className="text-primary ml-0.5">*</span>
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={form.ownerPassword}
                onChange={(e) => set('ownerPassword')(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              >
                {showPass ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Acciones */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-3 pb-4"
      >
        <button
          onClick={() => navigate('/superadmin/sucursales')}
          className="flex-1 py-3 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || saving}
          className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Creando...
            </>
          ) : (
            <>
              <BuildingIcon className="w-4 h-4" />
              Crear sucursal
            </>
          )}
        </button>
      </motion.div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
