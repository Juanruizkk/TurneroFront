import { api } from './client';

export interface NotificacionDto {
  id: string;
  tipo: 'nuevo' | 'cancelado';
  mensaje: string;
  fechaCreacion: string;
  leida: boolean;
}

export const notificacionesApi = {
  /** Devuelve las notificaciones no leídas de la sucursal del usuario autenticado. */
  getNoLeidas: () => api.get<NotificacionDto[]>('/notificaciones'),

  /** Marca todas las notificaciones de la sucursal como leídas. */
  marcarLeidas: () => api.patch<void>('/notificaciones/leer'),

  /** Elimina todas las notificaciones de la sucursal. */
  limpiar: () => api.delete<void>('/notificaciones'),
};
