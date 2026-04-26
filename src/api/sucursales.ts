import { api } from './client';
import type { Sucursal, CrearSucursalDto } from '../types';

export const sucursalesApi = {
  listar: (soloActivas = false) =>
    api.get<Sucursal[]>(`/sucursales${soloActivas ? '?soloActivas=true' : ''}`),

  obtener: (id: string) => api.get<Sucursal>(`/sucursales/${id}`),

  crear: (dto: CrearSucursalDto) => api.post<Sucursal>('/sucursales', dto),

  actualizar: (id: string, dto: Partial<Sucursal>) =>
    api.put<Sucursal>(`/sucursales/${id}`, dto),

  eliminar: (id: string) => api.delete<void>(`/sucursales/${id}`),
};
