import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  BuildingIcon,
  MailIcon,
  PhoneIcon,
  MapPinIcon,
  UserCogIcon,
  CalendarIcon,
  PowerIcon,
  EditIcon,
  CheckIcon,
  XIcon,
  ShieldCheckIcon,
  ReceiptIcon,
} from 'lucide-react';
import { superAdminApi } from '../../api/superadmin';
import { suscripcionApi } from '../../api/suscripcion';
import { ToastContainer } from '../../components/ui/Toast';
import { useToast } from '../../hooks/useToast';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import type { SucursalSuperAdmin, PagoSuscripcionHistorial } from '../../types';

function formatFechaLarga(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatFecha(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatPrecio(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n);
}

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border last:border-0">
      <div className="w-8 h-8 rounded-lg bg-surface-background flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-text-secondary" />
      </div>
      <div>
        <p className="text-xs text-text-muted font-medium uppercase tracking-wider">{label}</p>
        <p className="text-sm text-text-primary mt-0.5 font-medium">{value}</p>
      </div>
    </div>
  );
}

export function DetalleSucursal() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toasts, addToast, dismiss } = useToast();
  const { ConfirmDialog, confirm } = useConfirmDialog();

  const [sucursal, setSucursal]   = useState<SucursalSuperAdmin | null>(null);
  const [historial, setHistorial] = useState<PagoSuscripcionHistorial[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      superAdminApi.obtenerSucursal(id),
      suscripcionApi.getHistorial(id),
    ])
      .then(([suc, hist]) => {
        setSucursal(suc);
        setHistorial(hist);
      })
      .catch(() => addToast('error', 'No se pudo cargar la sucursal.'))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleEstado = async () => {
    if (!sucursal) return;
    const accion = sucursal.activa ? 'desactivar' : 'activar';
    const ok = await confirm({
      title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} "${sucursal.nombre}"?`,
      description: sucursal.activa
        ? 'La sucursal dejará de estar disponible en el sistema.'
        : 'La sucursal volverá a estar disponible en el sistema.',
      confirmLabel: accion.charAt(0).toUpperCase() + accion.slice(1),
    });
    if (!ok) return;
    try {
      const updated = await superAdminApi.toggleEstado(sucursal.id);
      setSucursal(updated);
      addToast('success', `Sucursal ${updated.activa ? 'activada' : 'desactivada'} correctamente.`);
    } catch {
      addToast('error', 'No se pudo cambiar el estado.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sucursal) {
    return (
      <div className="text-center py-24">
        <p className="text-text-secondary">Sucursal no encontrada.</p>
        <button onClick={() => navigate('/superadmin/sucursales')} className="mt-4 text-primary hover:underline text-sm">
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <button
            onClick={() => navigate('/superadmin/sucursales')}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-text-primary truncate">{sucursal.nombre}</h2>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  sucursal.activa
                    ? 'bg-green-100 text-green-700'
                    : 'bg-surface-background text-text-muted border border-border'
                }`}
              >
                {sucursal.activa ? <CheckIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                {sucursal.activa ? 'Activa' : 'Inactiva'}
              </span>
            </div>
            <p className="text-text-secondary text-sm mt-1 truncate">{sucursal.direccion}</p>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex items-center gap-2 flex-shrink-0 pl-12 sm:pl-0">
          <button
            onClick={() => navigate('/superadmin/sucursales')}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-button text-sm text-text-secondary hover:bg-surface-background transition-colors"
          >
            <EditIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Editar</span>
          </button>
          <button
            onClick={toggleEstado}
            className={`flex items-center gap-2 px-3 py-2 rounded-button text-sm font-medium transition-colors ${
              sucursal.activa
                ? 'border border-error/30 text-error hover:bg-error/5'
                : 'border border-green-300 text-green-700 hover:bg-green-50'
            }`}
          >
            <PowerIcon className="w-4 h-4" />
            <span className="hidden sm:inline">{sucursal.activa ? 'Desactivar' : 'Activar'}</span>
          </button>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Datos generales */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface rounded-card border border-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BuildingIcon className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-heading font-semibold text-text-primary">Datos generales</h3>
          </div>

          <div>
            <InfoRow icon={MapPinIcon}  label="Dirección" value={sucursal.direccion} />
            <InfoRow icon={PhoneIcon}   label="Teléfono"  value={sucursal.telefono}  />
            <InfoRow icon={MailIcon}    label="Email"     value={sucursal.email}     />
            <InfoRow icon={CalendarIcon} label="Fecha de creación" value={formatFechaLarga(sucursal.fechaCreacion)} />
          </div>
        </motion.div>

        {/* Owner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-surface rounded-card border border-border p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <UserCogIcon className="w-4 h-4 text-accent" />
            </div>
            <h3 className="font-heading font-semibold text-text-primary">Owner</h3>
          </div>

          {sucursal.owner ? (
            <>
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center text-lg font-bold text-accent">
                  {sucursal.owner.nombre.charAt(0)}{sucursal.owner.apellido.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{sucursal.owner.nombreCompleto}</p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
                      sucursal.owner.estado === 'Activo'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-surface-background text-text-muted border border-border'
                    }`}
                  >
                    {sucursal.owner.estado === 'Activo' ? <CheckIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
                    {sucursal.owner.estado}
                  </span>
                </div>
              </div>

              <InfoRow icon={MailIcon}  label="Email"    value={sucursal.owner.email}    />
              <InfoRow icon={PhoneIcon} label="Teléfono" value={sucursal.owner.telefono} />

              {/* Permisos */}
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-xs text-text-muted font-medium uppercase tracking-wider mb-2">Permisos asignados</p>
                <div className="flex flex-wrap gap-1.5">
                  {['Agendar turnos', 'Editar turnos', 'Cargar cobranzas', 'Ver teléfonos'].map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-background border border-border rounded-full text-xs text-text-secondary"
                    >
                      <ShieldCheckIcon className="w-3 h-3 text-primary" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <UserCogIcon className="w-10 h-10 text-text-muted mb-3" />
              <p className="text-text-secondary text-sm">Sin owner asignado</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Historial de pagos de suscripción */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-surface rounded-card border border-border overflow-hidden"
      >
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ReceiptIcon className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-heading font-semibold text-text-primary">Historial de pagos</h3>
        </div>

        {historial.length === 0 ? (
          <div className="px-6 py-10 text-center text-text-muted text-sm">
            Aún no hay pagos registrados para esta sucursal.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-background border-b border-border">
                <th className="text-left px-6 py-3 font-semibold text-text-secondary">Fecha</th>
                <th className="text-left px-6 py-3 font-semibold text-text-secondary">Plan</th>
                <th className="text-right px-6 py-3 font-semibold text-text-secondary">Monto</th>
                <th className="text-right px-6 py-3 font-semibold text-text-secondary hidden sm:table-cell">ID de pago</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-border last:border-0 ${i % 2 !== 0 ? 'bg-surface-background/50' : ''}`}
                >
                  <td className="px-6 py-3 text-text-secondary whitespace-nowrap">{formatFecha(p.fechaPago)}</td>
                  <td className="px-6 py-3 font-medium text-text-primary">{p.planNombre}</td>
                  <td className="px-6 py-3 text-right font-semibold text-text-primary whitespace-nowrap">{formatPrecio(p.monto)}</td>
                  <td className="px-6 py-3 text-right text-text-muted font-mono text-xs hidden sm:table-cell">#{p.mPPaymentId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </motion.div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
      {ConfirmDialog}
    </div>
  );
}
