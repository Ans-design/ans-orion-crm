import { describe, expect, it, vi } from 'vitest';
import { CATALOGUE } from '@/lib/data/catalogue';

vi.mock('@/lib/services/admin-config', () => ({
  getConfigHealth: vi.fn().mockResolvedValue({
    configStatus: 'published',
    catalogDrift: { totalDrift: 0, missingChipIds: [], missingArticleIds: [], details: [] },
    lastPublishedAt: null,
  }),
}));

vi.mock('@/lib/pricing/publish-dynamic-pricing', () => ({
  getDynamicPricingStats: vi.fn().mockResolvedValue({ published: 5, draft: 2 }),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    articlePricingProfile: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    systemConfig: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

import {
  detectCatalogueDbDrift,
  getSyncDriftTickerAlerts,
  ignoreSyncDriftAlert,
  runFullSyncDriftAnalysis,
  summarizeSyncDriftReport,
} from '@/lib/services/sync-drift-service';

describe('sync-drift', () => {
  it('runFullSyncDriftAnalysis retourne une structure valide', async () => {
    const report = await runFullSyncDriftAnalysis();
    expect(report.checkedAt).toBeTruthy();
    expect(Array.isArray(report.alerts)).toBe(true);
    expect(report.totalScore).toBeGreaterThanOrEqual(0);
    if (report.catalogueDb) {
      expect(report.catalogueDb.catalogueCount).toBe(CATALOGUE.length);
    }
  }, 15000);

  it('detectCatalogueDbDrift compare catalogue et profils DB', async () => {
    const drift = await detectCatalogueDbDrift();
    expect(drift.catalogueCount).toBe(CATALOGUE.length);
    expect(drift.dbProfileCount).toBeGreaterThanOrEqual(0);
    expect(drift.missingInDb).toBeGreaterThanOrEqual(0);
    expect(drift.totalDrift).toBe(drift.missingInDb + drift.orphanInDb);
  }, 15000);

  it('ignoreSyncDriftAlert persiste un TTL', async () => {
    const { prisma } = await import('@/lib/prisma');
    const store: { byId: Record<string, string> } = { byId: {} };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.systemConfig.findUnique).mockImplementation((({ where }: any) => {
      if (where.configKey === 'sync_drift_ignored_alerts') {
        return Promise.resolve({ data: store });
      }
      return Promise.resolve(null);
    }) as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(prisma.systemConfig.upsert).mockImplementation(((args: any) => {
      const data = args.create?.data ?? args.update?.data;
      if (data?.byId) store.byId = { ...data.byId };
      return Promise.resolve({});
    }) as any);

    const result = await ignoreSyncDriftAlert('config-catalogue', 24);
    expect(result.alertId).toBe('config-catalogue');
    expect(store.byId['config-catalogue']).toBeTruthy();
    expect(new Date(result.until).getTime()).toBeGreaterThan(Date.now());
  });

  it('getSyncDriftTickerAlerts exclut les alertes info', async () => {
    const alerts = await getSyncDriftTickerAlerts();
    expect(Array.isArray(alerts)).toBe(true);
    for (const a of alerts) {
      expect(a.severity).not.toBe('info');
      expect(a.label).toMatch(/^Sync :/);
    }
  }, 15000);

  it('db indisponible → warn config, flag dbUnavailable', async () => {
    const { getConfigHealth } = await import('@/lib/services/admin-config');
    vi.mocked(getConfigHealth).mockRejectedValueOnce(
      new Error("Can't reach database server at `localhost:5432`"),
    );
    const report = await runFullSyncDriftAnalysis();
    expect(report.dbUnavailable).toBe(true);
    const configAlert = report.alerts.find((a) => a.id === 'config-catalogue-error');
    expect(configAlert?.severity).toBe('warn');
    expect(configAlert?.title).toMatch(/indisponible/i);
  }, 15000);

  it('summarizeSyncDriftReport condense le rapport pour API publish', async () => {
    const report = await runFullSyncDriftAnalysis();
    const summary = summarizeSyncDriftReport(report);
    expect(summary.checkedAt).toBe(report.checkedAt);
    expect(summary.totalScore).toBe(report.totalScore);
    expect(typeof summary.ok).toBe('boolean');
    expect(summary.topAlerts.length).toBeLessThanOrEqual(5);
  }, 15000);
});
