import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalPortal } from '../../components/ui/ModalPortal';
import {
  WalletIcon,
  PlusIcon,
  XIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  ChevronDownIcon,
  UserIcon,
  Scissors,
  CalendarIcon,
  ExternalLinkIcon,
  LockIcon,
  UnlockIcon,
  HistoryIcon,
} from 'lucide-react';
import { cajaApi } from '../../api/caja';
import { turnosApi } from '../../api/turnos';
import { ToastContainer } from '../../components/ui/Toast';
import { Pagination } from '../../components/ui/Pagination';
import { useToast } from '../../hooks/useToast';
import { usePagination } from '../../hooks/usePagination';
import { PaymentBadge } from '../../components/ui/PaymentBadge';
import { formatMoneda, formatFechaCorta, formatHora, formatFechaLarga } from '../../types';
import type {
  CajaInfo,
  MovimientoCaja,
  RegistrarMovimientoDto,
  TipoMovimientoCaja,
  MedioPago,
  ConceptoPagoTurno,
  Turno,
  CajaSesion,
  AbrirSesionDto,
  CerrarSesionDto,
} from '../../types';
import { useAuth } from '../../contexts/AuthContext';

const TIPOS: TipoMovimientoCaja[] = ['CobroTurno', 'Gasto', 'Retiro', 'Ajuste', 'IngresoManual'];
const MEDIOS: MedioPago[] = ['Efectivo', 'MercadoPago'];
const CONCEPTOS: ConceptoPagoTurno[] = ['Sena', 'PagoParcial', 'PagoTotal', 'SaldoFinal'];

const TIPO_LABELS: Record<TipoMovimientoCaja, string> = {
  CobroTurno:    'Cobro de turno',
  Gasto:         'Gasto',
  Retiro:        'Retiro',
  Ajuste:        'Ajuste',
  IngresoManual: 'Ingreso manual',
};

const CONCEPTO_LABELS: Record<ConceptoPagoTurno, string> = {
  Sena:        'Seña',
  PagoParcial: 'Pago parcial',
  PagoTotal:   'Pago total',
  SaldoFinal:  'Saldo final',
};

const isIngreso = (tipo: TipoMovimientoCaja) =>
  tipo === 'CobroTurno' || tipo === 'IngresoManual';

interface FormState {
  tipoMovimiento: TipoMovimientoCaja;
  medioPago: MedioPago;
  monto: number;
  observaciones: string;
  turnoId?: string;
  conceptoPago?: ConceptoPagoTurno;
}

const EMPTY_FORM: FormState = {
  tipoMovimiento: 'CobroTurno',
  medioPago: 'Efectivo',
  monto: 0,
  observaciones: '',
  turnoId: undefined,
  conceptoPago: undefined,
};

