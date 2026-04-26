import { api } from './client';
import type { LoginResponseDto } from '../types';

export interface RegisterPayload {
  nombre: string;
  apellido: string;
  email: string;
  password: string;
  nombreNegocio: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponseDto>('/auth/login', { email, password }),

  seleccionarSucursal: (seleccionToken: string, sucursalId: string) =>
    api.post<LoginResponseDto>('/auth/seleccionar-sucursal', { seleccionToken, sucursalId }),

  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),

  resetPassword: (token: string, nuevaContrasena: string) =>
    api.post<void>('/auth/reset-password', { token, nuevaContrasena }),

  register: (payload: RegisterPayload) =>
    api.post<LoginResponseDto>('/auth/register', payload),
};
