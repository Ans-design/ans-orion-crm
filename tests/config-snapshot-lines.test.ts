import { describe, expect, it } from 'vitest';
import { summarizeConfigSnapshot } from '@/lib/commande/config-snapshot-lines';

describe('summarizeConfigSnapshot', () => {
  it('extracts grand format dimensions in cm', () => {
    const s = summarizeConfigSnapshot('Bâche', 2, { longueur_cm: 200, largeur_cm: 100, surface_m2: 2 }, 'gf-bache');
    expect(s.lines.some((l) => l.key === 'Dimensions')).toBe(true);
    expect(s.lines.find((l) => l.key === 'Surface')?.value).toBe('2 m²');
  });

  it('extracts matiere and grammage', () => {
    const s = summarizeConfigSnapshot('Flyer', 1000, { matiere: 'Couché', grammage: '300g' }, 'pf-flyer');
    expect(s.lines.find((l) => l.key === 'Matière')?.value).toBe('Couché');
    expect(s.lines.find((l) => l.key === 'Grammage')?.value).toBe('300g');
  });
});
