import { api } from './client';

interface IniciarPagoResponse {
  checkoutUrl: string;
}

interface VerificarPagoResponse {
  confirmado: boolean;
}

export const pagosApi = {
  iniciarPago: (turnoId: string) =>
    api.post<IniciarPagoResponse>(`/pagos/turnos/${turnoId}/iniciar-pago`, {}),

  confirmarRedirect: (paymentId: string, turnoId: string) =>
    api.post(`/pagos/confirmar-redirect?paymentId=${paymentId}&turnoId=${turnoId}`, {}),

  verificarPago: (turnoId: string) =>
    api.post<VerificarPagoResponse>(`/pagos/turnos/${turnoId}/verificar-pago`, {}),
};
