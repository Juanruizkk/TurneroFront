import { api } from './client';
import type {
  SucursalSuperAdmin,
  CrearSucursalConOwnerDto,
  ActualizarSucursalSuperAdminDto,
  Plan,
  CrearPlanDto,
  ActualizarPlanDto,
  SuscripcionSuperAdminItem,
  CambiarPlanSuperAdminDto,
} from '../types';

const BASE = '/superadmin/sucursales';

export const superAdminApi = {
  listarSucursales: () =>
    api.get<SucursalSuperAdmin[]>(BASE),

  obtenerSucursal: (id: string) =>
    api.get<SucursalSuperAdmin>(`${BASE}/${id}`),

  crearSucursal: (dto: CrearSucursalConOwnerDto) =>
    api.post<SucursalSuperAdmin>(BASE, dto),

  actualizarSucursal: (id: string, dto: ActualizarSucursalSuperAdminDto) =>
    api.put<SucursalSuperAdmin>(`${BASE}/${id}`, dto),

  toggleEstado: (id: string) =>
    api.patch<SucursalSuperAdmin>(`${BASE}/${id}/estado`, {}),
};

export const planesApi = {
  listar: () =>
    api.get<Plan[]>('/superadmin/planes'),

  obtener: (id: string) =>
    api.get<Plan>(`/superadmin/planes/${id}`),

  crear: (dto: CrearPlanDto) =>
    api.post<Plan>('/superadmin/planes', dto),

  actualizar: (id: string, dto: ActualizarPlanDto) =>
    api.put<Plan>(`/superadmin/planes/${id}`, dto),

  toggleActivo: (id: string) =>
    api.patch<Plan>(`/superadmin/planes/${id}/estado`, {}),

  cambiarPrecio: (id: string, precioMensual: number) =>
    api.patch<Plan>(`/superadmin/planes/${id}/precio`, { precioMensual }),
};

export const suscripcionesAdminApi = {
  listar: () =>
    api.get<SuscripcionSuperAdminItem[]>('/superadmin/suscripciones'),

  cambiarPlan: (sucursalId: string, dto: CambiarPlanSuperAdminDto) =>
    api.patch<SuscripcionSuperAdminItem>(`/superadmin/suscripciones/${sucursalId}/plan`, dto),

  extenderVencimiento: (sucursalId: string) =>
    api.post<SuscripcionSuperAdminItem>(`/superadmin/suscripciones/${sucursalId}/extender`, {}),

  procesarPagoManual: (paymentId: string) =>
    api.post<{ mensaje: string }>(`/suscripcion/procesar-pago/${paymentId}`, {}),
};
