import { describe, expect, it } from 'vitest';
import { inferLiveDomainsFromUrl, domainsMatch } from '@/lib/live/orion-live';
import { parseLiveDomainsHeader } from '@/lib/live/live-response';

describe('orion-live pricing/stock domains', () => {
  it('mappe publish admin → pricing + catalogue + sync', () => {
    const d = inferLiveDomainsFromUrl('/api/admin-backoffice/pricing/publish-bulk');
    expect(d).toEqual(expect.arrayContaining(['pricing', 'catalogue', 'sync']));
  });

  it('mappe dynamic-pricing → commercial', () => {
    const d = inferLiveDomainsFromUrl('/api/dynamic-pricing/carte-visite');
    expect(d).toEqual(expect.arrayContaining(['pricing', 'catalogue']));
  });

  it('n’émet pas sur simulate/calculate (évite boucle POS)', () => {
    expect(inferLiveDomainsFromUrl('/api/pricing/simulate')).toEqual([]);
    expect(inferLiveDomainsFromUrl('/api/pricing/calculate')).toEqual([]);
    expect(inferLiveDomainsFromUrl('/api/pricing/estimate')).toEqual([]);
  });

  it('mappe stock → stock + catalogue + pricing', () => {
    const d = inferLiveDomainsFromUrl('/api/stock/abc');
    expect(d).toEqual(expect.arrayContaining(['stock', 'catalogue', 'pricing']));
  });

  it('mappe sync-all', () => {
    const d = inferLiveDomainsFromUrl('/api/admin-backoffice/sync-all');
    expect(d).toEqual(expect.arrayContaining(['sync', 'pricing', 'catalogue']));
  });

  it('mappe publish matière', () => {
    const d = inferLiveDomainsFromUrl('/api/admin-backoffice/pricing/base-material-prices/x/publish');
    expect(d).toEqual(expect.arrayContaining(['pricing', 'catalogue', 'sync']));
  });

  it('mappe paliers Admin (tiers) → pricing + catalogue + sync', () => {
    const d = inferLiveDomainsFromUrl('/api/admin-backoffice/tiers/articles/gf-pvc');
    expect(d).toEqual(expect.arrayContaining(['pricing', 'catalogue', 'sync']));
  });

  it('mappe tout admin-backoffice → domaines opérationnels', () => {
    const d = inferLiveDomainsFromUrl('/api/admin-backoffice/options/chips/xyz');
    expect(d).toEqual(expect.arrayContaining(['pricing', 'catalogue', 'sync']));
  });

  it('mappe matières Admin → stock + pricing', () => {
    const d = inferLiveDomainsFromUrl('/api/admin-backoffice/materials/clean-merge');
    expect(d).toEqual(expect.arrayContaining(['stock', 'pricing', 'sync']));
  });

  it('parse header live + filtre domaines invalides', () => {
    expect(parseLiveDomainsHeader('pricing, catalogue,sync,evil')).toEqual([
      'pricing',
      'catalogue',
      'sync',
    ]);
  });

  it('domainsMatch pricing', () => {
    expect(domainsMatch(['pricing', 'catalogue'], 'pricing')).toBe(true);
    expect(domainsMatch(['commandes'], 'pricing')).toBe(false);
  });
});