export function Caja() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toasts, addToast, dismiss } = useToast();
  const [caja, setCaja] = useState<CajaInfo | null>(null);
  const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
  const [loading, setLoading] = useState(true);

  // Para cada movimiento de tipo CobroTurno calcula el acumulado cobrado en ese turno
  // hasta ese pago (no el totalCobrado actual del turno, sino el histórico).
  const acumuladoPorMovimiento = useMemo(() => {
    const map = new Map<string, number>(); // movimientoId → acumulado en ese momento
    const porTurno = new Map<string, MovimientoCaja[]>();
    for (const m of movimientos) {
      if (m.tipoMovimiento === 'CobroTurno' && m.turnoId) {
        if (!porTurno.has(m.turnoId)) porTurno.set(m.turnoId, []);
        porTurno.get(m.turnoId)!.push(m);
      }
    }
    for (const movs of porTurno.values()) {
      const ordenados = [...movs].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      );
      let acum = 0;
      for (const mov of ordenados) {
        acum += mov.conceptoPago === 'Ajuste' ? -mov.monto : mov.monto;
        map.set(mov.id, acum);
      }
    }
    return map;
  }, [movimientos]);
  const [desde, setDesde] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [hasta, setHasta] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  // Turnos disponibles para CobroTurno
  const [turnos, setTurnos] = useState<Turno[]>([]);
  // Fila expandida
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { page: pageMovs, setPage: setPageMovs, totalPages: totalPagesMovs,
          paginated: paginatedMovs, total: totalMovs, pageSize: pageSizeMovs } =
    usePagination(movimientos, 15);

  // ── Sesiones ──────────────────────────────────────────────────────────────
  const [sesionActiva, setSesionActiva] = useState<CajaSesion | null>(null);
  const [sesiones, setSesiones] = useState<CajaSesion[]>([]);
  const [tab, setTab] = useState<'movimientos' | 'historial'>('movimientos');
  const [modalSesion, setModalSesion] = useState<'abrir' | 'cerrar' | null>(null);
  const [sesionSaving, setSesionSaving] = useState(false);

  // Abrir sesión form
  const [montoInicial, setMontoInicial] = useState<number>(0);
  const [obsApertura, setObsApertura] = useState('');

  // Cerrar sesión form
  const [montoFinalReal, setMontoFinalReal] = useState<number>(0);
  const [obsCierre, setObsCierre] = useState('');

  const cargarMovimientos = (cajaId: string) => {
    cajaApi
      .listarMovimientos(cajaId, desde, hasta)
      .then(setMovimientos)
      .catch(() => addToast('error', 'No se pudieron cargar los movimientos.'))
      .finally(() => setLoading(false));
  };

  const cargarSesionActiva = async (cajaId: string) => {
    try {
      const s = await cajaApi.obtenerSesionActiva(cajaId);
      setSesionActiva(s ?? null);
    } catch {
      setSesionActiva(null);
    }
  };

  const cargarHistorialSesiones = async (cajaId: string) => {
    try {
      const lista = await cajaApi.listarSesiones(cajaId);
      setSesiones(lista);
    } catch {
      setSesiones([]);
    }
  };

  useEffect(() => {
    if (!user?.sucursalId) return;
    setLoading(true);
    cajaApi
      .obtenerPorSucursal(user.sucursalId)
      .then((c) => {
        setCaja(c);
        cargarMovimientos(c.id);
        cargarSesionActiva(c.id);
        cargarHistorialSesiones(c.id);
      })
      .catch(() => {
        addToast('error', 'No se encontró la caja para esta sucursal.');
        setLoading(false);
      });

    turnosApi
      .listar(user.sucursalId)
      .then((list) =>
        setTurnos(list.filter((t) => t.estado === 'Confirmado' || t.estado === 'Pendiente'))
      )
      .catch(() => null);
  }, [user?.sucursalId]);

  useEffect(() => {
    if (caja) { cargarMovimientos(caja.id); setPageMovs(1); }
  }, [desde, hasta]);

  useEffect(() => {
    if (caja && tab === 'historial') cargarHistorialSesiones(caja.id);
  }, [tab]);

  const ingresos = movimientos.filter((m) => isIngreso(m.tipoMovimiento)).reduce((s, m) => s + m.monto, 0);
  const egresos  = movimientos.filter((m) => !isIngreso(m.tipoMovimiento)).reduce((s, m) => s + m.monto, 0);
  const saldo    = ingresos - egresos;

  // Monto esperado al cerrar (calculado reactivamente)
  const ingresosActuales = movimientos.filter((m) => isIngreso(m.tipoMovimiento)).reduce((s, m) => s + m.monto, 0);
  const egresosActuales  = movimientos.filter((m) => !isIngreso(m.tipoMovimiento)).reduce((s, m) => s + m.monto, 0);
  const montoEsperadoCierre = sesionActiva
    ? sesionActiva.montoInicial + ingresosActuales - egresosActuales
    : 0;
  const diferenciaCierre = montoFinalReal - montoEsperadoCierre;

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleTipoChange = (tipo: TipoMovimientoCaja) => {
    if (tipo !== 'CobroTurno') {
      setForm((f) => ({ ...f, tipoMovimiento: tipo, turnoId: undefined, conceptoPago: undefined }));
    } else {
      setField('tipoMovimiento', tipo);
    }
  };

  const handleRegistrar = async () => {
    if (!caja || form.monto <= 0) return;
    if (form.tipoMovimiento === 'CobroTurno' && !form.turnoId) {
      addToast('error', 'Seleccioná un turno para el cobro.');
      return;
    }
    setSaving(true);
    try {
      const dto: RegistrarMovimientoDto = {
        tipoMovimiento: form.tipoMovimiento,
        medioPago: form.medioPago,
        monto: form.monto,
        observaciones: form.observaciones || undefined,
        turnoId: form.turnoId,
        conceptoPago: form.conceptoPago,
      };
      const nuevo = await cajaApi.registrarMovimiento(caja.id, dto);
      setMovimientos((prev) => [nuevo, ...prev]);
      addToast('success', 'Movimiento registrado.');
      setModalOpen(false);
      setForm({ ...EMPTY_FORM });
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Error al registrar.');
    } finally {
      setSaving(false);
    }
  };

  const handleAbrirSesion = async () => {
    if (!caja) return;
    setSesionSaving(true);
    try {
      const dto: AbrirSesionDto = { montoInicial, observaciones: obsApertura || undefined };
      const sesion = await cajaApi.abrirSesion(caja.id, dto);
      setSesionActiva(sesion);
      setModalSesion(null);
      setMontoInicial(0);
      setObsApertura('');
      addToast('success', 'Sesión abierta correctamente.');
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Error al abrir sesión.');
    } finally {
      setSesionSaving(false);
    }
  };

  const handleCerrarSesion = async () => {
    if (!caja) return;
    setSesionSaving(true);
    try {
      const dto: CerrarSesionDto = { montoFinalReal, observaciones: obsCierre || undefined };
      const sesion = await cajaApi.cerrarSesion(caja.id, dto);
      setSesionActiva(null);
      setSesiones((prev) => [sesion, ...prev]);
      setModalSesion(null);
      setMontoFinalReal(0);
      setObsCierre('');
      addToast('success', 'Sesión cerrada correctamente.');
    } catch (err: unknown) {
      addToast('error', err instanceof Error ? err.message : 'Error al cerrar sesión.');
    } finally {
      setSesionSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-text-primary">Caja</h2>
          {caja && <p className="text-text-secondary text-sm mt-1">{caja.nombre}</p>}
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={() => setModalOpen(true)}
            disabled={!caja || !sesionActiva}
            title={!sesionActiva ? 'Abrí una sesión de caja para registrar movimientos' : undefined}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-button text-sm font-medium transition-colors flex items-center gap-2 self-start disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="w-4 h-4" />
            Registrar movimiento
          </button>
          {!sesionActiva && caja && (
            <p className="text-xs text-warning">Requiere sesión activa</p>
          )}
        </div>
      </div>

      {/* Banner de sesión */}
      {caja && (
        sesionActiva ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-success/10 border border-success/30 rounded-card p-4">
            <div className="flex items-center gap-3">
              <UnlockIcon className="w-5 h-5 text-success flex-shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-success">Sesión abierta</span>
                <span className="text-text-secondary"> desde {formatFechaCorta(sesionActiva.fechaApertura)} {formatHora(sesionActiva.fechaApertura)}</span>
                <span className="text-text-secondary"> · Fondo inicial: <span className="font-medium text-text-primary">{formatMoneda(sesionActiva.montoInicial)}</span></span>
                {sesionActiva.usuarioAperturaNombre && (
                  <span className="text-text-secondary"> · {sesionActiva.usuarioAperturaNombre}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => { setMontoFinalReal(0); setObsCierre(''); setModalSesion('cerrar'); }}
              className="flex items-center gap-2 bg-error hover:bg-error/90 text-white px-3 py-1.5 rounded-button text-sm font-medium transition-colors self-start sm:self-auto"
            >
              <LockIcon className="w-4 h-4" />
              Cerrar caja
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-warning/10 border border-warning/30 rounded-card p-4">
            <div className="flex items-center gap-3">
              <LockIcon className="w-5 h-5 text-warning flex-shrink-0" />
              <p className="text-sm text-text-secondary">
                <span className="font-semibold text-warning">Sin sesión activa.</span> Abrí una sesión para registrar el fondo inicial y vincular los movimientos.
              </p>
            </div>
            <button
              onClick={() => { setMontoInicial(0); setObsApertura(''); setModalSesion('abrir'); }}
              className="flex items-center gap-2 bg-success hover:bg-success/90 text-white px-3 py-1.5 rounded-button text-sm font-medium transition-colors self-start sm:self-auto"
            >
              <UnlockIcon className="w-4 h-4" />
              Abrir sesión
            </button>
          </div>
        )
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-surface rounded-card border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-success/10 text-success rounded-lg">
              <TrendingUpIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-text-secondary">Ingresos</p>
          </div>
          <p className="text-2xl font-heading font-bold text-success">{formatMoneda(ingresos)}</p>
        </div>
        <div className="bg-surface rounded-card border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-error/10 text-error rounded-lg">
              <TrendingDownIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-text-secondary">Egresos</p>
          </div>
          <p className="text-2xl font-heading font-bold text-error">{formatMoneda(egresos)}</p>
        </div>
        <div className="bg-surface rounded-card border border-border shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <WalletIcon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-text-secondary">Saldo neto</p>
          </div>
          <p className={`text-2xl font-heading font-bold ${saldo >= 0 ? 'text-success' : 'text-error'}`}>
            {formatMoneda(saldo)}
          </p>
        </div>
      </div>

      {/* Indicador de sesión compacto */}
      {caja && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium border ${sesionActiva ? 'bg-success/8 text-success border-success/20' : 'bg-warning/8 text-warning border-warning/20'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sesionActiva ? 'bg-success' : 'bg-warning'}`} />
            Sesión actual: {sesionActiva ? `Abierta · fondo ${formatMoneda(sesionActiva.montoInicial)}` : 'Cerrada'}
          </span>
          <span>· Los valores de arriba reflejan el período seleccionado</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('movimientos')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'movimientos' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          Movimientos
        </button>
        <button
          onClick={() => setTab('historial')}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === 'historial' ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
        >
          <HistoryIcon className="w-3.5 h-3.5" />
          Historial de sesiones
        </button>
      </div>

      {/* Tab: Movimientos */}
      {tab === 'movimientos' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 bg-surface rounded-card border border-border p-4">
            <span className="text-sm font-medium text-text-secondary">Período:</span>
            <div className="flex items-center gap-2">
              <input
                type="date" value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="px-3 py-1.5 rounded-input border border-border bg-surface-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <MinusIcon className="w-4 h-4 text-text-muted" />
              <input
                type="date" value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="px-3 py-1.5 rounded-input border border-border bg-surface-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <span className="text-sm text-text-muted ml-auto">{movimientos.length} movimientos</span>

          </div>

          {/* Movements Table */}
          <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : movimientos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <WalletIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="font-heading font-bold text-text-primary mb-1">Sin movimientos</h3>
                <p className="text-text-secondary text-sm">No hay movimientos en el período seleccionado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-background border-b border-border">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold text-text-secondary">Fecha</th>
                      <th className="text-left px-6 py-3 font-semibold text-text-secondary">Tipo</th>
                      <th className="text-left px-6 py-3 font-semibold text-text-secondary hidden md:table-cell">Medio</th>
                      <th className="text-left px-6 py-3 font-semibold text-text-secondary hidden lg:table-cell">Observaciones</th>
                      <th className="text-right px-6 py-3 font-semibold text-text-secondary">Monto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedMovs.map((m) => {
                      const ingreso    = isIngreso(m.tipoMovimiento);
                      const expandible = m.tipoMovimiento === 'CobroTurno' && !!m.turno;
                      const expanded   = expandedId === m.id;
                      const acumulado  = acumuladoPorMovimiento.get(m.id) ?? m.turno?.totalCobrado ?? 0;
                      const pendiente  = m.turno
                        ? Math.max(0, m.turno.precioServicio - acumulado)
                        : 0;

                      return (
                        <React.Fragment key={m.id}>
                          <tr
                            onClick={() => expandible && setExpandedId(expanded ? null : m.id)}
                            className={`transition-colors ${expandible ? 'cursor-pointer hover:bg-surface-background/70' : 'hover:bg-surface-background/50'} ${expanded ? 'bg-surface-background/40' : ''}`}
                          >
                            <td className="px-6 py-4 text-text-secondary whitespace-nowrap">
                              {formatFechaCorta(m.fecha)} {formatHora(m.fecha)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${ingreso ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                                  {ingreso ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                                  {m.conceptoPago ? CONCEPTO_LABELS[m.conceptoPago] : TIPO_LABELS[m.tipoMovimiento]}
                                </span>
                                {expandible && (
                                  <ChevronDownIcon className={`w-3.5 h-3.5 text-text-muted transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`} />
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 hidden md:table-cell">
                              <PaymentBadge medio={m.medioPago} />
                            </td>
                            <td
                              className="px-6 py-4 text-text-secondary hidden lg:table-cell max-w-[200px] truncate"
                              title={m.turno?.clienteNombre || m.observaciones || undefined}
                            >
                              {m.turno?.clienteNombre
                                ? <span className="font-medium text-text-primary">{m.turno.clienteNombre}</span>
                                : m.observaciones || <span className="text-text-muted">—</span>
                              }
                            </td>
                            <td className={`px-6 py-4 text-right font-semibold ${m.conceptoPago === 'Ajuste' ? 'text-error' : ingreso ? 'text-success' : 'text-error'}`}>
                              {m.conceptoPago === 'Ajuste' ? '-' : ingreso ? '+' : '-'}{formatMoneda(m.monto)}
                            </td>
                          </tr>

                          {expanded && m.turno && (
                            <tr className="bg-primary/5 border-t-0">
                              <td colSpan={5} className="px-6 pb-4 pt-0">
                                <div className="bg-surface border border-primary/20 rounded-xl p-4 mt-1">
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                    <div className="flex items-start gap-2">
                                      <UserIcon className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-text-muted mb-0.5">Cliente</p>
                                        <p className="font-medium text-text-primary">{m.turno.clienteNombre}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <Scissors className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-text-muted mb-0.5">Servicio</p>
                                        <p className="font-medium text-text-primary">{m.turno.servicioNombre}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <UserIcon className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-text-muted mb-0.5">Profesional</p>
                                        <p className="font-medium text-text-primary">{m.turno.profesionalNombre}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <CalendarIcon className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-text-muted mb-0.5">Fecha del turno</p>
                                        <p className="font-medium text-text-primary capitalize">
                                          {formatFechaLarga(m.turno.fechaHoraInicio)} {formatHora(m.turno.fechaHoraInicio)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 pt-4 border-t border-border flex items-center gap-6">
                                    <div>
                                      <p className="text-xs text-text-muted mb-0.5">Precio servicio</p>
                                      <p className="font-semibold text-text-primary">{formatMoneda(m.turno.precioServicio)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-text-muted mb-0.5">Saldo anterior</p>
                                      <p className="font-semibold text-text-secondary">{formatMoneda(acumulado - m.monto)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-text-muted mb-0.5">Acumulado al pago</p>
                                      <p className="font-semibold text-success">{formatMoneda(acumulado)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-text-muted mb-0.5">Pendiente</p>
                                      <p className={`font-semibold ${pendiente > 0 ? 'text-error' : 'text-text-muted'}`}>
                                        {pendiente > 0 ? formatMoneda(pendiente) : 'Saldado'}
                                      </p>
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/turno/${m.turno!.id}`); }}
                                      className="ml-auto flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium transition-colors"
                                    >
                                      Ver turno
                                      <ExternalLinkIcon className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {movimientos.length > 0 && (
              <div className="px-6 pb-4">
                <Pagination page={pageMovs} totalPages={totalPagesMovs} total={totalMovs} pageSize={pageSizeMovs} onPageChange={setPageMovs} />
              </div>
            )}
          </div>
        </>
      )}

      {/* Tab: Historial de sesiones */}
      {tab === 'historial' && (
        <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
          {sesiones.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <HistoryIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <h3 className="font-heading font-bold text-text-primary mb-1">Sin sesiones</h3>
              <p className="text-text-secondary text-sm">Aún no hay sesiones registradas para esta caja.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-background border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary">Apertura</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary hidden md:table-cell">Cierre</th>
                    <th className="text-left px-4 py-3 font-semibold text-text-secondary hidden lg:table-cell">Responsable</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-secondary">Fondo inicial</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-secondary hidden md:table-cell">Esperado</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-secondary hidden md:table-cell">Real</th>
                    <th className="text-right px-4 py-3 font-semibold text-text-secondary">Diferencia</th>
                    <th className="text-center px-4 py-3 font-semibold text-text-secondary">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sesiones.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-background/50 transition-colors">
                      <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                        {formatFechaCorta(s.fechaApertura)} {formatHora(s.fechaApertura)}
                      </td>
                      <td className="px-4 py-3 text-text-secondary whitespace-nowrap hidden md:table-cell">
                        {s.fechaCierre
                          ? `${formatFechaCorta(s.fechaCierre)} ${formatHora(s.fechaCierre)}`
                          : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-text-primary hidden lg:table-cell">
                        {s.usuarioAperturaNombre ?? <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text-primary">
                        {formatMoneda(s.montoInicial)}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary hidden md:table-cell">
                        {s.montoFinalEsperado != null ? formatMoneda(s.montoFinalEsperado) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-text-secondary hidden md:table-cell">
                        {s.montoFinalReal != null ? formatMoneda(s.montoFinalReal) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {s.diferencia != null ? (
                          <span className={s.diferencia < 0 ? 'text-error' : s.diferencia > 0 ? 'text-success' : 'text-text-muted'}>
                            {s.diferencia >= 0 ? '+' : ''}{formatMoneda(s.diferencia)}
                          </span>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.estado === 'Abierta' ? 'bg-success/10 text-success' : 'bg-surface-background text-text-secondary'}`}>
                          {s.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: Registrar movimiento */}
      <AnimatePresence>
        {modalOpen && (
          <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-card shadow-2xl w-full max-w-md p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-bold text-xl text-text-primary">Registrar movimiento</h3>
                <button onClick={() => setModalOpen(false)} className="text-text-muted hover:text-text-primary">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Tipo *</label>
                    <select
                      value={form.tipoMovimiento}
                      onChange={(e) => handleTipoChange(e.target.value as TipoMovimientoCaja)}
                      className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      {TIPOS.map((t) => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Medio de pago *</label>
                    <select
                      value={form.medioPago}
                      onChange={(e) => setField('medioPago', e.target.value as MedioPago)}
                      className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      {MEDIOS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {form.tipoMovimiento === 'CobroTurno' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Turno *</label>
                    <select
                      value={form.turnoId ?? ''}
                      onChange={(e) => setField('turnoId', e.target.value || undefined)}
                      className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="">— Seleccioná un turno —</option>
                      {turnos.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.clienteNombre} — {t.servicioNombre} ({formatFechaCorta(t.fechaHoraInicio)} {formatHora(t.fechaHoraInicio)})
                        </option>
                      ))}
                    </select>
                    {turnos.length === 0 && (
                      <p className="text-xs text-text-muted mt-1">No hay turnos confirmados o pendientes.</p>
                    )}
                  </div>
                )}

                {form.tipoMovimiento === 'CobroTurno' && (
                  <div>
                    <label className="block text-sm font-medium text-text-primary mb-1">Concepto</label>
                    <select
                      value={form.conceptoPago ?? ''}
                      onChange={(e) => setField('conceptoPago', (e.target.value || undefined) as ConceptoPagoTurno | undefined)}
                      className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    >
                      <option value="">— Sin especificar —</option>
                      {CONCEPTOS.map((c) => <option key={c} value={c}>{CONCEPTO_LABELS[c]}</option>)}
                    </select>
                  </div>
                )}

                {/* Resumen de cobro del turno seleccionado */}
                {form.tipoMovimiento === 'CobroTurno' && form.turnoId && (() => {
                  const t = turnos.find((t) => t.id === form.turnoId);
                  if (!t) return null;
                  const pendiente = Math.max(0, t.precioServicio - t.totalCobrado);
                  return (
                    <div className="grid grid-cols-3 gap-3 rounded-lg bg-surface-background border border-border p-3">
                      <div className="text-center">
                        <p className="text-xs text-text-muted mb-0.5">Total servicio</p>
                        <p className="font-semibold text-text-primary">{formatMoneda(t.precioServicio)}</p>
                      </div>
                      <div className="text-center border-x border-border">
                        <p className="text-xs text-text-muted mb-0.5">Cobrado</p>
                        <p className="font-semibold text-success">{formatMoneda(t.totalCobrado)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-text-muted mb-0.5">Pendiente</p>
                        <p className="font-semibold text-error">{formatMoneda(pendiente)}</p>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Monto *</label>
                  <input
                    type="number" value={form.monto || ''}
                    onChange={(e) => setField('monto', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    placeholder="5000"
                    min={0}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Observaciones</label>
                  <input
                    type="text" value={form.observaciones}
                    onChange={(e) => setField('observaciones', e.target.value)}
                    maxLength={500}
                    className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    placeholder="Descripción del movimiento"
                  />
                </div>

                <div className={`p-3 rounded-lg text-sm font-medium ${isIngreso(form.tipoMovimiento) ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                  {isIngreso(form.tipoMovimiento) ? '↑ Ingreso' : '↓ Egreso'} — {TIPO_LABELS[form.tipoMovimiento]}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setModalOpen(false); setForm({ ...EMPTY_FORM }); }}
                  className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRegistrar}
                  disabled={form.monto <= 0 || (form.tipoMovimiento === 'CobroTurno' && !form.turnoId) || saving}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {saving ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </motion.div>
          </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Modal: Abrir sesión */}
      <AnimatePresence>
        {modalSesion === 'abrir' && (
          <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-card shadow-2xl w-full max-w-sm p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-bold text-xl text-text-primary">Abrir sesión de caja</h3>
                <button onClick={() => setModalSesion(null)} className="text-text-muted hover:text-text-primary">
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Fondo inicial *</label>
                  <input
                    type="number"
                    value={montoInicial || ''}
                    onChange={(e) => setMontoInicial(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    placeholder="0"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Observaciones</label>
                  <textarea
                    value={obsApertura}
                    onChange={(e) => setObsApertura(e.target.value)}
                    maxLength={500}
                    rows={2}
                    className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                    placeholder="Novedades al inicio del turno..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setModalSesion(null)}
                  className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAbrirSesion}
                  disabled={sesionSaving}
                  className="flex-1 py-2.5 bg-success hover:bg-success/90 text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {sesionSaving ? 'Abriendo...' : 'Abrir sesión'}
                </button>
              </div>
            </motion.div>
          </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      {/* Modal: Cerrar sesión — Ticket de Corte */}
      <AnimatePresence>
        {modalSesion === 'cerrar' && (
          <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/20 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-card shadow-2xl w-full max-w-sm"
            >
              {/* Encabezado del ticket */}
              <div className="px-6 pt-6 pb-4 border-b border-dashed border-border">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-heading font-bold text-lg text-text-primary">Corte de Caja</h3>
                  <button onClick={() => setModalSesion(null)} className="text-text-muted hover:text-text-primary">
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs text-text-muted">
                  Apertura: {sesionActiva ? `${formatFechaCorta(sesionActiva.fechaApertura)} ${formatHora(sesionActiva.fechaApertura)}` : '—'}
                  {sesionActiva?.usuarioAperturaNombre && ` · ${sesionActiva.usuarioAperturaNombre}`}
                </p>
              </div>

              {/* Resumen del sistema */}
              <div className="px-6 py-4 space-y-2 text-sm border-b border-dashed border-border">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Resumen del sistema</p>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Fondo inicial</span>
                  <span className="font-medium text-text-primary">{formatMoneda(sesionActiva?.montoInicial ?? 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">+ Ingresos de la sesión</span>
                  <span className="font-medium text-success">+{formatMoneda(ingresosActuales)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">− Egresos de la sesión</span>
                  <span className="font-medium text-error">−{formatMoneda(egresosActuales)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border font-semibold text-base">
                  <span className="text-text-primary">Debería haber</span>
                  <span className="text-text-primary">{formatMoneda(montoEsperadoCierre)}</span>
                </div>
              </div>

              {/* Conteo real */}
              <div className="px-6 py-4 space-y-3 border-b border-dashed border-border">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Conteo real</p>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">¿Cuánto contaste? *</label>
                  <input
                    type="number"
                    value={montoFinalReal || ''}
                    onChange={(e) => setMontoFinalReal(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                    placeholder="0"
                    min={0}
                    autoFocus
                  />
                </div>
              </div>

              {/* Resultado */}
              <div className="px-6 py-4 border-b border-dashed border-border">
                <div className={`flex items-center justify-between p-3 rounded-lg ${diferenciaCierre < 0 ? 'bg-error/10' : diferenciaCierre > 0 ? 'bg-success/10' : 'bg-surface-background'}`}>
                  <div>
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Diferencia</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {diferenciaCierre < 0 ? 'Faltante — revisar movimientos' : diferenciaCierre > 0 ? 'Sobrante' : 'Cuadra perfecto'}
                    </p>
                  </div>
                  <p className={`text-2xl font-heading font-bold ${diferenciaCierre < 0 ? 'text-error' : diferenciaCierre > 0 ? 'text-success' : 'text-text-muted'}`}>
                    {diferenciaCierre >= 0 ? '+' : ''}{formatMoneda(diferenciaCierre)}
                  </p>
                </div>
              </div>

              {/* Observaciones y acciones */}
              <div className="px-6 py-4 space-y-3">
                <textarea
                  value={obsCierre}
                  onChange={(e) => setObsCierre(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="w-full px-3 py-2 rounded-input border border-border bg-surface-background focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm resize-none"
                  placeholder="Observaciones del cierre (opcional)..."
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalSesion(null)}
                    className="flex-1 py-2.5 border border-border rounded-button text-sm font-medium text-text-secondary hover:bg-surface-background transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCerrarSesion}
                    disabled={sesionSaving}
                    className="flex-1 py-2.5 bg-error hover:bg-error/90 text-white rounded-button text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {sesionSaving ? 'Cerrando...' : 'Confirmar cierre'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
          </ModalPortal>
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
}
