import { describe, expect, it } from 'vitest';
import { resolveCustomSurfaceRecap } from '@/lib/pos/custom-surface-recap';

describe('resolveCustomSurfaceRecap', () => {
  it('calcule surface L×l pour format personnalisé', () => {
    const recap = resolveCustomSurfaceRecap('imp-flyer', {
      format: 'Format personnalisé',
      longueur: 210,
      largeur: 148,
    }, 100);
    expect(recap).not.toBeNull();
    expect(recap!.widthMm).toBe(210);
    expect(recap!.heightMm).toBe(148);
    expect(recap!.grossWidthMm).toBe(310);
    expect(recap!.grossHeightMm).toBe(248);
    expect(recap!.realSurfaceM2).toBeCloseTo(0.03108, 5);
    expect(recap!.grossSurfaceM2).toBeCloseTo(0.07688, 5);
    expect(recap!.totalGrossSurfaceM2).toBeCloseTo(7.688, 3);
  });

  it('ignore packaging et calendrier', () => {
    expect(
      resolveCustomSurfaceRecap('pkg-boite', {
        format: 'Format personnalisé',
        longueur: 100,
        largeur: 100,
      }),
    ).toBeNull();
    expect(
      resolveCustomSurfaceRecap('cal-plateau', {
        format: 'Format personnalisé',
        longueur: 100,
        largeur: 100,
      }),
    ).toBeNull();
  });
});
