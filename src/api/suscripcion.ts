import { api } from './client';
import type { Plan, SuscripcionInfo, PagoSuscripcionHistorial } from '../types';

export const suscripcionApi = {
  getSuscripcion: (sucursalId: string) =>
    api.get<SuscripcionInfo>(`/suscripcion?sucursalId=${sucursalId}`),

  getPlanes: () =>
    api.get<Plan[]>('/planes'),

  iniciarPago: (sucursalId: string, planId: string) =>
    api.post<{ checkoutUrl: string }>('/pagos/suscripcion/iniciar-pago', { sucursalId, planId }),

  getHistorial: (sucursalId: string) =>
    api.get<PagoSuscripcionHistorial[]>(`/pagos/suscripcion/${sucursalId}/historial`),
};
