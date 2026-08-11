import { describe, expect, it, vi, afterEach } from 'vitest';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';

describe('pricing-engine integration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('PRIX 2026 désactivé par défaut pour POS', () => {
    vi.stubEnv('USE_PRIX_2026_LEGACY', '');
    expect(isPrix2026LegacyEnabled()).toBe(false);
  });
});
