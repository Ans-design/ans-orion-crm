/**
 * Détection des doublons catalogue POS (personnalisé, formats, recto/verso…).
 */
import { prisma } from '@/lib/prisma';
import {
  isRedundantPersonalizedArticle,
  resolvePersonalizedCanonical,
} from '@/lib/pos/personalized-article-redundant';
import { isRedundantDirectSalePosSku, resolveDirectSalePosCanonical } from '@/lib/pos/direct-sale-pos-redundant';
import { isRedundantGrandFormatPosCard, resolveGfCanonicalTarget } from '@/lib/pos/grand-format-redundant';
import { isRedundantTiragePhotoArticle } from '@/lib/pos/tirage-photo-redundant';

export type CatalogDuplicateHit = {
  severity: 'critical' | 'warn';
  kind: 'personalized' | 'format' | 'recto_verso' | 'grammage' | 'direct_sale' | 'grand_format' | 'tirage';
  articleId: string;
  label: string;
  suggestedPrimary: string | null;
  status: string;
  active: boolean;
};

export type DetectCatalogDuplicatesResult = {
  critical: number;
  warns: number;
  hits: CatalogDuplicateHit[];
  visiblePublishedEstimate: number;
};

export async function detectCatalogDuplicates(): Promise<DetectCatalogDuplicatesResult> {
  const profiles = await prisma.articlePricingProfile.findMany({
    select: {
      articleId: true,
      articleLabel: true,
      status: true,
      active: true,
    },
  });

  const hits: CatalogDuplicateHit[] = [];

  for (const p of profiles) {
    const id = p.articleId;
    const label = p.articleLabel ?? id;
    const visible = p.active && p.status === 'published';

    if (isRedundantPersonalizedArticle(label, id)) {
      const t = resolvePersonalizedCanonical(label, id);
      hits.push({
        severity: visible ? 'critical' : 'warn',
        kind: 'personalized',
        articleId: id,
        label,
        suggestedPrimary: t?.canonicalId ?? null,
        status: p.status,
        active: p.active,
      });
      continue;
    }

    if (isRedundantDirectSalePosSku(label, id)) {
      hits.push({
        severity: visible ? 'critical' : 'warn',
        kind: 'direct_sale',
        articleId: id,
        label,
        suggestedPrimary: resolveDirectSalePosCanonical(label, id),
        status: p.status,
        active: p.active,
      });
      continue;
    }

    if (isRedundantGrandFormatPosCard(label, id)) {
      hits.push({
        severity: visible ? 'critical' : 'warn',
        kind: 'grand_format',
        articleId: id,
        label,
        suggestedPrimary: resolveGfCanonicalTarget(label, id),
        status: p.status,
        active: p.active,
      });
      continue;
    }

    if (isRedundantTiragePhotoArticle(label, id)) {
      hits.push({
        severity: visible ? 'critical' : 'warn',
        kind: 'tirage',
        articleId: id,
        label,
        suggestedPrimary: 'ph-tirage',
        status: p.status,
        active: p.active,
      });
      continue;
    }

    if (visible && /recto[\s-]?verso|recto\s+standard/i.test(label) && !/^cv-std$/i.test(id)) {
      hits.push({
        severity: 'warn',
        kind: 'recto_verso',
        articleId: id,
        label,
        suggestedPrimary: 'cv-std',
        status: p.status,
        active: p.active,
      });
    }

    if (visible && /\b(A[0-6]|90\s*x\s*90)\b/i.test(label) && /flyer|tirage|b[aâ]che/i.test(label)) {
      hits.push({
        severity: 'warn',
        kind: 'format',
        articleId: id,
        label,
        suggestedPrimary: /flyer/i.test(label) ? 'fly-std' : /tirage/i.test(label) ? 'ph-tirage' : 'gf-bache',
        status: p.status,
        active: p.active,
      });
    }

    if (visible && /\d+\s*g\b/i.test(label) && /personnalis|polo|t-?shirt|sweat/i.test(label)) {
      hits.push({
        severity: 'critical',
        kind: 'grammage',
        articleId: id,
        label,
        suggestedPrimary: resolvePersonalizedCanonical(label, id)?.canonicalId ?? null,
        status: p.status,
        active: p.active,
      });
    }
  }

  const critical = hits.filter((h) => h.severity === 'critical').length;
  const warns = hits.filter((h) => h.severity === 'warn').length;
  const visiblePublishedEstimate = profiles.filter((p) => p.active && p.status === 'published').length;

  return { critical, warns, hits, visiblePublishedEstimate };
}
