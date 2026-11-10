export interface PasswordCheck {
  label: string;
  ok: boolean;
}

/** Requisitos de contraseña, espejo del StrongPasswordAttribute del backend. */
export function checkPassword(pwd: string): PasswordCheck[] {
  return [
    { label: 'Al menos 8 caracteres', ok: pwd.length >= 8 },
    { label: 'Una minúscula (a-z)',   ok: /[a-z]/.test(pwd) },
    { label: 'Una mayúscula (A-Z)',   ok: /[A-Z]/.test(pwd) },
    { label: 'Un número (0-9)',       ok: /[0-9]/.test(pwd) },
    { label: 'Un carácter especial',  ok: /[^A-Za-z0-9]/.test(pwd) },
  ];
}

/** True si la contraseña cumple todos los requisitos. */
export function isPasswordStrong(pwd: string): boolean {
  return checkPassword(pwd).every((c) => c.ok);
}
