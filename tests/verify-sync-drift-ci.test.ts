import { describe, expect, it } from 'vitest';
import runVerifySyncDrift from '../scripts/verify-sync-drift-runner';

describe('verify-sync-drift script (CI gate)', () => {
  it('échoue si drift critique', async () => {
    await expect(
      runVerifySyncDrift({
        analyze: async () => ({
          totalScore: 3,
          alerts: [
            {
              severity: 'critical',
              title: 'Aucun profil publié POS',
              message: 'test',
            },
          ],
          catalogueDb: { missingInDb: 97 },
          pricing: { published: 0 },
          dbUnavailable: false,
        }),
      }),
    ).rejects.toMatchObject({ code: 'DRIFT_CRITICAL' });
  });

  it('passe sans drift critique', async () => {
    await expect(
      runVerifySyncDrift({
        analyze: async () => ({
          totalScore: 0,
          alerts: [],
          catalogueDb: { missingInDb: 0 },
          pricing: { published: 97 },
          dbUnavailable: false,
        }),
      }),
    ).resolves.toBeUndefined();
  });

  it('sortie 2 si DB indisponible', async () => {
    await expect(
      runVerifySyncDrift({
        analyze: async () => ({
          totalScore: 2,
          alerts: [{ severity: 'warn', title: 'DB', message: 'down' }],
          dbUnavailable: true,
        }),
      }),
    ).rejects.toMatchObject({ code: 'DB_UNAVAILABLE' });
  });
});
