import { api } from './client';
import type { DemoSesionResponse } from '../types';

export const demoApi = {
  /** Crea una demo efímera y devuelve los 4 roles con sus tokens. */
  crear: () => api.post<DemoSesionResponse>('/demo/crear', {}),
};
