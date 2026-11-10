import { api } from './client';

export interface ReporteProblema {
  descripcion: string;
  emailContacto?: string;
  urlOrigen?: string;
}

export interface SolicitudAmpliacion {
  mensaje?: string;
  sucursalNombre?: string;
  usuariosActuales: number;
  maxUsuarios: number;
  turnosMesActual: number;
  maxTurnosMes: number | null;
}

export const soporteApi = {
  /** Envía un reporte de problema; el backend lo manda por email a soporte. */
  reportar: (data: ReporteProblema) => api.post<void>('/soporte/reportar', data),

  /** Solicita ampliar el plan (más usuarios/turnos); llega por email a soporte. */
  solicitarAmpliacion: (data: SolicitudAmpliacion) =>
    api.post<void>('/soporte/solicitar-ampliacion', data),
};
