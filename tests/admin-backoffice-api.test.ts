import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';

const mockRequirePermission = vi.fn();
const mockOverview = vi.fn();
const mockAudit = vi.fn();
const mockListDraft = vi.fn();
const mockPublishBulk = vi.fn();

vi.mock('@/lib/auth-utils', () => ({
  requirePermission: (...args: unknown[]) => mockRequirePermission(...args),
}));

vi.mock('@/lib/server/modules/backoffice-v2/admin-backoffice.service', () => ({
  getAdminBackofficeOverview: (...args: unknown[]) => mockOverview(...args),
}));

vi.mock('@/lib/server/modules/backoffice-v2/pricing-sync-audit.service', () => ({
  runPricingSyncAudit: (...args: unknown[]) => mockAudit(...args),
}));

vi.mock('@/lib/pricing/publish-dynamic-pricing', () => ({
  listDraftPricingArticleIds: (...args: unknown[]) => mockListDraft(...args),
  publishBulkArticleDynamicPricing: (...args: unknown[]) => mockPublishBulk(...args),
}));

vi.mock('@/lib/services/kpi-cache-invalidation', () => ({
  invalidateKpiCaches: vi.fn(),
}));

vi.mock('@/lib/server/modules/pricing/pricing-publication.service', () => ({
  publishBaseMaterialsPricing: vi.fn().mockResolvedValue({
    materialsPublished: 0,
    basePrintingPublished: 0,
  }),
}));

vi.mock('@/lib/pricing/pricing-release-service', () => ({
  buildCertifiedPricingSnapshot: vi.fn().mockResolvedValue({ articles: [] }),
  publishPricingRelease: vi.fn().mockResolvedValue({
    releaseId: 'rel-1',
    version: 1,
    hash: 'abc',
  }),
}));

vi.mock('@/lib/services/sync.service', () => ({
  invalidateSyncDiagnosticsCache: vi.fn(),
}));

vi.mock('@/lib/services/commercial-live-propagation.service', () => ({
  propagatePricingToCommercialNow: vi.fn().mockResolvedValue({
    domains: ['pricing', 'catalogue', 'sync'],
  }),
}));

vi.mock('@/lib/live/live-response', () => ({
  jsonWithLiveDomains: (body: unknown) =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('next/server').NextResponse.json(body),
}));

import { GET as overviewGET } from '@/app/api/admin-backoffice/overview/route';
import { GET as auditGET } from '@/app/api/admin-backoffice/pricing/audit/route';
import { POST as publishBulkPOST } from '@/app/api/admin-backoffice/pricing/publish-bulk/route';

describe('admin-backoffice API v2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('overview — refuse sans permission config:view', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      error: NextResponse.json({ error: 'Non autorisé' }, { status: 401 }),
    });
    const res = await overviewGET();
    expect(res.status).toBe(401);
    expect(mockOverview).not.toHaveBeenCalled();
  });

  it('overview — retourne data avec auth OK', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      role: 'admin',
      userId: 'u1',
      userName: 'Admin',
      session: {},
    });
    mockOverview.mockResolvedValueOnce({ articles: 12, chips: 4 });
    const res = await overviewGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.articles).toBe(12);
    expect(mockRequirePermission).toHaveBeenCalledWith('config:view');
  });

  it('pricing/audit — retourne rapport sync', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      role: 'admin',
      userId: 'u1',
      userName: 'Admin',
      session: {},
    });
    mockAudit.mockResolvedValueOnce({ summary: { critical: 0, warning: 1 }, items: [] });
    const res = await auditGET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.summary.critical).toBe(0);
    expect(mockRequirePermission).toHaveBeenCalledWith('tarifs:read');
  });

  it('publish-bulk — aucun brouillon → message explicite', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      role: 'admin',
      userId: 'u1',
      userName: 'Admin',
      session: {},
    });
    mockListDraft.mockResolvedValueOnce([]);
    const req = new Request('http://localhost/api/admin-backoffice/pricing/publish-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'all_draft' }),
    });
    const res = await publishBulkPOST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.message).toMatch(/aucun article brouillon/i);
    expect(mockRequirePermission).toHaveBeenCalledWith('config:publish');
  });

  it('publish-bulk — publie les articles sélectionnés', async () => {
    mockRequirePermission.mockResolvedValueOnce({
      role: 'admin',
      userId: 'u1',
      userName: 'Admin',
      session: {},
    });
    mockPublishBulk.mockResolvedValueOnce({ published: ['art-1'], failed: [] });
    const req = new Request('http://localhost/api/admin-backoffice/pricing/publish-bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ articleIds: ['art-1'] }),
    });
    const res = await publishBulkPOST(req as never);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.published).toEqual(['art-1']);
    expect(mockPublishBulk).toHaveBeenCalledWith(['art-1'], 'u1');
  });
});
