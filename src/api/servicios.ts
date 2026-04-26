import { api } from './client';
import type { Servicio, CrearServicioDto } from '../types';

export const serviciosApi = {
  listar: (sucursalId?: string, incluirInactivos = false) =>
    api.get<Servicio[]>(`/servicios${
      sucursalId
        ? `?sucursalId=${sucursalId}${incluirInactivos ? '&incluirInactivos=true' : ''}`
        : ''
    }`),

  obtener: (id: string) => api.get<Servicio>(`/servicios/${id}`),

  crear: (dto: CrearServicioDto) => api.post<Servicio>('/servicios', dto),

  actualizar: (id: string, dto: Partial<CrearServicioDto> & { activo?: boolean }) =>
    api.put<Servicio>(`/servicios/${id}`, dto),

  eliminar: (id: string) => api.delete<void>(`/servicios/${id}`),
};
