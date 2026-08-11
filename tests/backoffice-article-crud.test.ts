import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    articlePricingProfile: {
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      count: mocks.count,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}));

vi.mock('@/lib/data/catalogue-meta', () => ({
  findCatalogueItem: vi.fn(() => ({ id: 'fly-std', name: 'Flyer', category: 'flyer', prixDepart: 5000 })),
}));

import {
  createBackofficeArticle,
  updateBackofficeArticle,
  deleteBackofficeArticle,
} from '@/lib/services/backoffice-article-service';

describe('backoffice-article-service CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createBackofficeArticle refuse un doublon', async () => {
    mocks.findUnique.mockResolvedValue({ articleId: 'fly-std' });
    await expect(createBackofficeArticle({ articleId: 'fly-std' })).rejects.toThrow(/déjà existant/);
  });

  it('createBackofficeArticle enrichit depuis le catalogue', async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ articleId: 'fly-std', articleLabel: 'Flyer', family: 'flyer' });
    const row = await createBackofficeArticle({ articleId: 'fly-std' });
    expect(mocks.create).toHaveBeenCalled();
    expect(row.articleId).toBe('fly-std');
  });

  it('updateBackofficeArticle met à jour le libellé', async () => {
    mocks.findUnique.mockResolvedValue({ articleId: 'fly-std' });
    mocks.update.mockResolvedValue({ articleId: 'fly-std', articleLabel: 'Flyer A5' });
    const row = await updateBackofficeArticle('fly-std', { articleLabel: 'Flyer A5' });
    expect(row.articleLabel).toBe('Flyer A5');
  });

  it('deleteBackofficeArticle archive par défaut', async () => {
    mocks.findUnique.mockResolvedValue({ articleId: 'fly-std', _count: {} });
    mocks.update.mockResolvedValue({ articleId: 'fly-std', status: 'archived', active: false });
    const result = await deleteBackofficeArticle('fly-std');
    expect(result.mode).toBe('archive');
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
