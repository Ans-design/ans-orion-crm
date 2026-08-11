import { describe, it, expect } from 'vitest';
import { validatePaperConfigStrict } from '@/lib/data/paper-material';
import { sanitizeCartItemConfig } from '@/lib/cart-config-sanitize';

describe('cart validation', () => {
  it('sanitizes legacy combined matiere', () => {
    const c = sanitizeCartItemConfig({ matiere: 'PCM 170g', format: 'A5', quantite: 100 });
    expect(c.paperType).toBe('PCM');
    expect(c.paperWeight).toBe('170g');
    expect(c.matiere).toBeUndefined();
  });

  it('sanitizes split matiere + grammage legacy', () => {
    const c = sanitizeCartItemConfig({ matiere: 'PCM', grammage: '170g', format: 'A5' });
    expect(c.paperType).toBe('PCM');
    expect(c.paperWeight).toBe('170g');
  });

  it('sanitizes when paperType exists but legacy matiere combined remains', () => {
    const c = sanitizeCartItemConfig({
      paperType: 'PCM',
      paperWeight: '170g',
      matiere: 'PCM 170g',
    });
    expect(c.matiere).toBeUndefined();
    expect(validatePaperConfigStrict(c).ok).toBe(true);
  });
});
