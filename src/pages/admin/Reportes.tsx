import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  CalendarIcon, TrendingUpIcon, UsersIcon, ScissorsIcon,
  CheckCircleIcon, XCircleIcon, AlertCircleIcon, ClockIcon,
  CreditCardIcon, BanknoteIcon, FileTextIcon, TableIcon,
} from 'lucide-react';
import { reportesApi, type ReporteResumen } from '../../api/reportes';
import { publicoApi } from '../../api/publico';
import { useAuth } from '../../contexts/AuthContext';
import { formatMoneda } from '../../types';
import { ApiError } from '../../api/client';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

const toInputDate  = (d: Date) => d.toISOString().split('T')[0];             // YYYY-MM-DD
const toApiDate    = (s: string) => s;                                        // ya es YYYY-MM-DD
const toDisplay    = (s: string) => s.split('-').reverse().join('/');          // DD/MM/YYYY
const toFilename   = (s: string) => s.slice(0, 7).replace('-', '-');          // YYYY-MM

function defaultDesde() {
  const d = new Date();
  return toInputDate(new Date(d.getFullYear(), d.getMonth(), 1));
}
function defaultHasta() {
  return toInputDate(new Date());
}

// ─── Fetch logo como base64 ───────────────────────────────────────────────────

async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res  = await fetch('/logo.png');
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-md">
      <p className="text-xs text-text-muted mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-text-primary">{formatMoneda(payload[0].value)}</p>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-surface rounded-card border border-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted mb-1">{label}</p>
          <p className="text-2xl font-bold text-text-primary">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Generador de PDF ─────────────────────────────────────────────────────────

