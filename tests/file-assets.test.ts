import { describe, expect, it } from 'vitest';
import {
  isAllowedProExtension,
  isBatPending,
  isBatValidated,
  batStatutLabel,
} from '@/lib/constants/file-assets';

describe('file-assets', () => {
  it('accepte les extensions pro', () => {
    expect(isAllowedProExtension('affiche.pdf')).toBe(true);
    expect(isAllowedProExtension('logo.ai')).toBe(true);
    expect(isAllowedProExtension('virus.exe')).toBe(false);
  });

  it('détecte BAT en attente et validé', () => {
    expect(isBatPending('Envoyé')).toBe(true);
    expect(isBatValidated('Validé')).toBe(true);
    expect(isBatValidated('Verrouillé')).toBe(true);
  });

  it('affiche libellé verrouillé', () => {
    expect(batStatutLabel('Validé', true)).toContain('Verrouillé');
  });
});
