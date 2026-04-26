import { api } from './client';
import type { CajaInfo, MovimientoCaja, RegistrarMovimientoDto, CajaSesion, AbrirSesionDto, CerrarSesionDto } from '../types';

export const cajaApi = {
  obtenerPorSucursal: (sucursalId: string) =>
    api.get<CajaInfo>(`/caja/sucursal/${sucursalId}`),

  listarMovimientos: (cajaId: string, desde?: string, hasta?: string) => {
    const params = new URLSearchParams();
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const qs = params.toString();
    return api.get<MovimientoCaja[]>(`/caja/${cajaId}/movimientos${qs ? `?${qs}` : ''}`);
  },

  registrarMovimiento: (cajaId: string, dto: RegistrarMovimientoDto) =>
    api.post<MovimientoCaja>(`/caja/${cajaId}/movimientos`, dto),

  obtenerSesionActiva: (cajaId: string) =>
    api.get<CajaSesion | null>(`/caja/${cajaId}/sesiones/activa`),

  abrirSesion: (cajaId: string, dto: AbrirSesionDto) =>
    api.post<CajaSesion>(`/caja/${cajaId}/sesiones/abrir`, dto),

  cerrarSesion: (cajaId: string, dto: CerrarSesionDto) =>
    api.post<CajaSesion>(`/caja/${cajaId}/sesiones/cerrar`, dto),

  listarSesiones: (cajaId: string) =>
    api.get<CajaSesion[]>(`/caja/${cajaId}/sesiones`),
};
