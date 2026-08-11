import { prisma } from '@/lib/prisma';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';

export type BackofficeArticleListParams = {
  search?: string;
  status?: string;
  family?: string;
  page?: number;
  limit?: number;
};

export async function listBackofficeArticles(params: BackofficeArticleListParams = {}) {
  const page = Math.max(1, params.page ?? 1);
  const limit = Math.min(100, Math.max(1, params.limit ?? 40));
  const skip = (page - 1) * limit;

  const where: {
    status?: string;
    family?: string;
    OR?: { articleId?: { contains: string }; articleLabel?: { contains: string } }[];
  } = {};

  if (params.status && params.status !== 'all') {
    where.status = params.status;
  }
  if (params.family && params.family !== 'all') {
    where.family = params.family;
  }
  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { articleId: { contains: q } },
      { articleLabel: { contains: q } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.articlePricingProfile.findMany({
      where,
      orderBy: [{ family: 'asc' }, { articleLabel: 'asc' }],
      skip,
      take: limit,
      select: {
        articleId: true,
        articleLabel: true,
        family: true,
        calculationType: true,
        status: true,
        prixBase: true,
        qtyMin: true,
        saleUnit: true,
        updatedAt: true,
        discountTiers: {
          where: { active: true },
          select: { unitPrice: true, discountPercent: true, active: true, minQty: true },
          orderBy: { minQty: 'asc' },
          take: 3,
        },
        formulaVersions: {
          select: { version: true, status: true },
          orderBy: { version: 'desc' },
          take: 1,
        },
        optionGroups: {
          where: { active: true },
          select: { visiblePos: true, label: true },
          take: 8,
        },
        _count: {
          select: {
            materialPrices: true,
            optionGroups: true,
            stockRules: true,
            formulaVersions: true,
          },
        },
      },
    }),
    prisma.articlePricingProfile.count({ where }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

const articleDetailSelect = {
  articleId: true,
  articleLabel: true,
  family: true,
  calculationType: true,
  saleUnit: true,
  status: true,
  prixBase: true,
  prixM2: true,
  prixCm2: true,
  qtyMin: true,
  active: true,
  source: true,
  createdAt: true,
  updatedAt: true,
  discountTiers: { orderBy: { minQty: 'asc' as const } },
  formulaVersions: { orderBy: { version: 'desc' as const }, take: 3 },
  optionGroups: {
    include: { values: { orderBy: { sortOrder: 'asc' as const } } },
    orderBy: { sortOrder: 'asc' as const },
  },
  materialPrices: { orderBy: { label: 'asc' as const } },
  urgencyRules: { orderBy: { sortOrder: 'asc' as const } },
  stockRules: { where: { active: true } },
  _count: {
    select: {
      materialPrices: true,
      optionGroups: true,
      stockRules: true,
      formulaVersions: true,
    },
  },
};

export type CreateBackofficeArticleInput = {
  articleId: string;
  articleLabel?: string;
  family?: string;
  calculationType?: string;
  saleUnit?: string;
  prixBase?: number | null;
  prixM2?: number | null;
  prixCm2?: number | null;
  qtyMin?: number | null;
  status?: string;
};

export type UpdateBackofficeArticleInput = Partial<CreateBackofficeArticleInput> & {
  active?: boolean;
};

export async function getBackofficeArticle(articleId: string) {
  return prisma.articlePricingProfile.findUnique({
    where: { articleId },
    select: articleDetailSelect,
  });
}

export async function createBackofficeArticle(input: CreateBackofficeArticleInput) {
  const articleId = input.articleId?.trim();
  if (!articleId) throw new Error('articleId requis');

  const existing = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (existing) throw new Error(`Article déjà existant : ${articleId}`);

  const catalogue = findCatalogueItem(articleId);

  return prisma.articlePricingProfile.create({
    data: {
      articleId,
      articleLabel: input.articleLabel?.trim() || catalogue?.name || articleId,
      family: input.family?.trim() || catalogue?.category || 'autre',
      calculationType: input.calculationType || 'piece',
      saleUnit: input.saleUnit || 'pièce',
      status: input.status || 'draft',
      prixBase: input.prixBase ?? catalogue?.prixDepart ?? null,
      prixM2: input.prixM2 ?? null,
      prixCm2: input.prixCm2 ?? null,
      qtyMin: input.qtyMin ?? null,
      active: true,
      source: 'backoffice-api',
    },
    select: articleDetailSelect,
  });
}

export async function updateBackofficeArticle(articleId: string, input: UpdateBackofficeArticleInput) {
  const profile = await prisma.articlePricingProfile.findUnique({ where: { articleId } });
  if (!profile) throw new Error('Article introuvable');

  return prisma.articlePricingProfile.update({
    where: { articleId },
    data: {
      ...(input.articleLabel !== undefined && { articleLabel: input.articleLabel.trim() }),
      ...(input.family !== undefined && { family: input.family.trim() }),
      ...(input.calculationType !== undefined && { calculationType: input.calculationType }),
      ...(input.saleUnit !== undefined && { saleUnit: input.saleUnit }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.prixBase !== undefined && { prixBase: input.prixBase }),
      ...(input.prixM2 !== undefined && { prixM2: input.prixM2 }),
      ...(input.prixCm2 !== undefined && { prixCm2: input.prixCm2 }),
      ...(input.qtyMin !== undefined && { qtyMin: input.qtyMin }),
      ...(input.active !== undefined && { active: input.active }),
    },
    select: articleDetailSelect,
  });
}

/** Archive par défaut ; hard=true supprime si aucune commande liée (profil seul). */
export async function deleteBackofficeArticle(articleId: string, opts?: { hard?: boolean }) {
  const profile = await prisma.articlePricingProfile.findUnique({
    where: { articleId },
    include: { _count: { select: { formulaVersions: true, optionGroups: true } } },
  });
  if (!profile) throw new Error('Article introuvable');

  if (opts?.hard) {
    await prisma.articlePricingProfile.delete({ where: { articleId } });
    return { articleId, deleted: true, mode: 'hard' as const };
  }

  const updated = await prisma.articlePricingProfile.update({
    where: { articleId },
    data: { status: 'archived', active: false },
    select: { articleId: true, status: true, active: true },
  });
  return { ...updated, deleted: false, mode: 'archive' as const };
}
