import { api } from './client';
import type { Turno, CrearTurnoDto, ActualizarTurnoDto, ComentarioTurno, AdjuntoTurno, PagoTurnoResponse } from '../types';

export const turnosApi = {
  listar: (sucursalId?: string) =>
    api.get<Turno[]>(`/turnos${sucursalId ? `?sucursalId=${sucursalId}` : ''}`),

  obtener: (id: string) => api.get<Turno>(`/turnos/${id}`),

  obtenerPorToken: (token: string) => api.get<Turno>(`/turnos/by-token/${token}`),

  crear: (dto: CrearTurnoDto) => api.post<Turno>('/turnos', dto),

  actualizar: (id: string, dto: ActualizarTurnoDto) =>
    api.put<Turno>(`/turnos/${id}`, dto),

  eliminar: (id: string) => api.delete<void>(`/turnos/${id}`),

  // ── Comentarios ──────────────────────────────────────────────────────────────
  listarComentarios: (turnoId: string) =>
    api.get<ComentarioTurno[]>(`/turnos/${turnoId}/comentarios`),

  crearComentario: (turnoId: string, texto: string) =>
    api.post<ComentarioTurno>(`/turnos/${turnoId}/comentarios`, { texto }),

  eliminarComentario: (turnoId: string, comentarioId: string) =>
    api.delete<void>(`/turnos/${turnoId}/comentarios/${comentarioId}`),

  // ── Adjuntos ──────────────────────────────────────────────────────────────────
  listarAdjuntos: (turnoId: string) =>
    api.get<AdjuntoTurno[]>(`/turnos/${turnoId}/adjuntos`),

  subirAdjunto: (turnoId: string, formData: FormData) =>
    api.postForm<AdjuntoTurno>(`/turnos/${turnoId}/adjuntos`, formData),

  eliminarAdjunto: (turnoId: string, adjuntoId: string) =>
    api.delete<void>(`/turnos/${turnoId}/adjuntos/${adjuntoId}`),

  // ── Pagos ──────────────────────────────────────────────────────────────────
  listarPagos: (turnoId: string) =>
    api.get<PagoTurnoResponse[]>(`/turnos/${turnoId}/pagos`),
};
