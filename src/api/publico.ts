import { api } from './client';
import type { PerfilPublico, Servicio, SlotDisponible, Turno } from '../types';

export interface ReservarTurnoDto {
  nombre: string;
  apellido?: string;
  telefono: string;
  email?: string;
  servicioId: string;
  profesionalId: string;
  fechaHoraInicio: string;
  observaciones?: string;
}

export const publicoApi = {
  // Slug-based (para páginas públicas /s/:slug)
  perfilBySlug: (slug: string) =>
    api.get<PerfilPublico>(`/publico/${slug}/perfil`),

  serviciosBySlug: (slug: string) =>
    api.get<Servicio[]>(`/publico/${slug}/servicios`),

  slotsBySlug: (slug: string, fecha: string, servicioId: string) =>
    api.get<SlotDisponible[]>(`/publico/${slug}/slots?fecha=${fecha}&servicioId=${servicioId}`),

  reservarBySlug: (slug: string, dto: ReservarTurnoDto) =>
    api.post<Turno>(`/publico/${slug}/reservar`, dto),

  // Legacy (para BookingFlow y Landing con VITE_SUCURSAL_ID)
  perfil: (sucursalId: string) =>
    api.get<PerfilPublico>(`/publico/perfil?sucursalId=${sucursalId}`),

  slots: (sucursalId: string, fecha: string, servicioId: string) =>
    api.get<SlotDisponible[]>(
      `/publico/slots?sucursalId=${sucursalId}&fecha=${fecha}&servicioId=${servicioId}`
    ),

  reservar: (sucursalId: string, dto: ReservarTurnoDto) =>
    api.post<Turno>(`/publico/reservar?sucursalId=${sucursalId}`, dto),
};
