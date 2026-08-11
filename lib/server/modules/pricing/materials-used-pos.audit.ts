/**
 * Audit des matières réellement utilisées dans le POS / moteur prix.
 */
import { CATALOGUE } from '@/lib/data/catalogue';
import { OFFICIAL_MATERIAL_COMPAT } from '@/lib/data/material-compat-official';
import { IMPRESSION_SF_MATERIALS } from '@/lib/data/impression-sf-material-catalog';
import { prisma } from '@/lib/prisma';
import { listBaseMaterials } from './base-material.repository';

export type MaterialUsedInPosRow = {
  key: string;
  label: string;
  family: string;
  grammage: string | null;
  format: string | null;
  unit: string | null;
  linkedArticles: string[];
  sources: string[];
  currentPrice: number | null;
  missingPrice: boolean;
  impactsPrice: boolean;
  impactsStock: boolean;
  visiblePos: boolean;
  active: boolean;
  anomalies: string[];
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

export async function auditMaterialsUsedInPos(): Promise<{
  materials: MaterialUsedInPosRow[];
  summary: { total: number; missingInBaseDb: number; missingPrice: number; withAnomalies: number };
}> {
  const map = new Map<string, MaterialUsedInPosRow>();

  const ensure = (key: string, label: string, family: string, source: string) => {
    const k = norm(key || label);
    if (!k) return;
    const existing = map.get(k) ?? {
      key: key || label,
      label: label || key,
      family,
      grammage: null,
      format: null,
      unit: null,
      linkedArticles: [],
      sources: [],
      currentPrice: null,
      missingPrice: true,
      impactsPrice: true,
      impactsStock: true,
      visiblePos: true,
      active: true,
      anomalies: [],
    };
    if (!existing.sources.includes(source)) existing.sources.push(source);
    map.set(k, existing);
  };

  for (const m of OFFICIAL_MATERIAL_COMPAT) {
    ensure(m.key, m.label, m.family, 'material-compat-official');
  }

  for (const m of IMPRESSION_SF_MATERIALS) {
    ensure(m.id, m.label, 'Petit format', 'impression-sf-material-catalog');
  }

  try {
    const dbMaterials = await prisma.materialCatalog.findMany({
      include: { grammages: true },
    });
    for (const m of dbMaterials) {
      ensure(m.key, m.label, m.family, 'MaterialCatalog');
      for (const g of m.grammages) {
        const gKey = `${m.key}:${g.value}`;
        ensure(gKey, `${m.label} ${g.value}`, m.family, 'GrammageCatalog');
        const row = map.get(norm(gKey));
        if (row) row.grammage = g.value;
      }
    }
  } catch {
    /* DB optionnelle en local */
  }

  try {
    const saleRows = await prisma.salePrice2026.findMany({
      where: { actif: true, material: { not: null } },
      select: { material: true, grammage: true, format: true, salePriceAr: true, productNormalized: true },
      take: 500,
    });
    for (const r of saleRows) {
      if (!r.material) continue;
      ensure(r.material, r.material, 'Import PRIX 2026', 'SalePrice2026');
      const row = map.get(norm(r.material));
      if (row) {
        if (r.grammage) row.grammage = r.grammage;
        if (r.format) row.format = r.format;
        if (r.salePriceAr != null) {
          row.currentPrice = r.salePriceAr;
          row.missingPrice = false;
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const optionValues = await prisma.productOptionValue.findMany({
      where: { active: true },
      include: { group: true },
      take: 2000,
    });
    for (const v of optionValues) {
      const fk = v.group?.fieldKey ?? '';
      if (!/matiere|material|support|papier|grammage/i.test(fk + v.label)) continue;
      const artId = v.group?.articleId;
      ensure(v.valueKey || v.label, v.label, v.group?.label ?? 'Options', 'ProductOptionValue');
      const row = map.get(norm(v.valueKey || v.label));
      if (row && artId && !row.linkedArticles.includes(artId)) {
        row.linkedArticles.push(artId);
      }
    }
  } catch {
    /* ignore */
  }

  for (const art of CATALOGUE) {
    if (art.category?.toLowerCase().includes('textile')) {
      ensure(`textile:${art.id}`, `Textile ${art.name}`, 'Textile', 'catalogue-category');
      const row = map.get(norm(`textile:${art.id}`));
      if (row && !row.linkedArticles.includes(art.id)) row.linkedArticles.push(art.id);
    }
  }

  const { rows: baseMaterials } = await listBaseMaterials();
  const baseKeys = new Set(baseMaterials.map((b) => norm(b.materialKey)));

  for (const row of map.values()) {
    if (!baseKeys.has(norm(row.key)) && !baseKeys.has(norm(row.label))) {
      row.anomalies.push('Matière POS absente du tableau Matières de base');
    }
    if (row.missingPrice) row.anomalies.push('Prix base manquant');
    if (row.visiblePos && !row.active) row.anomalies.push('Visible POS mais inactive');
  }

  const materials = [...map.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  return {
    materials,
    summary: {
      total: materials.length,
      missingInBaseDb: materials.filter((m) => m.anomalies.some((a) => a.includes('absente'))).length,
      missingPrice: materials.filter((m) => m.missingPrice).length,
      withAnomalies: materials.filter((m) => m.anomalies.length > 0).length,
    },
  };
}
