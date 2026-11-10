import { CheckIcon, XIcon } from 'lucide-react';
import { checkPassword } from '../../utils/password';

/**
 * Checklist en vivo de los requisitos de contraseña. Se oculta si el campo está vacío.
 * Espejo del StrongPasswordAttribute del backend.
 */
export default function PasswordRequirements({ password }: { password: string }) {
  if (!password) return null;
  const checks = checkPassword(password);

  return (
    <ul className="space-y-1 text-xs mt-1">
      {checks.map((c) => (
        <li
          key={c.label}
          className={`flex items-center gap-1.5 transition-colors ${
            c.ok ? 'text-green-600' : 'text-text-muted'
          }`}
        >
          {c.ok ? <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" /> : <XIcon className="w-3.5 h-3.5 flex-shrink-0" />}
          {c.label}
        </li>
      ))}
    </ul>
  );
}
