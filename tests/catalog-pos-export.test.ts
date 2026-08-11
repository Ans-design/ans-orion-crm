import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/lib/services/catalogue-service', () => ({
  getPosCatalogue: vi.fn(),
}));

import { getPosCatalogue } from '@/lib/services/catalogue-service';
import { buildCatalogPosExport } from '@/lib/services/catalog-pos-export.service';

describe('buildCatalogPosExport', () => {
  beforeEach(() => {
    vi.mocked(getPosCatalogue).mockResolvedValue({
      items: [
        {
          id: 'fly-std',
          name: 'Flyer',
          category: 'petit-format',
          prixDepart: 500,
          unit: 'pièce',
          priceSource: 'database',
          profileStatus: 'published',
          visiblePos: true,
        },
        {
          id: 'hidden',
          name: 'Masqué',
          category: 'finitions',
          prixDepart: 100,
          unit: 'pièce',
          priceSource: 'database',
          profileStatus: 'draft',
          visiblePos: false,
        },
      ],
      categories: [],
      catLabels: {},
      source: 'database-primary',
      coverage: { mode: 'database-primary' },
      updatedAt: new Date().toISOString(),
    } as unknown as Awaited<ReturnType<typeof getPosCatalogue>>);
  });

  it('exporte uniquement les articles visibles POS', async () => {
    const payload = await buildCatalogPosExport('admin');
    expect(payload.itemCount).toBe(1);
    expect(payload.items[0]?.id).toBe('fly-std');
    expect(payload.source).toBe('database-primary');
  });
});
