import { api } from './client';

export interface MercadoPagoEstado {
  conectado: boolean;
  mpUserId: string | null;
  fechaConexionUtc: string | null;
}

export const mercadopagoApi = {
  obtenerUrlConexion: (sucursalId: string) =>
    api.get<{ url: string }>(`/mercadopago/oauth/start?sucursalId=${sucursalId}`),

  obtenerEstado: (sucursalId: string) =>
    api.get<MercadoPagoEstado>(`/mercadopago/oauth/estado?sucursalId=${sucursalId}`),

  desconectar: (sucursalId: string) =>
    api.delete<void>(`/mercadopago/oauth/desconectar?sucursalId=${sucursalId}`),
};
