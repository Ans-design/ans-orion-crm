/**
 * Service Estimation temps — grille vitesse / durée par article & tâche.
 */

import { prisma } from '@/lib/prisma';
import {
  ESTIMATION_TEMPS_CONFIG_KEY,
  ESTIMATION_TASK_KEYS,
  buildDefaultEstimationTempsConfig,
  computeDurationMinutes,
  ensureRatesForArticles,
  formatDurationMinutes,
  normalizeCapacity,
  normalizeRate,
  type ArticleTaskTimeRate,
  type EstimationTempsConfig,
} from '@/lib/data/estimation-temps-config';

export type EstimationArticleOption = {
  articleId: string;
  articleLabel: string;
  family: string;
};

export type EstimationTempsPayload = {
  config: EstimationTempsConfig;
  taskKeys: typeof ESTIMATION_TASK_KEYS;
  articles: EstimationArticleOption[];
  source: 'db' | 'defaults';
};

function parseConfig(raw: unknown): EstimationTempsConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<EstimationTempsConfig>;
  if (!Array.isArray(o.rates)) return null;
  return {
    version: 1,
    updatedAt: typeof o.updatedAt === 'string' ? o.updatedAt : new Date().toISOString(),
    rates: o.rates.map((r, i) => normalizeRate(r as ArticleTaskTimeRate, (i + 1) * 10)),
    capacity: normalizeCapacity(o.capacity),
  };
}

export async function getEstimationTempsConfig(): Promise<{
  config: EstimationTempsConfig;
  source: 'db' | 'defaults';
}> {
  try {
    const row = await prisma.systemConfig.findUnique({
      where: { configKey: ESTIMATION_TEMPS_CONFIG_KEY },
    });
    const parsed = row?.data ? parseConfig(row.data) : null;
    if (parsed && parsed.rates.length > 0) {
      return { config: parsed, source: 'db' };
    }
  } catch {
    /* fallback defaults */
  }
  return { config: buildDefaultEstimationTempsConfig(), source: 'defaults' };
}

export async function saveEstimationTempsConfig(
  config: EstimationTempsConfig,
): Promise<EstimationTempsConfig> {
  const normalized: EstimationTempsConfig = {
    version: 1,
    updatedAt: new Date().toISOString(),
    rates: config.rates
      .map((r, i) => normalizeRate(r, (i + 1) * 10))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.articleLabel.localeCompare(b.articleLabel)),
    capacity: normalizeCapacity(config.capacity),
  };

  await prisma.systemConfig.upsert({
    where: { configKey: ESTIMATION_TEMPS_CONFIG_KEY },
    create: {
      configKey: ESTIMATION_TEMPS_CONFIG_KEY,
      data: normalized as object,
    },
    update: {
      data: normalized as object,
    },
  });

  return normalized;
}

async function listCatalogueArticles(): Promise<EstimationArticleOption[]> {
  try {
    const profiles = await prisma.articlePricingProfile.findMany({
      where: { active: true },
      select: { articleId: true, articleLabel: true, family: true },
      orderBy: [{ family: 'asc' }, { articleLabel: 'asc' }],
      take: 400,
    });
    if (profiles.length > 0) {
      return profiles.map((p) => ({
        articleId: p.articleId,
        articleLabel: p.articleLabel,
        family: p.family,
      }));
    }
  } catch {
    /* ignore */
  }

  const { config } = await getEstimationTempsConfig();
  const map = new Map<string, EstimationArticleOption>();
  for (const r of config.rates) {
    if (!map.has(r.articleId)) {
      map.set(r.articleId, {
        articleId: r.articleId,
        articleLabel: r.articleLabel,
        family: r.family,
      });
    }
  }
  return [...map.values()];
}

export async function getEstimationTempsPayload(): Promise<EstimationTempsPayload> {
  const [{ config, source }, articles] = await Promise.all([
    getEstimationTempsConfig(),
    listCatalogueArticles(),
  ]);

  // Catalogue + seed : chaque article a un parcours (templates famille).
  const articlePool =
    articles.length > 0
      ? articles
      : (() => {
          const map = new Map<string, EstimationArticleOption>();
          for (const r of config.rates) {
            if (!map.has(r.articleId)) {
              map.set(r.articleId, {
                articleId: r.articleId,
                articleLabel: r.articleLabel,
                family: r.family,
              });
            }
          }
          return [...map.values()];
        })();

  const { rates, filledCount } = ensureRatesForArticles(config.rates, articlePool);

  return {
    config: {
      ...config,
      rates,
    },
    taskKeys: ESTIMATION_TASK_KEYS,
    articles: articlePool,
    source: filledCount > 0 && source === 'db' ? 'defaults' : source,
  };
}

/** Après mutation : re-complète les articles vides (catalogue). */
export async function getEstimationTempsConfigFilled(
  config: EstimationTempsConfig,
): Promise<EstimationTempsConfig> {
  const articles = await listCatalogueArticles();
  const pool =
    articles.length > 0
      ? articles
      : [...new Map(
          config.rates.map((r) => [
            r.articleId,
            {
              articleId: r.articleId,
              articleLabel: r.articleLabel,
              family: r.family,
            } satisfies EstimationArticleOption,
          ]),
        ).values()];
  const { rates } = ensureRatesForArticles(config.rates, pool);
  return { ...config, rates };
}

export async function upsertEstimationRate(
  rate: ArticleTaskTimeRate,
): Promise<EstimationTempsConfig> {
  const { config } = await getEstimationTempsConfig();
  const next = normalizeRate(rate, rate.sortOrder || (config.rates.length + 1) * 10);
  const idx = config.rates.findIndex((r) => r.id === next.id);
  const rates = [...config.rates];
  if (idx >= 0) rates[idx] = next;
  else rates.push(next);
  return saveEstimationTempsConfig({ ...config, rates });
}

export async function deleteEstimationRate(id: string): Promise<EstimationTempsConfig> {
  const { config } = await getEstimationTempsConfig();
  return saveEstimationTempsConfig({
    ...config,
    rates: config.rates.filter((r) => r.id !== id),
  });
}

export async function resetEstimationTempsToDefaults(): Promise<EstimationTempsConfig> {
  return saveEstimationTempsConfig(buildDefaultEstimationTempsConfig());
}

/** Somme des durées actives pour un article (qty pièces ou m²). */
export async function estimateArticleTotalMinutes(
  articleId: string,
  qty: number,
): Promise<{ totalMin: number; label: string; lines: Array<{ taskKey: string; minutes: number }> }> {
  const { config } = await getEstimationTempsConfig();
  const lines = config.rates
    .filter((r) => r.active && r.articleId === articleId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((r) => ({
      taskKey: r.taskKey,
      minutes: computeDurationMinutes(r, qty),
    }));
  const totalMin = lines.reduce((s, l) => s + l.minutes, 0);
  return {
    totalMin,
    label: formatDurationMinutes(totalMin),
    lines,
  };
}
