import { describe, expect, it } from 'vitest';
import {
  passwordRuleResults,
  passwordStrengthScore,
  validatePassword,
} from '@/lib/auth/password-policy';

describe('password-policy', () => {
  it('rejects weak passwords', () => {
    expect(validatePassword('short').ok).toBe(false);
    expect(validatePassword('alllowercase1!').ok).toBe(false);
    expect(validatePassword('ALLUPPERCASE1!').ok).toBe(false);
    expect(validatePassword('NoDigits!!').ok).toBe(false);
    expect(validatePassword('NoSpecial1').ok).toBe(false);
  });

  it('accepts strong passwords', () => {
    expect(validatePassword('AnsOrion2026!').ok).toBe(true);
  });

  it('scores password strength', () => {
    expect(passwordStrengthScore('')).toBe(0);
    expect(passwordStrengthScore('AnsOrion2026!')).toBe(100);
    const partial = passwordRuleResults('abcdefgh');
    expect(partial.filter((r) => r.ok).length).toBe(2);
  });
});
