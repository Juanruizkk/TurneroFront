import { api } from './client';
import type { Usuario, CrearUsuarioDto, ActualizarUsuarioDto, HorarioLaboral, RolUsuario, EstadoUsuario, PermisoSistema } from '../types';

export interface ActualizarRolEstadoPermisosDto {
  rol: RolUsuario;
  estado: EstadoUsuario;
  permisos: PermisoSistema[];
}

export const usuariosApi = {
  listar: (sucursalId: string) =>
    api.get<Usuario[]>(`/usuarios?sucursalId=${sucursalId}`),

  obtener: (id: string) => api.get<Usuario>(`/usuarios/${id}`),

  crear: (dto: CrearUsuarioDto) => api.post<Usuario>('/usuarios', dto),

  actualizar: (id: string, dto: ActualizarUsuarioDto) =>
    api.put<Usuario>(`/usuarios/${id}`, dto),

  actualizarRolEstadoPermisos: (id: string, dto: ActualizarRolEstadoPermisosDto) =>
    api.put<Usuario>(`/usuarios/${id}/rol-estado-permisos`, dto),

  eliminar: (id: string) => api.delete<void>(`/usuarios/${id}`),

  hardEliminar: (id: string) => api.delete<void>(`/usuarios/${id}/hard`),

  reenviarInvitacion: (id: string) =>
    api.post<{ link: string }>(`/usuarios/${id}/reenviar-invitacion`, {}),

  // Disponibilidad
  getHorarios: (id: string) =>
    api.get<HorarioLaboral[]>(`/usuarios/${id}/horarios`),

  setHorarios: (id: string, data: HorarioLaboral[]) =>
    api.put<void>(`/usuarios/${id}/horarios`, data),

  getServicios: (id: string) =>
    api.get<string[]>(`/usuarios/${id}/servicios`),

  setServicios: (id: string, ids: string[]) =>
    api.put<void>(`/usuarios/${id}/servicios`, ids),
};