async function generarPDF(
  data: ReporteResumen,
  desde: string,
  hasta: string,
  nombreNegocio: string,
) {
  const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W       = pdf.internal.pageSize.getWidth();
  const PRIMARY = '#2F7D6B';
  const DARK    = '#1F2937';
  const MUTED   = '#6B7280';
  const BORDER  = '#E5E7EB';
  const LIGHT   = '#F5F8F6';
  const HEADER_H = 32;

  // ── Header ──
  pdf.setFillColor(PRIMARY);
  pdf.rect(0, 0, W, HEADER_H, 'F');

  // Logo
  const logoB64 = await fetchLogoBase64();
  if (logoB64) {
    pdf.addImage(logoB64, 'PNG', 10, 5, 22, 22);
  }

  // Textos del header
  const textX = logoB64 ? 36 : 14;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.setTextColor('#FFFFFF');
  pdf.text('MetaTurnos — Reporte', textX, 14);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(nombreNegocio, textX, 22);
  pdf.text(`${toDisplay(desde)} — ${toDisplay(hasta)}`, W - 14, 22, { align: 'right' });

  let y = HEADER_H + 8;

  // ── Helpers ──
  const seccion = (titulo: string) => {
    pdf.setFillColor(LIGHT);
    pdf.rect(14, y, W - 28, 8, 'F');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(PRIMARY);
    pdf.text(titulo.toUpperCase(), 18, y + 5.5);
    y += 12;
  };

  const fila = (izq: string, der: string, negrita = false, fondo = false) => {
    if (fondo) { pdf.setFillColor('#F9FAFB'); pdf.rect(14, y - 4, W - 28, 8, 'F'); }
    pdf.setFont('helvetica', negrita ? 'bold' : 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(negrita ? DARK : MUTED);
    pdf.text(izq, 18, y);
    pdf.setTextColor(DARK);
    pdf.text(der, W - 18, y, { align: 'right' });
    y += 8;
  };

  const linea = () => {
    pdf.setDrawColor(BORDER);
    pdf.line(14, y - 2, W - 14, y - 2);
  };

  const checkPagina = (necesita: number) => {
    if (y + necesita > 275) { pdf.addPage(); y = 20; }
  };

  // ── Turnos ──
  seccion('Turnos');
  fila('Total',             String(data.turnos.total),         true,  false);
  linea();
  fila('Completados',       String(data.turnos.completados),   false, true);
  fila('Cancelados',        String(data.turnos.cancelados),    false, false);
  fila('No Show',           String(data.turnos.noShow),        false, true);
  fila('Pendientes',        String(data.turnos.pendientes),    false, false);
  fila('Pendiente de pago', String(data.turnos.pendientePago), false, true);
  y += 4;

  // ── Ingresos ──
  seccion('Ingresos');
  fila('Total cobrado', formatMoneda(data.ingresos.totalCobrado),    true,  false);
  linea();
  fila('Efectivo',      formatMoneda(data.ingresos.totalEfectivo),   false, true);
  fila('MercadoPago',   formatMoneda(data.ingresos.totalMercadoPago),false, false);
  y += 4;

  // ── Ingresos por día ──
  const dias = data.ingresos.porDia.slice(-14);
  if (dias.length > 0) {
    checkPagina(12 + dias.length * 8);
    seccion('Ingresos por día');
    dias.forEach((d, i) => fila(toDisplay(d.fecha), formatMoneda(d.monto), false, i % 2 === 0));
    y += 4;
  }

  // ── Top Servicios ──
  checkPagina(12 + Math.min(data.topServicios.length, 8) * 8);
  seccion('Top servicios');
  if (data.topServicios.length === 0) {
    pdf.setFontSize(10); pdf.setTextColor(MUTED);
    pdf.text('Sin datos en el período', 18, y); y += 8;
  } else {
    data.topServicios.slice(0, 8).forEach((s, i) =>
      fila(`${i + 1}. ${s.nombre}  (${s.cantidadTurnos} turnos)`, formatMoneda(s.ingresos), false, i % 2 === 0)
    );
  }
  y += 4;

  // ── Top Profesionales ──
  checkPagina(12 + Math.min(data.topProfesionales.length, 8) * 8);
  seccion('Top profesionales');
  if (data.topProfesionales.length === 0) {
    pdf.setFontSize(10); pdf.setTextColor(MUTED);
    pdf.text('Sin datos en el período', 18, y); y += 8;
  } else {
    data.topProfesionales.slice(0, 8).forEach((p, i) =>
      fila(`${i + 1}. ${p.nombre}  (${p.cantidadTurnos} turnos)`, formatMoneda(p.ingresos), false, i % 2 === 0)
    );
  }
  y += 4;

  // ── Clientes ──
  checkPagina(40);
  seccion('Clientes');
  fila('Únicos en período', String(data.clientes.totalUnicos),      false, true);
  fila('Nuevos',            String(data.clientes.totalNuevos),      false, false);
  fila('Recurrentes',       String(data.clientes.totalRecurrentes), false, true);

  // ── Footer ──
  const totalPages = (pdf as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(MUTED);
    pdf.text(
      `Generado por MetaTurnos · ${new Date().toLocaleDateString('es-AR')} · Página ${p} de ${totalPages}`,
      W / 2, 290, { align: 'center' }
    );
  }

  const nombreArchivo = `${nombreNegocio}-${toFilename(desde)}.pdf`.replace(/\s+/g, '-');
  pdf.save(nombreArchivo);
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function Reportes() {
  const { user } = useAuth();
  const [desde,         setDesde]         = useState(defaultDesde());
  const [hasta,         setHasta]         = useState(defaultHasta());
  const [data,               setData]               = useState<ReporteResumen | null>(null);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState('');
  const [planInsuficiente,   setPlanInsuficiente]   = useState(false);
  const [suscripcionVencida, setSuscripcionVencida] = useState(false);
  const [nombreNegocio,    setNombreNegocio]    = useState('MetaTurnos');
  const [exportLoading, setExportLoading] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    if (user?.sucursalId) {
      publicoApi.perfil(user.sucursalId)
        .then((p) => setNombreNegocio(p.nombre))
        .catch(() => {});
    }
  }, [user?.sucursalId]);

  const cargar = useCallback(async () => {
    if (!desde || !hasta) return;
    setLoading(true);
    setError('');
    setPlanInsuficiente(false);
    setSuscripcionVencida(false);
    try {
      setData(await reportesApi.resumen(new Date(toApiDate(desde)), new Date(toApiDate(hasta))));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 402) {
        setSuscripcionVencida(true);
      } else if (err instanceof ApiError && err.status === 403) {
        setPlanInsuficiente(true);
      } else {
        setError(err instanceof Error ? err.message : 'Error al cargar reportes.');
      }
    } finally {
      setLoading(false);
    }
  }, [desde, hasta]);

  useEffect(() => { cargar(); }, [cargar]);

  // ── Exportar PDF ──
  const exportarPDF = async () => {
    if (!data) return;
    setExportLoading('pdf');
    try {
      await generarPDF(data, desde, hasta, nombreNegocio);
    } finally {
      setExportLoading(null);
    }
  };

  // ── Exportar Excel ──
  const exportarExcel = () => {
    if (!data) return;
    setExportLoading('excel');
    try {
      const periodoLabel = `${toDisplay(desde)} al ${toDisplay(hasta)}`;
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        [`${nombreNegocio} — ${periodoLabel}`],   // A1 con nombre y fechas
        [],
        ['TURNOS'],
        ['Total',             data.turnos.total],
        ['Completados',       data.turnos.completados],
        ['Cancelados',        data.turnos.cancelados],
        ['No Show',           data.turnos.noShow],
        ['Pendientes',        data.turnos.pendientes],
        ['Pendiente de pago', data.turnos.pendientePago],
        [],
        ['INGRESOS'],
        ['Total cobrado', data.ingresos.totalCobrado],
        ['Efectivo',      data.ingresos.totalEfectivo],
        ['MercadoPago',   data.ingresos.totalMercadoPago],
        [],
        ['CLIENTES'],
        ['Únicos en período', data.clientes.totalUnicos],
        ['Nuevos',            data.clientes.totalNuevos],
        ['Recurrentes',       data.clientes.totalRecurrentes],
      ]), 'Resumen');

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Fecha', 'Monto'],
        ...data.ingresos.porDia.map((d) => [toDisplay(d.fecha), d.monto]),
      ]), 'Ingresos por día');

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Servicio', 'Turnos', 'Ingresos'],
        ...data.topServicios.map((s) => [s.nombre, s.cantidadTurnos, s.ingresos]),
      ]), 'Top servicios');

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
        ['Profesional', 'Turnos', 'Ingresos'],
        ...data.topProfesionales.map((p) => [p.nombre, p.cantidadTurnos, p.ingresos]),
      ]), 'Top profesionales');

      // NombreNegocio-MM-YYYY.xlsx
      const ahora  = new Date();
      const mm     = String(ahora.getMonth() + 1).padStart(2, '0');
      const yyyy   = ahora.getFullYear();
      const nombre = `${nombreNegocio}-${mm}-${yyyy}.xlsx`.replace(/\s+/g, '-');
      XLSX.writeFile(wb, nombre);
    } finally {
      setExportLoading(null);
    }
  };

  const chartData = (data?.ingresos.porDia ?? []).slice(-14).map((d) => ({
    fecha: d.fecha.slice(5),
    monto: d.monto,
  }));

  const { turnos, ingresos, topServicios, topProfesionales, clientes } = data ?? {
    turnos:           { total: 0, completados: 0, cancelados: 0, noShow: 0, pendientes: 0, pendientePago: 0 },
    ingresos:         { totalCobrado: 0, totalEfectivo: 0, totalTransferencia: 0, totalTarjeta: 0, totalMercadoPago: 0, porDia: [] },
    topServicios:     [],
    topProfesionales: [],
    clientes:         { totalNuevos: 0, totalRecurrentes: 0, totalUnicos: 0 },
  };

  // ── Suscripción vencida ──
  if (suscripcionVencida) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-6">
          <AlertCircleIcon className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="text-xl font-heading font-bold text-text-primary mb-2">
          Tu suscripción está vencida
        </h2>
        <p className="text-text-secondary text-sm max-w-sm mb-6">
          Para acceder a esta sección debés renovar tu plan.
        </p>
        <a
          href="/admin/suscripcion"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-button transition-colors"
        >
          Renovar plan
        </a>
      </div>
    );
  }

  // ── Plan insuficiente ──
  if (planInsuficiente) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-6">
          <CreditCardIcon className="w-8 h-8 text-purple-500" />
        </div>
        <h2 className="text-xl font-heading font-bold text-text-primary mb-2">
          Reportes disponibles en planes Pro y Enterprise
        </h2>
        <p className="text-text-secondary text-sm max-w-sm mb-6">
          Accedé a reportes detallados de turnos, ingresos, servicios y clientes actualizando tu plan.
        </p>
        <a
          href="/admin/suscripcion"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-button transition-colors"
        >
          Ver planes disponibles
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-heading font-bold text-text-primary">Reportes</h1>
          <p className="text-sm text-text-muted mt-0.5">Resumen del negocio por período</p>
        </div>

        <div className="flex items-end gap-2 flex-wrap">
          {/* Filtros de fecha */}
          <div className="flex items-end gap-2">
            <div>
              <label className="block text-xs text-text-muted mb-1 font-medium">Desde</label>
              <input
                type="date"
                value={desde}
                max={hasta}
                onChange={(e) => setDesde(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1 font-medium">Hasta</label>
              <input
                type="date"
                value={hasta}
                min={desde}
                max={toInputDate(new Date())}
                onChange={(e) => setHasta(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Exportar */}
          <button
            onClick={exportarPDF}
            disabled={!data || exportLoading === 'pdf'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {exportLoading === 'pdf'
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <FileTextIcon className="w-4 h-4" />}
            PDF
          </button>
          <button
            onClick={exportarExcel}
            disabled={!data || exportLoading === 'excel'}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-sm font-medium text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {exportLoading === 'excel'
              ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <TableIcon className="w-4 h-4" />}
            Excel
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 p-3 bg-error/8 border border-error/20 rounded-card text-sm text-error">
          <AlertCircleIcon className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-surface rounded-card border border-border p-5 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {(data || (!loading && !error)) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

          {/* Turnos */}
          <section>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" /> Turnos
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard label="Total"       value={turnos.total}         icon={CalendarIcon}    color="bg-primary/10 text-primary" />
              <StatCard label="Completados" value={turnos.completados}   icon={CheckCircleIcon} color="bg-green-100 text-green-600" />
              <StatCard label="Cancelados"  value={turnos.cancelados}    icon={XCircleIcon}     color="bg-red-100 text-red-500" />
              <StatCard label="No Show"     value={turnos.noShow}        icon={AlertCircleIcon} color="bg-orange-100 text-orange-500" />
              <StatCard label="Pendientes"  value={turnos.pendientes}    icon={ClockIcon}       color="bg-blue-100 text-blue-500" />
              <StatCard label="Pend. pago"  value={turnos.pendientePago} icon={CreditCardIcon}  color="bg-yellow-100 text-yellow-600" />
            </div>
          </section>

          {/* Ingresos */}
          <section>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <TrendingUpIcon className="w-4 h-4" /> Ingresos
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 bg-surface rounded-card border border-border p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-text-muted">Total cobrado</p>
                    <p className="text-3xl font-bold text-text-primary">{formatMoneda(ingresos.totalCobrado)}</p>
                  </div>
                  <TrendingUpIcon className="w-5 h-5 text-primary mt-1" />
                </div>
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={chartData} margin={{ top: 4, right: 0, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#D9E5DF" vertical={false} />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                        tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#2F7D6B', opacity: 0.06 }} />
                      <Bar dataKey="monto" fill="#2F7D6B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-44 flex items-center justify-center text-text-muted text-sm">Sin datos en el período</div>
                )}
              </div>

              <div className="bg-surface rounded-card border border-border p-5">
                <p className="text-sm font-semibold text-text-muted mb-5">Por medio de pago</p>
                <div className="space-y-5">
                  {[
                    { label: 'Efectivo',    value: ingresos.totalEfectivo,    icon: BanknoteIcon,   color: 'text-green-600', bar: 'bg-green-500' },
                    { label: 'MercadoPago', value: ingresos.totalMercadoPago, icon: CreditCardIcon, color: 'text-sky-500',   bar: 'bg-sky-400'   },
                  ].map(({ label, value, icon: Icon, color, bar }) => (
                    <div key={label}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${color}`} />
                          <span className="text-sm text-text-secondary">{label}</span>
                        </div>
                        <span className="text-sm font-semibold text-text-primary">{formatMoneda(value)}</span>
                      </div>
                      <div className="w-full h-2 bg-surface-soft rounded-full overflow-hidden">
                        <div
                          className={`h-full ${bar} rounded-full transition-all duration-700`}
                          style={{ width: ingresos.totalCobrado > 0 ? `${(value / ingresos.totalCobrado) * 100}%` : '0%' }}
                        />
                      </div>
                      <p className="text-xs text-text-muted mt-1">
                        {ingresos.totalCobrado > 0 ? `${((value / ingresos.totalCobrado) * 100).toFixed(0)}% del total` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Top Servicios + Profesionales */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="bg-surface rounded-card border border-border p-5">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <ScissorsIcon className="w-4 h-4" /> Top servicios
              </h2>
              {topServicios.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-6">Sin datos en el período</p>
              ) : (
                <div className="space-y-3">
                  {topServicios.slice(0, 6).map((s, idx) => (
                    <div key={s.servicioId} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-text-muted w-4">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{s.nombre}</p>
                        <p className="text-xs text-text-muted">{s.cantidadTurnos} turnos</p>
                      </div>
                      <span className="text-sm font-semibold text-text-primary flex-shrink-0">{formatMoneda(s.ingresos)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="bg-surface rounded-card border border-border p-5">
              <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <UsersIcon className="w-4 h-4" /> Top profesionales
              </h2>
              {topProfesionales.length === 0 ? (
                <p className="text-sm text-text-muted text-center py-6">Sin datos en el período</p>
              ) : (
                <div className="space-y-3">
                  {topProfesionales.slice(0, 6).map((p, idx) => (
                    <div key={p.profesionalId} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-text-muted w-4">{idx + 1}</span>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">
                          {p.nombre.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{p.nombre}</p>
                        <p className="text-xs text-text-muted">{p.cantidadTurnos} turnos</p>
                      </div>
                      <span className="text-sm font-semibold text-text-primary flex-shrink-0">{formatMoneda(p.ingresos)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Clientes */}
          <section>
            <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" /> Clientes
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Únicos en período" value={clientes.totalUnicos}      icon={UsersIcon}       color="bg-primary/10 text-primary" />
              <StatCard label="Nuevos"             value={clientes.totalNuevos}      icon={CheckCircleIcon} color="bg-green-100 text-green-600" />
              <StatCard label="Recurrentes"        value={clientes.totalRecurrentes} icon={TrendingUpIcon}  color="bg-blue-100 text-blue-500" />
            </div>
          </section>

        </motion.div>
      )}
    </div>
  );
}
