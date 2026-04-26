import { api } from './client';
import type { Cliente, ClienteFicha, CrearClienteDto } from '../types';

export const clientesApi = {
  listar: (sucursalId: string) =>
    api.get<Cliente[]>(`/clientes?sucursalId=${sucursalId}`),

  listarArchivados: (sucursalId: string) =>
    api.get<Cliente[]>(`/clientes/archivados?sucursalId=${sucursalId}`),

  buscar: (sucursalId: string, q: string) =>
    api.get<Cliente[]>(`/clientes?sucursalId=${sucursalId}&q=${encodeURIComponent(q)}`),

  buscarPorTelefono: (sucursalId: string, telefono: string) =>
    api.get<Cliente[]>(`/clientes?sucursalId=${sucursalId}&telefono=${encodeURIComponent(telefono)}`),

  buscarPorEmail: (sucursalId: string, email: string) =>
    api.get<Cliente[]>(`/clientes?sucursalId=${sucursalId}&email=${encodeURIComponent(email)}`),

  obtener: (id: string) => api.get<Cliente>(`/clientes/${id}`),

  getFicha: (id: string) => api.get<ClienteFicha>(`/clientes/${id}/ficha`),

  crear: (dto: CrearClienteDto) => api.post<Cliente>('/clientes', dto),

  actualizar: (id: string, dto: Partial<CrearClienteDto>) =>
    api.put<Cliente>(`/clientes/${id}`, dto),

  archivar: (id: string) => api.post<void>(`/clientes/${id}/archivar`, {}),

  desarchivar: (id: string) => api.post<void>(`/clientes/${id}/desarchivar`, {}),

  eliminar: (id: string) => api.delete<void>(`/clientes/${id}`),
};
