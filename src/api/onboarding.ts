import { api } from './client';

export interface OnboardingStatus {
  perfilCompleto: boolean;
  tieneServicio: boolean;
  tieneProfesional: boolean;
  completado: boolean;
}

export const onboardingApi = {
  getStatus: (sucursalId: string) =>
    api.get<OnboardingStatus>(`/onboarding?sucursalId=${sucursalId}`),
};
