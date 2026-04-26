import { api } from './client';

export interface ReporteTurnos {
  total: number;
  completados: number;
  cancelados: number;
  noShow: number;
  pendientes: number;
  pendientePago: number;
}

export interface IngresosPorDia {
  fecha: string;
  monto: number;
}

export interface ReporteIngresos {
  totalCobrado: number;
  totalEfectivo: number;
  totalTransferencia: number;
  totalTarjeta: number;
  totalMercadoPago: number;
  porDia: IngresosPorDia[];
}

export interface ReporteServicio {
  servicioId: string;
  nombre: string;
  cantidadTurnos: number;
  ingresos: number;
}

export interface ReporteProfesional {
  profesionalId: string;
  nombre: string;
  cantidadTurnos: number;
  ingresos: number;
}

export interface ReporteClientes {
  totalNuevos: number;
  totalRecurrentes: number;
  totalUnicos: number;
}

export interface ReporteResumen {
  turnos: ReporteTurnos;
  ingresos: ReporteIngresos;
  topServicios: ReporteServicio[];
  topProfesionales: ReporteProfesional[];
  clientes: ReporteClientes;
}

const fmt = (d: Date) => d.toISOString().split('T')[0];

export const reportesApi = {
  resumen: (desde: Date, hasta: Date) =>
    api.get<ReporteResumen>(`/reportes/resumen?desde=${fmt(desde)}&hasta=${fmt(hasta)}`),
};
