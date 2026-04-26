import { api } from './client';
import type { AjustesSucursal } from '../types';

export const ajustesApi = {
  obtener: (sucursalId: string) =>
    api.get<AjustesSucursal>(`/ajustes?sucursalId=${sucursalId}`),

  actualizar: (sucursalId: string, dto: AjustesSucursal) =>
    api.put<AjustesSucursal>(`/ajustes?sucursalId=${sucursalId}`, dto),

  // ─── Imágenes ─────────────────────────────────────────────────────────────

  subirImagen: (sucursalId: string, tipo: 'logo' | 'background', formData: FormData) =>
    api.postForm<{ url: string; publicId: string; tipo: string }>(
      `/ajustes/imagen?sucursalId=${sucursalId}&tipo=${tipo}`,
      formData
    ),

  eliminarImagen: (sucursalId: string, tipo: 'logo' | 'background') =>
    api.delete<void>(`/ajustes/imagen?sucursalId=${sucursalId}&tipo=${tipo}`),

  // ─── Slug ────────────────────────────────────────────────────────────────

  obtenerSlug: (sucursalId: string) =>
    api.get<{ slug: string }>(`/ajustes/slug?sucursalId=${sucursalId}`),

  checkSlugDisponible: (sucursalId: string, slug: string) =>
    api.get<{ disponible: boolean }>(
      `/ajustes/slug-disponible?sucursalId=${sucursalId}&slug=${encodeURIComponent(slug)}`
    ),

  actualizarSlug: (sucursalId: string, slug: string) =>
    api.patch<{ id: string; slug: string; nombre: string }>(
      `/ajustes/slug?sucursalId=${sucursalId}`,
      { slug }
    ),
};
