import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ui/ModalPortal';
import {
  XIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  MessageSquareIcon,
  PaperclipIcon,
  HistoryIcon,
  CreditCardIcon,
  CheckCircleIcon,
  RotateCcwIcon,
  AlertCircleIcon,
  UserXIcon,
  SendIcon,
  TrashIcon,
  Loader2Icon,
  UploadIcon,
  FileIcon,
  ImageIcon,
  ExternalLinkIcon,
  ChevronDownIcon,
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PaymentBadge } from '../../components/ui/PaymentBadge';
import { turnosApi } from '../../api/turnos';
import { formatFechaLarga, formatHora, formatMoneda } from '../../types';
import type { Turno, ComentarioTurno, AdjuntoTurno, PagoTurnoResponse } from '../../types';
import { useAuth, tienePermiso } from '../../contexts/AuthContext';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { ajustesApi } from '../../api/ajustes';
import { cajaApi } from '../../api/caja';
import type { AjustesSucursal, MedioPago, ConceptoPagoTurno, CajaSesion } from '../../types';

// ─── Utilidad WhatsApp ────────────────────────────────────────────────────────

function generarLinkWhatsApp(turno: Turno, plantilla: string): string {
  const mensaje = plantilla
    .replace(/\{\{ClienteNombre\}\}/g, turno.clienteNombre)
    .replace(/\{\{Servicio\}\}/g,      turno.servicioNombre)
    .replace(/\{\{Fecha\}\}/g,         formatFechaLarga(turno.fechaHoraInicio))
    .replace(/\{\{Hora\}\}/g,          formatHora(turno.fechaHoraInicio));

  // Limpiar teléfono: solo dígitos (asume código de país incluido)
  const telefono = turno.clienteTelefono.replace(/[\s\-\(\)\+]/g, '');

  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

// ─────────────────────────────────────────────────────────────────────────────

type Tab = 'info' | 'pagos' | 'comentarios' | 'adjuntos' | 'historial';

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'info',        label: 'Información', icon: UserIcon },
  { id: 'pagos',       label: 'Pagos',        icon: CreditCardIcon },
  { id: 'comentarios', label: 'Comentarios',  icon: MessageSquareIcon },
  { id: 'adjuntos',    label: 'Adjuntos',     icon: PaperclipIcon },
  { id: 'historial',   label: 'Historial',    icon: HistoryIcon },
];

