import { describe, expect, it, vi, afterEach } from 'vitest';
import { isPrix2026LegacyEnabled, PRIX_2026_LEGACY_STATUS } from '@/lib/pricing/prix-2026-legacy';

describe('prix-2026-legacy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('désactivé par défaut', () => {
    vi.stubEnv('USE_PRIX_2026_LEGACY', '');
    expect(isPrix2026LegacyEnabled()).toBe(false);
  });

  it('activé uniquement si USE_PRIX_2026_LEGACY=true hors STRICT/prod', () => {
    vi.stubEnv('USE_PRIX_2026_LEGACY', 'true');
    vi.stubEnv('STRICT_POS_PRICING', 'false');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_ENV', 'local');
    vi.stubEnv('HOSTINGER', '');
    vi.stubEnv('USE_PRODUCTION_DB', '');
    vi.stubEnv('VERCEL_ENV', '');
    expect(isPrix2026LegacyEnabled()).toBe(true);
  });

  it('refusé si STRICT même avec USE_PRIX_2026_LEGACY=true', () => {
    vi.stubEnv('USE_PRIX_2026_LEGACY', 'true');
    vi.stubEnv('STRICT_POS_PRICING', 'true');
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('APP_ENV', 'local');
    expect(isPrix2026LegacyEnabled()).toBe(false);
  });

  it('expose le statut archive hors runtime', () => {
    expect(PRIX_2026_LEGACY_STATUS).toMatch(/Archive|Legacy/i);
  });
});
