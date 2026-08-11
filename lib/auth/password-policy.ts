export type PasswordRule = {
  id: string;
  label: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: '8 caractères minimum', test: (p) => p.length >= 8 },
  { id: 'lower', label: 'Une minuscule', test: (p) => /[a-z]/.test(p) },
  { id: 'upper', label: 'Une majuscule', test: (p) => /[A-Z]/.test(p) },
  { id: 'digit', label: 'Un chiffre', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'Un caractère spécial (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordRuleResults(password: string) {
  return PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(password) }));
}

export function passwordStrengthScore(password: string): number {
  if (!password) return 0;
  const passed = passwordRuleResults(password).filter((r) => r.ok).length;
  return Math.round((passed / PASSWORD_RULES.length) * 100);
}

export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  if (!password || password.length < 8) {
    return { ok: false, error: 'Mot de passe : 8 caractères minimum' };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, error: 'Mot de passe : une minuscule requise' };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: 'Mot de passe : une majuscule requise' };
  }
  if (!/\d/.test(password)) {
    return { ok: false, error: 'Mot de passe : un chiffre requis' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, error: 'Mot de passe : un caractère spécial requis' };
  }
  return { ok: true };
}
