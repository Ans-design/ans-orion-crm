import { describe, expect, it } from 'vitest';
import { validatePassword } from '@/lib/auth/password-policy';

describe('final-adjustment auth', () => {
  it('enforces password complexity policy', () => {
    expect(validatePassword('AnsOrion2026!').ok).toBe(true);
    expect(validatePassword('weak').ok).toBe(false);
  });
});
