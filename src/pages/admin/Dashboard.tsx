import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarIcon,
  DollarSignIcon,
  ClockIcon,
  UserXIcon,
  PlusIcon,
  WalletIcon,
  CheckIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowRightIcon,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { OnboardingChecklist } from '../../components/admin/OnboardingChecklist';
import { turnosApi } from '../../api/turnos';
import { cajaApi } from '../../api/caja';
import { formatHora, formatMoneda, getProfesionalColor } from '../../types';
import type { Turno, CajaInfo, MovimientoCaja, TipoMovimientoCaja, MedioPago, ConceptoPagoTurno } from '../../types';
import { useAuth, tienePermiso } from '../../contexts/AuthContext';

const TIPO_LABELS_MINI: Partial<Record<TipoMovimientoCaja, string>> = {
  IngresoManual: 'Ingreso',
  Gasto:         'Gasto',
  Retiro:        'Retiro',
  CobroTurno:    'Cobro turno',
  Ajuste:        'Ajuste',
};

const isIngreso = (tipo: TipoMovimientoCaja) =>
  tipo === 'CobroTurno' || tipo === 'IngresoManual';

export function Dashboard() {
  const { user }   = useAuth();
  const sucursalId = user?.sucursalId ?? '';
  const navigate   = useNavigate();
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Caja mini ─────────────────────────────────────────────────────────────
  const [caja, setCaja]                       = useState<CajaInfo | null>(null);
  const [movHoy, setMovHoy]                   = useState<MovimientoCaja[]>([]);
  const [cajaLoading, setCajaLoading]         = useState(true);
  const [turnosCaja, setTurnosCaja]           = useState<Turno[]>([]);
  const [miniFormOpen, setMiniFormOpen]       = useState(false);
  const [miniTipo, setMiniTipo]               = useState<TipoMovimientoCaja>('CobroTurno');
  const [miniMonto, setMiniMonto]             = useState('');
  const [miniMedio, setMiniMedio]             = useState<MedioPago>('Efectivo');
  const [miniObs, setMiniObs]                 = useState('');
  const [miniTurnoId, setMiniTurnoId]         = useState('');
  const [miniConcepto, setMiniConcepto]       = useState<ConceptoPagoTurno>('PagoTotal');
  const [miniSaving, setMiniSaving]           = useState(false);

  const today = new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  useEffect(() => {
    turnosApi
      .listar(sucursalId)
      .then((data) => {
        const todayStr = new Date().toISOString().split('T')[0];
        setTurnos(data.filter((t) => t.fechaHoraInicio.startsWith(todayStr)));
      })
      .catch(() => setTurnos([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!sucursalId) return;
    cajaApi.obtenerPorSucursal(sucursalId)
      .then((c) => {
        setCaja(c);
        const hoy = new Date().toISOString().split('T')[0];
        return cajaApi.listarMovimientos(c.id, hoy, hoy);
      })
      .then(setMovHoy)
      .catch(() => {})
      .finally(() => setCajaLoading(false));

    turnosApi.listar(sucursalId)
      .then((list) =>
        setTurnosCaja(
          list.filter((t) => t.estado === 'Confirmado' || t.estado === 'Pendiente' || t.estado === 'Completado')
        )
      )
      .catch(() => {});
  }, [sucursalId]);

  const resetMiniForm = () => {
    setMiniMonto('');
    setMiniObs('');
    setMiniTurnoId('');
    setMiniConcepto('PagoTotal');
    setMiniFormOpen(false);
  };

  const registrarMiniMovimiento = async () => {
    if (!caja || !miniMonto || Number(miniMonto) <= 0) return;
    if (miniTipo === 'CobroTurno' && !miniTurnoId) return;
    setMiniSaving(true);
    try {
      const nuevo = await cajaApi.registrarMovimiento(caja.id, {
        tipoMovimiento: miniTipo,
        medioPago: miniMedio,
        monto: Number(miniMonto),
        observaciones: miniObs || undefined,
        turnoId: miniTipo === 'CobroTurno' ? miniTurnoId : undefined,
        conceptoPago: miniTipo === 'CobroTurno' ? miniConcepto : undefined,
      });
      setMovHoy((prev) => [nuevo, ...prev]);
      resetMiniForm();
    } catch {
      // silently ignore; user can go to Caja page for full error handling
    } finally {
      setMiniSaving(false);
    }
  };

  const saldoHoy = movHoy.reduce(
    (sum, m) => sum + (isIngreso(m.tipoMovimiento) ? m.monto : -m.monto),
    0,
  );

  const pendientes = turnos.filter((t) => t.estado === 'Pendiente');
  const completados = turnos.filter((t) => t.estado === 'Completado');
  const noShows = turnos.filter((t) => t.estado === 'NoShow');
  const ingresosDia = turnos.reduce((sum, t) => sum + t.totalCobrado, 0);

  const confirmarTurno = async (turnoId: string) => {
    try {
      const updated = await turnosApi.actualizar(turnoId, { estado: 'Confirmado' });
      setTurnos((prev) => prev.map((t) => (t.id === turnoId ? updated : t)));
    } catch {
      alert('No se pudo confirmar el turno.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-heading font-bold text-text-primary mb-1">Buenos días</h2>
          <p className="text-text-secondary capitalize">{today}</p>
        </div>
        <button
          onClick={() => navigate('/admin/agenda')}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-button text-sm font-medium transition-colors flex items-center gap-2 self-start"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo Turno
        </button>
      </div>

      {/* Onboarding checklist — solo visible para quienes pueden acceder a Ajustes */}
      {(user?.esOwner || user?.rol === 'Administrativo' || tienePermiso(user, 'GestionarAjustes')) && (
        <OnboardingChecklist sucursalId={sucursalId} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Turnos hoy"
          value={loading ? '...' : turnos.length.toString()}
          icon={<CalendarIcon className="w-6 h-6" />}
        />
        <StatCard
          title="Ingresos del día"
          value={loading ? '...' : formatMoneda(ingresosDia)}
          icon={<DollarSignIcon className="w-6 h-6" />}
        />
        <StatCard
          title="Por confirmar"
          value={loading ? '...' : pendientes.length.toString()}
          changeType={pendientes.length > 0 ? 'neutral' : 'up'}
          change={pendientes.length > 0 ? 'Requiere atención' : 'Todo al día'}
          icon={<ClockIcon className="w-6 h-6" />}
        />
        <StatCard
          title="Completados hoy"
          value={loading ? '...' : completados.length.toString()}
          icon={<UserXIcon className="w-6 h-6" />}
        />
      </div>

      {/* Timeline */}
          <div className="bg-surface rounded-card border border-border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-border flex justify-between items-center">
              <h3 className="font-heading font-bold text-lg text-text-primary">Agenda de hoy</h3>
              <button
                onClick={() => navigate('/admin/agenda')}
                className="text-sm font-medium text-primary hover:text-primary-dark"
              >
                Ver agenda completa
              </button>
            </div>

            <div className="p-6">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : turnos.length === 0 ? (
                <p className="text-center text-text-muted py-8">No hay turnos para hoy.</p>
              ) : (
                <div className="relative border-l-2 border-border/50 ml-4 space-y-8 pb-4">
                  {turnos
                    .filter((t) => !['PagoPendiente', 'PagoRechazado'].includes(t.estado))
                    .sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio))
                    .map((turno) => (
                      <div key={turno.id} className="relative pl-6">
                        <div
                          className="absolute -left-[9px] top-1 w-4 h-4 rounded-full border-4 border-surface"
                          style={{ backgroundColor: getProfesionalColor(turno.profesionalId) }}
                        />
                        <div
                          className="bg-surface-background rounded-lg p-4 border border-border/50 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => navigate(`/admin/turno/${turno.id}`)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-text-primary text-lg">
                                {formatHora(turno.fechaHoraInicio)}
                              </span>
                            </div>
                            <StatusBadge estado={turno.estado} />
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                              <p className="font-medium text-text-primary">{turno.clienteNombre}</p>
                              <p className="text-sm text-text-secondary">{turno.servicioNombre}</p>
                            </div>
                            <div
                              className="flex items-center gap-2 text-sm text-text-secondary bg-surface px-3 py-1.5 rounded-full border border-border"
                            >
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getProfesionalColor(turno.profesionalId) }}
                              />
                              {turno.profesionalNombre}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Mini Caja — solo visible para quienes pueden cargar cobranzas */}
          {tienePermiso(user, 'CargarCobranzas') && <div className="bg-surface rounded-card border border-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-lg text-text-primary flex items-center gap-2">
                <WalletIcon className="w-5 h-5 text-primary" />
                Caja hoy
              </h3>
              <button
                onClick={() => navigate('/admin/caja')}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark transition-colors"
              >
                Ver todo <ArrowRightIcon className="w-3 h-3" />
              </button>
            </div>

            {cajaLoading ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Balance del día */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg mb-4 ${saldoHoy >= 0 ? 'bg-success/10' : 'bg-error/10'}`}>
                  <span className="text-sm text-text-secondary">Balance del día</span>
                  <span className={`font-bold text-base ${saldoHoy >= 0 ? 'text-success' : 'text-error'}`}>
                    {formatMoneda(saldoHoy)}
                  </span>
                </div>

                {/* Últimos movimientos */}
                {movHoy.length === 0 ? (
                  <p className="text-xs text-text-muted text-center py-2 mb-3">Sin movimientos hoy.</p>
                ) : (
                  <div className="space-y-2 mb-4">
                    {movHoy.slice(0, 4).map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          {isIngreso(m.tipoMovimiento)
                            ? <TrendingUpIcon className="w-3.5 h-3.5 text-success flex-shrink-0" />
                            : <TrendingDownIcon className="w-3.5 h-3.5 text-error flex-shrink-0" />}
                          <span className="text-text-secondary truncate">
                            {TIPO_LABELS_MINI[m.tipoMovimiento] ?? m.tipoMovimiento}
                            {m.observaciones ? ` · ${m.observaciones}` : ''}
                          </span>
                        </div>
                        <span className={`font-medium flex-shrink-0 ml-2 ${isIngreso(m.tipoMovimiento) ? 'text-success' : 'text-error'}`}>
                          {isIngreso(m.tipoMovimiento) ? '+' : '-'}{formatMoneda(m.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Botón / formulario rápido */}
                {!miniFormOpen ? (
                  <button
                    onClick={() => setMiniFormOpen(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-button border border-dashed border-border text-text-muted hover:border-primary hover:text-primary transition-colors text-sm"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Registrar movimiento
                  </button>
                ) : (
                  <div className="space-y-2 border border-border rounded-lg p-3">
                    {/* Tipo */}
                    <select
                      value={miniTipo}
                      onChange={(e) => setMiniTipo(e.target.value as TipoMovimientoCaja)}
                      className="w-full text-sm border border-border rounded-button px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="CobroTurno">Cobro de turno</option>
                      <option value="IngresoManual">Ingreso manual</option>
                      <option value="Gasto">Gasto</option>
                      <option value="Retiro">Retiro</option>
                    </select>

                    {/* Selector de turno — solo para CobroTurno */}
                    {miniTipo === 'CobroTurno' && (
                      <>
                        <select
                          value={miniTurnoId}
                          onChange={(e) => setMiniTurnoId(e.target.value)}
                          className="w-full text-sm border border-border rounded-button px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">— Seleccioná un turno —</option>
                          {turnosCaja
                            .sort((a, b) => b.fechaHoraInicio.localeCompare(a.fechaHoraInicio))
                            .map((t) => (
                              <option key={t.id} value={t.id}>
                                {new Date(t.fechaHoraInicio).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })} {formatHora(t.fechaHoraInicio)} — {t.clienteNombre} · {t.servicioNombre}
                              </option>
                            ))}
                        </select>
                        <select
                          value={miniConcepto}
                          onChange={(e) => setMiniConcepto(e.target.value as ConceptoPagoTurno)}
                          className="w-full text-sm border border-border rounded-button px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="PagoTotal">Pago total</option>
                          <option value="Sena">Seña</option>
                          <option value="PagoParcial">Pago parcial</option>
                          <option value="SaldoFinal">Saldo final</option>
                        </select>
                      </>
                    )}

                    {/* Resumen de cobro del turno seleccionado */}
                    {miniTipo === 'CobroTurno' && miniTurnoId && (() => {
                      const t = turnosCaja.find((t) => t.id === miniTurnoId);
                      if (!t) return null;
                      const pendiente = Math.max(0, t.precioServicio - t.totalCobrado);
                      return (
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-surface-background border border-border p-2.5">
                          <div className="text-center">
                            <p className="text-xs text-text-muted mb-0.5">Total</p>
                            <p className="text-sm font-semibold text-text-primary">{formatMoneda(t.precioServicio)}</p>
                          </div>
                          <div className="text-center border-x border-border">
                            <p className="text-xs text-text-muted mb-0.5">Cobrado</p>
                            <p className="text-sm font-semibold text-success">{formatMoneda(t.totalCobrado)}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-xs text-text-muted mb-0.5">Pendiente</p>
                            <p className="text-sm font-semibold text-error">{formatMoneda(pendiente)}</p>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Monto + Medio */}
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        placeholder="Monto"
                        value={miniMonto}
                        onChange={(e) => setMiniMonto(e.target.value)}
                        className="flex-1 text-sm border border-border rounded-button px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <select
                        value={miniMedio}
                        onChange={(e) => setMiniMedio(e.target.value as MedioPago)}
                        className="text-sm border border-border rounded-button px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="MercadoPago">MP</option>
                      </select>
                    </div>

                    <input
                      type="text"
                      placeholder="Observación (opcional)"
                      value={miniObs}
                      onChange={(e) => setMiniObs(e.target.value)}
                      className="w-full text-sm border border-border rounded-button px-2 py-1.5 bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={registrarMiniMovimiento}
                        disabled={
                          miniSaving ||
                          !miniMonto ||
                          Number(miniMonto) <= 0 ||
                          (miniTipo === 'CobroTurno' && !miniTurnoId)
                        }
                        className="flex-1 py-1.5 bg-primary text-white text-sm rounded-button hover:bg-primary-dark disabled:opacity-50 transition-colors"
                      >
                        {miniSaving ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={resetMiniForm}
                        className="px-3 py-1.5 border border-border text-sm rounded-button text-text-secondary hover:text-text-primary transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>}
      {/* Por confirmar + No-shows — fila horizontal si hay datos */}
      {(pendientes.length > 0 || noShows.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendientes.length > 0 && (
            <div className="bg-surface rounded-card border border-border shadow-sm p-6">
              <h3 className="font-heading font-bold text-lg text-text-primary mb-4">Por confirmar</h3>
              <div className="space-y-3">
                {pendientes.map((turno) => (
                  <div
                    key={turno.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-warning/10 border border-warning/20"
                  >
                    <div>
                      <p className="font-medium text-text-primary text-sm">{turno.clienteNombre}</p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        {formatHora(turno.fechaHoraInicio)} — {turno.servicioNombre}
                      </p>
                    </div>
                    <button
                      onClick={() => confirmarTurno(turno.id)}
                      className="p-1.5 text-success hover:bg-success/20 rounded-md transition-colors"
                      title="Confirmar"
                    >
                      <CheckIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {noShows.length > 0 && (
            <div className="bg-surface rounded-card border border-border shadow-sm p-6">
              <h3 className="font-heading font-bold text-lg text-text-primary mb-3">No-shows hoy</h3>
              <div className="space-y-2">
                {noShows.map((t) => (
                  <div key={t.id} className="flex justify-between text-sm">
                    <span className="text-text-primary">{t.clienteNombre}</span>
                    <span className="text-text-muted">{formatHora(t.fechaHoraInicio)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
