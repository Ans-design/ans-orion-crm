/**
 * Détection d’anomalies prix textile.
 */
import { prisma } from '@/lib/prisma';
import { TEXTILE_CATALOGUE_IDS, isLambahoanyArticleId } from '@/lib/pricing/textile-ids';
import { findCatalogueItem } from '@/lib/data/catalogue-meta';

export type TextileAnomaly = {
  id: string;
  level: 'error' | 'warn' | 'info';
  module: 'textile';
  articleId: string;
  articleLabel: string;
  message: string;
  action: string;
  status: 'open';
};

export async function scanTextileAnomalies(): Promise<TextileAnomaly[]> {
  const anomalies: TextileAnomaly[] = [];
  const push = (a: Omit<TextileAnomaly, 'status' | 'module'>) => {
    anomalies.push({ ...a, module: 'textile', status: 'open' });
  };

  const [supports, markings, labors, rules, tiers] = await Promise.all([
    prisma.textileBaseSupportPrice.findMany({ where: { deletedAt: null } }),
    prisma.textileMarkingPrice.findMany({ where: { deletedAt: null } }),
    prisma.textileLaborPrice.findMany({ where: { deletedAt: null } }),
    prisma.textilePricingRule.findMany({ where: { deletedAt: null } }),
    prisma.textileDiscountTier.findMany({ where: { deletedAt: null } }),
  ]);

  for (const id of TEXTILE_CATALOGUE_IDS) {
    const art = findCatalogueItem(id);
    const label = art?.name ?? id;
    const rule = rules.find((r) => r.articleId === id && r.active && r.status === 'published');

    if (!rule) {
      push({
        id: `no-rule:${id}`,
        level: 'error',
        articleId: id,
        articleLabel: label,
        message: 'Article visible POS sans règle textile publiée',
        action: 'Créer une règle dans Admin Textile → Règles',
      });
    }

    const articleSupports = supports.filter((s) => s.articleId === id && s.active && s.status === 'published');
    if (isLambahoanyArticleId(id)) {
      const m2 = articleSupports.filter((s) => /m²|m2/i.test(s.unit) && s.prixSupportVierge > 0);
      if (!m2.length) {
        push({
          id: `lamba-m2:${id}`,
          level: 'error',
          articleId: id,
          articleLabel: label,
          message: 'Lambahoany sans prix m²',
          action: 'Ajouter un support unit=m² avec prix > 0',
        });
      }
    } else if (!articleSupports.length) {
      push({
        id: `no-support:${id}`,
        level: 'error',
        articleId: id,
        articleLabel: label,
        message: 'Support vierge manquant',
        action: 'Ajouter un prix support vierge (matière + taille)',
      });
    }

    for (const s of articleSupports) {
      if (s.prixSupportVierge <= 0) {
        push({
          id: `zero-support:${s.id}`,
          level: 'error',
          articleId: id,
          articleLabel: label,
          message: `Prix support nul ou négatif (${s.matiere ?? ''} ${s.taille ?? ''})`,
          action: 'Corriger le prix support vierge',
        });
      }
      if (!s.unit) {
        push({
          id: `unit-support:${s.id}`,
          level: 'warn',
          articleId: id,
          articleLabel: label,
          message: 'Unité manquante sur support textile',
          action: 'Renseigner unité pièce ou m²',
        });
      }
    }
  }

  const publishedMarkings = markings.filter((m) => m.active && m.status === 'published');
  if (!publishedMarkings.length) {
    push({
      id: 'no-markings',
      level: 'error',
      articleId: '*',
      articleLabel: 'Textile',
      message: 'Aucun prix marquage publié',
      action: 'Importer ou créer des prix marquage',
    });
  }
  for (const m of publishedMarkings) {
    if (m.prixMarquage < 0) {
      push({
        id: `neg-mark:${m.id}`,
        level: 'error',
        articleId: '*',
        articleLabel: m.technique,
        message: 'Prix marquage négatif',
        action: 'Corriger le prix marquage',
      });
    }
  }

  const publishedLabors = labors.filter((l) => l.active && l.status === 'published');
  if (!publishedLabors.length) {
    push({
      id: 'no-labor',
      level: 'warn',
      articleId: '*',
      articleLabel: 'Textile',
      message: 'Main d’œuvre manquante',
      action: 'Ajouter au moins une ligne main d’œuvre (Tous)',
    });
  }

  // Doublons supports
  const supportKeys = new Map<string, string[]>();
  for (const s of supports.filter((x) => !x.deletedAt && x.active)) {
    const key = `${s.articleId}|${(s.matiere ?? '').toLowerCase()}|${(s.taille ?? '').toLowerCase()}|${(s.couleur ?? '').toLowerCase()}|${s.unit}`;
    const list = supportKeys.get(key) ?? [];
    list.push(s.id);
    supportKeys.set(key, list);
  }
  for (const [key, ids] of supportKeys) {
    if (ids.length > 1) {
      push({
        id: `dup-support:${key}`,
        level: 'warn',
        articleId: key.split('|')[0]!,
        articleLabel: key,
        message: `Doublon support textile (${ids.length} lignes)`,
        action: 'Archiver les doublons, garder une ligne',
      });
    }
  }

  // Doublons marquage
  const markKeys = new Map<string, string[]>();
  for (const m of markings.filter((x) => !x.deletedAt && x.active)) {
    const key = `${m.technique}|${m.tailleMarquage ?? ''}|${m.zoneMarquage ?? ''}`;
    const list = markKeys.get(key) ?? [];
    list.push(m.id);
    markKeys.set(key, list);
  }
  for (const [key, ids] of markKeys) {
    if (ids.length > 1) {
      push({
        id: `dup-mark:${key}`,
        level: 'warn',
        articleId: '*',
        articleLabel: key,
        message: `Doublon prix marquage (${ids.length} lignes)`,
        action: 'Archiver les doublons marquage',
      });
    }
  }

  // Paliers incohérents
  for (const t of tiers.filter((x) => x.active && !x.deletedAt)) {
    if (t.qtyMax != null && t.qtyMax < t.qtyMin) {
      push({
        id: `tier-bad:${t.id}`,
        level: 'error',
        articleId: t.articleId,
        articleLabel: t.articleId,
        message: 'Palier incohérent (max < min)',
        action: 'Corriger QUANTITÉ MAX',
      });
    }
    if (t.valeurRemise < 0) {
      push({
        id: `tier-neg:${t.id}`,
        level: 'error',
        articleId: t.articleId,
        articleLabel: t.articleId,
        message: 'Valeur remise négative',
        action: 'Corriger la valeur de remise',
      });
    }
  }

  // Techniques sans prix (présent dans DB support articles mais marquage vide pour technique seed)
  const techniquesUsed = new Set(
    markings.filter((m) => m.active).map((m) => m.technique.toLowerCase()),
  );
  if (techniquesUsed.size === 0) {
    push({
      id: 'tech-empty',
      level: 'warn',
      articleId: '*',
      articleLabel: 'Textile',
      message: 'Technique sans prix (aucune technique active)',
      action: 'Publier au moins une technique de marquage',
    });
  }

  return anomalies;
}
