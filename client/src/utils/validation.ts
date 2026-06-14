const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8, message: 'Mínimo 8 caracteres.' },
  { test: (p: string) => /[A-Z]/.test(p), message: 'Al menos una letra mayúscula.' },
  { test: (p: string) => /[0-9]/.test(p), message: 'Al menos un número.' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), message: 'Al menos un carácter especial.' },
];

export function validateInstitutionalEmail(email: string): string | null {
  if (!email.trim()) return 'El correo institucional es requerido.';
  if (!email.endsWith('@ucr.ac.cr')) return 'El correo debe ser institucional (@ucr.ac.cr).';
  return null;
}

export const validatePassword = (password: string): string | null => {
  if (!password) return 'La contraseña es requerida.';
  if (password.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
  if (!/[A-Z]/.test(password)) return 'La contraseña debe tener al menos una mayúscula.';
  if (!/[0-9]/.test(password)) return 'La contraseña debe tener al menos un número.';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'La contraseña debe tener al menos un caracter especial.';
  return null;
};
