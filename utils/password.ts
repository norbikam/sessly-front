export type PasswordRuleId =
  | 'minLength'
  | 'uppercase'
  | 'lowercase'
  | 'digit'
  | 'special';

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  test: (password: string) => boolean;
};

/** Shared registration / reset password rules. */
export const PASSWORD_RULES: PasswordRule[] = [
  {
    id: 'minLength',
    label: 'Minimum 8 znaków',
    test: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'Jedna wielka litera',
    test: (password) => /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'Jedna mała litera',
    test: (password) => /[a-ząćęłńóśźż]/.test(password),
  },
  {
    id: 'digit',
    label: 'Jedna cyfra',
    test: (password) => /\d/.test(password),
  },
  {
    id: 'special',
    label: 'Jeden znak specjalny',
    test: (password) => /[^A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż0-9]/.test(password),
  },
];

export function getPasswordRuleStatus(password: string) {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: rule.test(password),
  }));
}

export function isPasswordValid(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

export function getPasswordValidationError(password: string): string | null {
  const missing = getPasswordRuleStatus(password)
    .filter((rule) => !rule.met)
    .map((rule) => rule.label.toLowerCase());
  if (missing.length === 0) return null;
  return `Hasło musi zawierać: ${missing.join(', ')}.`;
}