export function AppointmentDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const puedeVerTelefono = tienePermiso(user, 'VerTelefonoClientes');
  const { ConfirmDialog, confirm } = useConfirmDialog();

  // ── Ajustes (plantillas WhatsApp) ─────────────────────────────────────────
  const [ajustes, setAjustes] = useState<AjustesSucursal | null>(null);

  useEffect(() => {
    if (!user?.sucursalId) return;
    ajustesApi.obtener(user.sucursalId).then(setAjustes).catch(() => null);
  }, [user?.sucursalId]);

  // ── WhatsApp dropdown ─────────────────────────────────────────────────────
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const whatsappBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!whatsappOpen) return;
    const handler = (e: MouseEvent) => {
      if (whatsappBtnRef.current && !whatsappBtnRef.current.contains(e.target as Node)) {
        setWhatsappOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [whatsappOpen]);

  // ── Caja / Registrar pago ─────────────────────────────────────────────────────
  const [cajaId, setCajaId] = useState<string | null>(null);
  const [sesionActiva, setSesionActiva] = useState<CajaSesion | null | undefined>(undefined);
  const [pagos, setPagos]   = useState<PagoTurnoResponse[]>([]);
  const [pagoModal, setPagoModal] = useState(false);
  const [pagoForm, setPagoForm] = useState<{
    concepto: ConceptoPagoTurno;
    medio: MedioPago;
    monto: number;
    obs: string;
  }>({ concepto: 'PagoTotal', medio: 'Efectivo', monto: 0, obs: '' });
  const [savingPago, setSavingPago] = useState(false);
  const [errorPago, setErrorPago] = useState('');

  useEffect(() => {
    if (!user?.sucursalId) return;
    cajaApi.obtenerPorSucursal(user.sucursalId)
      .then((c) => {
        setCajaId(c.id);
        return cajaApi.obtenerSesionActiva(c.id);
      })
      .then((sesion) => setSesionActiva(sesion))
      .catch(() => setSesionActiva(null));
  }, [user?.sucursalId]);

  const handleAbrirPago = () => {
    if (!turno) return;
    const pendiente = Math.max(0, turno.precioServicio - turno.totalCobrado);
    setPagoForm({ concepto: 'PagoTotal', medio: 'Efectivo', monto: pendiente, obs: '' });
    setErrorPago('');
    setPagoModal(true);
  };

  const handleRegistrarPago = async () => {
    if (!cajaId || !turno || pagoForm.monto <= 0) return;
    setSavingPago(true);
    setErrorPago('');
    try {
      const movimiento = await cajaApi.registrarMovimiento(cajaId, {
        turnoId: turno.id,
        tipoMovimiento: 'CobroTurno',
        medioPago: pagoForm.medio,
        monto: pagoForm.monto,
        conceptoPago: pagoForm.concepto,
        observaciones: pagoForm.obs || undefined,
      });
      const nuevoTotal = pagoForm.concepto === 'Ajuste'
        ? turno.totalCobrado - pagoForm.monto
        : turno.totalCobrado + pagoForm.monto;
      setTurno((prev) =>
        prev ? { ...prev, totalCobrado: nuevoTotal } : prev
      );
      // Agregar el pago al historial con el concepto real devuelto por el backend
      if (movimiento.conceptoPago) {
        setPagos((prev) => [...prev, {
          id:       movimiento.id,
          concepto: movimiento.conceptoPago!,
          monto:    movimiento.monto,
          fecha:    movimiento.fecha,
        }]);
      }
      setPagoModal(false);
    } catch (err: unknown) {
      setErrorPago(err instanceof Error ? err.message : 'Error al registrar el pago.');
    } finally {
      setSavingPago(false);
    }
  };

  // ── Adjuntos ──────────────────────────────────────────────────────────────────
  const [adjuntos, setAdjuntos]               = useState<AdjuntoTurno[]>([]);
  const [loadingAdjuntos, setLoadingAdjuntos] = useState(false);
  const [subiendoAdjunto, setSubiendoAdjunto] = useState(false);
  const [errorAdjunto, setErrorAdjunto]       = useState('');

  // ── Comentarios ──────────────────────────────────────────────────────────────
  const [comentarios, setComentarios] = useState<ComentarioTurno[]>([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [errorComentario, setErrorComentario] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [turno, setTurno] = useState<Turno | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    turnosApi
      .obtener(id)
      .then(setTurno)
      .catch(() => navigate('/admin/agenda'))
      .finally(() => setLoading(false));
    turnosApi.listarPagos(id).then(setPagos).catch(() => setPagos([]));
  }, [id, navigate]);

  useEffect(() => {
    if (activeTab !== 'adjuntos' || !id) return;
    setLoadingAdjuntos(true);
    turnosApi
      .listarAdjuntos(id)
      .then(setAdjuntos)
      .catch(() => setAdjuntos([]))
      .finally(() => setLoadingAdjuntos(false));
  }, [activeTab, id]);

  const handleSubirArchivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    setSubiendoAdjunto(true);
    setErrorAdjunto('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const nuevo = await turnosApi.subirAdjunto(id, formData);
      setAdjuntos((prev) => [...prev, nuevo]);
    } catch {
      setErrorAdjunto('No se pudo subir el archivo. Intentá de nuevo.');
    } finally {
      setSubiendoAdjunto(false);
      e.target.value = ''; // reset para permitir re-subir el mismo archivo
    }
  };

  const handleEliminarAdjunto = async (adjuntoId: string, nombreArchivo: string) => {
    if (!id) return;
    const ok = await confirm({
      title: '¿Eliminar archivo adjunto?',
      description: `"${nombreArchivo}" se eliminará permanentemente y no podrá recuperarse.`,
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await turnosApi.eliminarAdjunto(id, adjuntoId);
      setAdjuntos((prev) => prev.filter((a) => a.id !== adjuntoId));
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    if (activeTab !== 'comentarios' || !id) return;
    setLoadingComentarios(true);
    turnosApi
      .listarComentarios(id)
      .then(setComentarios)
      .catch(() => setComentarios([]))
      .finally(() => setLoadingComentarios(false));
  }, [activeTab, id]);

  const handleEnviarComentario = async () => {
    if (!nuevoComentario.trim() || !id) return;
    setEnviandoComentario(true);
    setErrorComentario('');
    try {
      const nuevo = await turnosApi.crearComentario(id, nuevoComentario.trim());
      setComentarios((prev) => [...prev, nuevo]);
      setNuevoComentario('');
    } catch {
      setErrorComentario('No se pudo enviar el comentario. Intentá de nuevo.');
    } finally {
      setEnviandoComentario(false);
    }
  };

  const handleEliminarComentario = async (comentarioId: string) => {
    if (!id) return;
    const ok = await confirm({
      title: '¿Eliminar comentario?',
      description: 'Esta nota interna se eliminará permanentemente.',
      confirmLabel: 'Eliminar',
    });
    if (!ok) return;
    try {
      await turnosApi.eliminarComentario(id, comentarioId);
      setComentarios((prev) => prev.filter((c) => c.id !== comentarioId));
    } catch {
      // silencioso — el backend responde con 400 si no es el autor
    }
  };

  const handleUpdateEstado = async (estado: Turno['estado']) => {
    if (!turno) return;
    if (estado === 'CanceladoStaff') {
      const ok = await confirm({
        title: '¿Cancelar este turno?',
        description: 'Se notificará al cliente por email. Esta acción no se puede deshacer.',
        confirmLabel: 'Sí, cancelar',
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      const updated = await turnosApi.actualizar(turno.id, { estado });
      setTurno(updated);
    } catch {
      // silencioso
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => navigate('/admin/agenda');

  // Visibilidad del botón WhatsApp (evaluado dentro del bloque !turno ? null : ...)
  const mostrarWhatsApp =
    !!ajustes?.enviaRecordatorioWhatsapp &&
    !!turno?.clienteTelefono?.trim() &&
    !!(ajustes?.mensajeWhatsApp24h || ajustes?.mensajeWhatsApp3h);

  return (
    <ModalPortal>
    <>
    <div className="fixed inset-0 z-50 flex justify-end bg-text-primary/20 backdrop-blur-sm">
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl bg-surface h-full shadow-2xl flex flex-col"
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !turno ? null : (
          <>
            {/* Header */}
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-border bg-surface-background flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-heading font-bold text-text-primary">
                    Turno #{turno.id.slice(0, 8).toUpperCase()}
                  </h2>
                  <StatusBadge estado={turno.estado} />
                </div>
                <p className="text-text-secondary flex items-center gap-2 text-sm">
                  <CalendarIcon className="w-4 h-4" />
                  <span className="capitalize">{formatFechaLarga(turno.fechaHoraInicio)}</span>
                  <span className="mx-1">•</span>
                  <ClockIcon className="w-4 h-4" />
                  {formatHora(turno.fechaHoraInicio)} – {formatHora(turno.fechaHoraFin)}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-border/50 rounded-full transition-colors"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Action Bar */}
            {(turno.estado === 'Confirmado' || turno.estado === 'Pendiente') && (
              <div className="px-4 sm:px-8 py-4 border-b border-border flex gap-3 flex-wrap items-center">
                {turno.estado === 'Pendiente' && (
                  <button
                    onClick={() => handleUpdateEstado('Confirmado')}
                    disabled={saving}
                    className="px-4 py-2 bg-surface border border-border text-text-primary rounded-button text-sm font-medium hover:bg-surface-background transition-colors disabled:opacity-40 flex items-center gap-2"
                  >
                    <RotateCcwIcon className="w-4 h-4" />
                    Confirmar
                  </button>
                )}
                {turno.estado === 'Confirmado' && (
                  <>
                    <button
                      onClick={() => handleUpdateEstado('Completado')}
                      disabled={saving}
                      className="px-4 py-2 bg-success text-white rounded-button text-sm font-medium hover:bg-success/90 transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                      <CheckCircleIcon className="w-4 h-4" />
                      Completar
                    </button>
                    <button
                      onClick={() => handleUpdateEstado('NoShow')}
                      disabled={saving}
                      className="px-4 py-2 bg-surface border border-warning/40 text-warning rounded-button text-sm font-medium hover:bg-warning/10 transition-colors disabled:opacity-40 flex items-center gap-2"
                    >
                      <UserXIcon className="w-4 h-4" />
                      Ausente
                    </button>
                  </>
                )}
                {/* Botón WhatsApp dropdown */}
                {mostrarWhatsApp && (
                  <div ref={whatsappBtnRef} className="relative ml-auto">
                    <button
                      onClick={() => setWhatsappOpen((o) => !o)}
                      className="px-3 py-2 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] rounded-button text-sm font-medium hover:bg-[#25D366]/20 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Recordatorio
                      <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-150 ${whatsappOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {whatsappOpen && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded-xl shadow-lg z-10 overflow-hidden">
                        {ajustes?.mensajeWhatsApp24h && (
                          <button
                            onClick={() => { window.open(generarLinkWhatsApp(turno, ajustes.mensajeWhatsApp24h!), '_blank'); setWhatsappOpen(false); }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-surface-background transition-colors text-left"
                          >
                            <svg className="w-4 h-4 text-[#25D366] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            <div>
                              <p className="font-medium">24 horas antes</p>
                              <p className="text-xs text-text-muted">Recordatorio del día anterior</p>
                            </div>
                          </button>
                        )}
                        {ajustes?.mensajeWhatsApp3h && (
                          <button
                            onClick={() => { window.open(generarLinkWhatsApp(turno, ajustes.mensajeWhatsApp3h!), '_blank'); setWhatsappOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-text-primary hover:bg-surface-background transition-colors text-left ${ajustes?.mensajeWhatsApp24h ? 'border-t border-border/50' : ''}`}
                          >
                            <svg className="w-4 h-4 text-[#25D366] flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            <div>
                              <p className="font-medium">3 horas antes</p>
                              <p className="text-xs text-text-muted">Recordatorio del mismo día</p>
                            </div>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => handleUpdateEstado('CanceladoStaff')}
                  disabled={saving}
                  className={`px-4 py-2 bg-surface border border-error/30 text-error rounded-button text-sm font-medium hover:bg-error/10 transition-colors flex items-center gap-2 disabled:opacity-40 ${mostrarWhatsApp ? '' : 'ml-auto'}`}
                >
                  <AlertCircleIcon className="w-4 h-4" />
                  Cancelar turno
                </button>
              </div>
            )}

            {/* Tabs */}
            <div className="px-4 sm:px-8 border-b border-border flex gap-6 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                      isActive ? 'text-primary border-primary' : 'text-text-secondary border-transparent hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              <AnimatePresence mode="wait">
                {activeTab === 'info' && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    {/* Cliente */}
                    <section>
                      <h3 className="text-lg font-heading font-bold text-text-primary mb-4">Cliente</h3>
                      <div className="bg-surface-background rounded-card p-5 border border-border">
                        <p className="text-xl font-semibold text-text-primary mb-4">{turno.clienteNombre}</p>
                        <div className="flex items-center gap-3 text-text-secondary">
                          <div className="p-2 bg-surface rounded-lg border border-border">
                            <PhoneIcon className="w-4 h-4" />
                          </div>
                          {puedeVerTelefono ? (
                            <a href={`tel:${turno.clienteTelefono}`} className="hover:text-primary transition-colors">
                              {turno.clienteTelefono}
                            </a>
                          ) : (
                            <span className="text-text-muted italic text-sm">Sin permiso para ver teléfono</span>
                          )}
                        </div>
                      </div>
                    </section>

                    {/* Servicio */}
                    <section>
                      <h3 className="text-lg font-heading font-bold text-text-primary mb-4">Servicio</h3>
                      <div className="bg-surface-background rounded-card p-5 border border-border">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-lg font-semibold text-text-primary">{turno.servicioNombre}</p>
                          </div>
                          <p className="text-xl font-bold text-text-primary">
                            {formatMoneda(turno.precioServicio)}
                          </p>
                        </div>
                        <div className="pt-4 border-t border-border flex items-center gap-3">
                          <span className="text-sm text-text-secondary">Profesional:</span>
                          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full border border-border text-sm font-medium">
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            {turno.profesionalNombre}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Observaciones */}
                    {turno.observaciones && (
                      <section>
                        <h3 className="text-lg font-heading font-bold text-text-primary mb-4">Observaciones</h3>
                        <div className="bg-warning/10 rounded-card p-5 border border-warning/20 text-text-primary">
                          {turno.observaciones}
                        </div>
                      </section>
                    )}

                    {/* Origen */}
                    <section>
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        <span>Origen: <span className="font-medium text-text-primary">{turno.origen}</span></span>
                        <span>Token: <span className="font-mono text-xs">{turno.tokenGestion.slice(0, 12)}…</span></span>
                      </div>
                    </section>
                  </motion.div>
                )}

                {activeTab === 'pagos' && (
                  <motion.div
                    key="pagos"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="bg-surface-background rounded-card p-6 border border-border grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-text-secondary mb-1">Total servicio</p>
                        <p className="text-2xl font-bold text-text-primary">{formatMoneda(turno.precioServicio)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary mb-1">Cobrado</p>
                        <p className="text-2xl font-bold text-success">{formatMoneda(turno.totalCobrado)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-text-secondary mb-1">Pendiente</p>
                        <p className="text-2xl font-bold text-error">
                          {formatMoneda(Math.max(0, turno.precioServicio - turno.totalCobrado))}
                        </p>
                      </div>
                    </div>

                    {turno.montoSena != null && turno.montoSena > 0 && (
                      <div className="flex items-center gap-3 p-4 bg-warning/10 border border-warning/20 rounded-card text-sm">
                        <AlertCircleIcon className="w-5 h-5 text-warning flex-shrink-0" />
                        <span>
                          Seña requerida: <strong>{formatMoneda(turno.montoSena)}</strong>
                        </span>
                        <PaymentBadge concepto="Sena" className="ml-auto" />
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-heading font-bold text-text-primary">Historial de pagos</h3>
                      <button
                        onClick={handleAbrirPago}
                        disabled={!cajaId}
                        className="px-4 py-2 bg-primary text-white rounded-button text-sm font-medium hover:bg-primary-dark transition-colors disabled:opacity-50"
                      >
                        + Registrar pago
                      </button>
                    </div>

                    <div className="border border-border rounded-card overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-surface-background text-text-secondary border-b border-border">
                          <tr>
                            <th className="px-4 py-3 font-medium">Fecha</th>
                            <th className="px-4 py-3 font-medium">Concepto</th>
                            <th className="px-4 py-3 font-medium text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagos.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-text-muted">
                                Sin pagos registrados
                              </td>
                            </tr>
                          ) : (
                            pagos.map((p) => (
                              <tr key={p.id} className="border-b border-border/50 last:border-0">
                                <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                                  {formatFechaLarga(p.fecha)} {formatHora(p.fecha)}
                                </td>
                                <td className="px-4 py-3">
                                  <PaymentBadge concepto={p.concepto} />
                                </td>
                                <td className={`px-4 py-3 text-right font-medium ${p.concepto === 'Ajuste' ? 'text-error' : 'text-success'}`}>
                                  {p.concepto === 'Ajuste' ? `-${formatMoneda(p.monto)}` : formatMoneda(p.monto)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'comentarios' && (
                  <motion.div
                    key="comentarios"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Lista de comentarios */}
                    {loadingComentarios ? (
                      <div className="flex justify-center py-10">
                        <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : comentarios.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-14 h-14 bg-surface-background rounded-full flex items-center justify-center mb-3 text-text-muted">
                          <MessageSquareIcon className="w-7 h-7" />
                        </div>
                        <p className="text-sm text-text-muted">Sin comentarios todavía.</p>
                        <p className="text-xs text-text-muted mt-0.5">Sé el primero en dejar una nota interna.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {comentarios.map((c) => {
                          const esPropio = c.autorUsuarioId === user?.userId;
                          return (
                            <div
                              key={c.id}
                              className="flex gap-3 group"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary-light/30 flex items-center justify-center text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                                {c.autorNombre.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                  <span className="text-sm font-semibold text-text-primary">{c.autorNombre}</span>
                                  <span className="text-xs text-text-muted">
                                    {new Date(c.fecha).toLocaleString('es-AR', {
                                      day: 'numeric', month: 'short',
                                      hour: '2-digit', minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words">
                                  {c.texto}
                                </p>
                              </div>
                              {esPropio && (
                                <button
                                  onClick={() => handleEliminarComentario(c.id)}
                                  className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-error transition-all rounded flex-shrink-0 mt-0.5"
                                  title="Eliminar comentario"
                                >
                                  <TrashIcon className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Input nuevo comentario */}
                    <div className="border-t border-border pt-4 mt-2">
                      {errorComentario && (
                        <p className="text-xs text-error mb-2">{errorComentario}</p>
                      )}
                      <div className="flex gap-2 items-end">
                        <textarea
                          value={nuevoComentario}
                          onChange={(e) => setNuevoComentario(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleEnviarComentario();
                            }
                          }}
                          placeholder="Escribí una nota interna… (Enter para enviar)"
                          rows={2}
                          className="flex-1 px-3 py-2 bg-surface-background border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none placeholder:text-text-muted"
                        />
                        <button
                          onClick={handleEnviarComentario}
                          disabled={!nuevoComentario.trim() || enviandoComentario}
                          className="p-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0"
                        >
                          {enviandoComentario
                            ? <Loader2Icon className="w-4 h-4 animate-spin" />
                            : <SendIcon className="w-4 h-4" />
                          }
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'adjuntos' && (
                  <motion.div
                    key="adjuntos"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Header con botón de subida */}
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-heading font-bold text-text-primary">
                        Archivos adjuntos
                      </h3>
                      <label className={`cursor-pointer px-4 py-2 bg-primary text-white rounded-button text-sm font-medium transition-colors flex items-center gap-2 ${subiendoAdjunto ? 'opacity-60 pointer-events-none' : 'hover:bg-primary/90'}`}>
                        {subiendoAdjunto
                          ? <Loader2Icon className="w-4 h-4 animate-spin" />
                          : <UploadIcon className="w-4 h-4" />
                        }
                        {subiendoAdjunto ? 'Subiendo…' : 'Subir archivo'}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf"
                          onChange={handleSubirArchivo}
                          disabled={subiendoAdjunto}
                        />
                      </label>
                    </div>

                    {/* Error de subida */}
                    {errorAdjunto && (
                      <p className="text-xs text-error">{errorAdjunto}</p>
                    )}

                    {/* Lista */}
                    {loadingAdjuntos ? (
                      <div className="flex justify-center py-10">
                        <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : adjuntos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-14 h-14 bg-surface-background rounded-full flex items-center justify-center mb-3 text-text-muted">
                          <PaperclipIcon className="w-7 h-7" />
                        </div>
                        <p className="text-sm text-text-muted">Sin archivos adjuntos.</p>
                        <p className="text-xs text-text-muted mt-0.5">Podés subir imágenes o PDFs.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {adjuntos.map((adj) => {
                          const esPdf = adj.tipoRecurso === 'raw' || adj.nombreArchivo.toLowerCase().endsWith('.pdf');
                          return (
                            <div
                              key={adj.id}
                              className="flex items-center gap-3 p-3 bg-surface-background rounded-card border border-border group"
                            >
                              <div className="p-2 bg-surface rounded-lg border border-border text-text-muted flex-shrink-0">
                                {esPdf
                                  ? <FileIcon className="w-4 h-4" />
                                  : <ImageIcon className="w-4 h-4" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-text-primary truncate">
                                  {adj.nombreArchivo}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {new Date(adj.fecha).toLocaleString('es-AR', {
                                    day: 'numeric', month: 'short',
                                    hour: '2-digit', minute: '2-digit',
                                  })}
                                </p>
                              </div>
                              <a
                                href={adj.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-text-muted hover:text-primary transition-colors rounded flex-shrink-0"
                                title="Ver archivo"
                              >
                                <ExternalLinkIcon className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => handleEliminarAdjunto(adj.id, adj.nombreArchivo)}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-error transition-all rounded flex-shrink-0"
                                title="Eliminar adjunto"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'historial' && (
                  <motion.div
                    key="historial"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-20 text-center"
                  >
                    <div className="w-16 h-16 bg-surface-background rounded-full flex items-center justify-center mb-4 text-text-muted">
                      <HistoryIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-heading font-bold text-text-primary mb-2">
                      Historial de cambios
                    </h3>
                    <p className="text-text-secondary max-w-sm">
                      Esta sección estará disponible en la próxima versión del sistema.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        )}
      </motion.div>
    </div>
    {ConfirmDialog}

    {/* Modal de pago */}
    <AnimatePresence>
      {pagoModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-text-primary/20 backdrop-blur-sm px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-surface rounded-card shadow-2xl w-full max-w-sm p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-bold text-lg text-text-primary">Registrar pago</h3>
              <button onClick={() => setPagoModal(false)} className="text-text-muted hover:text-text-primary">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Concepto</label>
                <select
                  value={pagoForm.concepto}
                  onChange={(e) => setPagoForm((f) => ({ ...f, concepto: e.target.value as ConceptoPagoTurno }))}
                  className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  <option value="Sena">Seña</option>
                  <option value="PagoParcial">Pago parcial</option>
                  <option value="PagoTotal">Pago total</option>
                  <option value="SaldoFinal">Saldo final</option>
                  <option value="Ajuste">Ajuste</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Medio de pago</label>
                <select
                  value={pagoForm.medio}
                  onChange={(e) => setPagoForm((f) => ({ ...f, medio: e.target.value as MedioPago }))}
                  className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                >
                  {(['Efectivo', 'MercadoPago'] as MedioPago[]).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Monto *</label>
                <input
                  type="number"
                  value={pagoForm.monto || ''}
                  onChange={(e) => setPagoForm((f) => ({ ...f, monto: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  placeholder="0"
                  min={0}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">Observaciones</label>
                <input
                  type="text"
                  value={pagoForm.obs}
                  onChange={(e) => setPagoForm((f) => ({ ...f, obs: e.target.value }))}
                  maxLength={500}
                  className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                  placeholder="Opcional"
                />
              </div>

              {sesionActiva === null && (
                <div className="flex items-start gap-2 rounded-input border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-warning">
                  <AlertCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>No hay sesión de caja abierta. El pago se registrará pero no se asociará a ninguna sesión de reconciliación.</span>
                </div>
              )}

              {errorPago && (
                <p className="text-xs text-error">{errorPago}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setPagoModal(false)}
                className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarPago}
                disabled={pagoForm.monto <= 0 || savingPago}
                className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50"
              >
                {savingPago ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
    </ModalPortal>
  );
}
