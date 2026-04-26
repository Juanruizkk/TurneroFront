import { api } from './client';
import type { Plan } from '../types';

export const planesPublicoApi = {
  listar: () => api.get<Plan[]>('/planes'),
};
