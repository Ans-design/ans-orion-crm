import { prisma } from '@/lib/prisma';
import { CATALOGUE } from '@/lib/data/catalogue';
import { expandAllCatalogMaterials } from './materials-catalog-expander';
import { listBaseMaterials } from '../pricing/base-material.repository';
import { auditMaterialsUsedInPos } from '../pricing/materials-used-pos.audit';
import { buildMaterialKey, parseMaterialKey } from './material-key';

export type CompletenessRow = {
  family: string;
  material: string;
  grammage: string | null;
  unit: string | null;
  format: string | null;
  linkedArticles: string[];
  inOptionsChips: boolean;
  inBaseDb: boolean;
  inFormula: boolean;
  hasPurchasePrice: boolean;
  hasBasePrintPrice: boolean;
  hasMaxPrice: boolean;
  status: 'complet' | 'prix_manquant' | 'matiere_absente_db' | 'utilise_pos_non_publie' | 'doublon_probable' | 'a_verifier' | 'legacy_non_utilise';
  anomaly: string | null;
  recommendedAction: string;
};

function norm(s: string) {
  return s.trim().toLowerCase();
}

export async function buildMaterialsCompletenessMatrix(): Promise<{
  rows: CompletenessRow[];
  summary: { total: number; complete: number; missingPrice: number; missingInDb: number; withAnomalies: number };
}> {
  const [posAudit, baseResult] = await Promise.all([
    auditMaterialsUsedInPos(),
    listBaseMaterials({ activeOnly: false }),
  ]);

  const baseByKey = new Map(baseResult.rows.map((r) => [norm(r.materialKey), r]));
  const baseByLabel = new Map(baseResult.rows.map((r) => [norm(r.label), r]));
  const catalog = expandAllCatalogMaterials();
  const catalogKeys = new Set(catalog.map((c) => norm(c.materialKey)));

  const rows: CompletenessRow[] = [];

  for (const c of catalog) {
    const dbRow = baseByKey.get(norm(c.materialKey)) ?? baseByLabel.get(norm(c.label));
    const posRow = posAudit.materials.find(
      (p) => norm(p.key) === norm(c.materialKey) || norm(p.label) === norm(c.label),
    );

    const hasPurchase = dbRow?.purchasePrice != null;
    const hasBase = dbRow?.basePrintPrice != null;
    const hasMax = dbRow?.maxPrice != null;
    const inDb = Boolean(dbRow);
    const linked = posRow?.linkedArticles ?? [];

    let status: CompletenessRow['status'] = 'a_verifier';
    let anomaly: string | null = null;
    let action = 'Vérifier';

    if (!inDb) {
      status = 'matiere_absente_db';
      anomaly = 'Absente Matières DB';
      action = 'Importer depuis catalogue ou sync';
    } else if (!hasBase && !hasMax) {
      status = 'prix_manquant';
      anomaly = 'Prix base impression sans finition manquant';
      action = 'Compléter prix base';
    } else if (hasBase && hasPurchase && hasMax) {
      status = 'complet';
      action = 'OK';
    } else {
      status = 'prix_manquant';
      anomaly = 'Prix partiellement renseigné';
      action = 'Compléter prix manquants';
    }

    if (dbRow?.publicationStatus !== 'published' && posRow && linked.length) {
      status = 'utilise_pos_non_publie';
      anomaly = 'Utilisé POS mais non publié';
      action = 'Publier après complétion prix';
    }

    rows.push({
      family: c.family,
      material: c.label,
      grammage: c.grammage,
      unit: c.unitStandard,
      format: null,
      linkedArticles: linked,
      inOptionsChips: Boolean(posRow),
      inBaseDb: inDb,
      inFormula: false,
      hasPurchasePrice: hasPurchase,
      hasBasePrintPrice: hasBase,
      hasMaxPrice: hasMax,
      status,
      anomaly,
      recommendedAction: action,
    });
  }

  for (const p of posAudit.materials) {
    if (catalogKeys.has(norm(p.key)) || catalogKeys.has(norm(p.label))) continue;
    const dbRow = baseByKey.get(norm(p.key)) ?? baseByLabel.get(norm(p.label));
    rows.push({
      family: p.family,
      material: p.label,
      grammage: p.grammage,
      unit: p.unit,
      format: p.format,
      linkedArticles: p.linkedArticles,
      inOptionsChips: true,
      inBaseDb: Boolean(dbRow),
      inFormula: false,
      hasPurchasePrice: dbRow?.purchasePrice != null,
      hasBasePrintPrice: dbRow?.basePrintPrice != null,
      hasMaxPrice: dbRow?.maxPrice != null,
      status: dbRow ? (dbRow.basePrintPrice != null ? 'complet' : 'prix_manquant') : 'matiere_absente_db',
      anomaly: dbRow ? null : 'Matière POS absente du catalogue étendu',
      recommendedAction: dbRow ? 'Compléter prix' : 'Ajouter à Matières DB',
    });
  }

  rows.sort((a, b) => a.material.localeCompare(b.material, 'fr'));

  return {
    rows,
    summary: {
      total: rows.length,
      complete: rows.filter((r) => r.status === 'complet').length,
      missingPrice: rows.filter((r) => r.status === 'prix_manquant').length,
      missingInDb: rows.filter((r) => r.status === 'matiere_absente_db').length,
      withAnomalies: rows.filter((r) => r.anomaly).length,
    },
  };
}

export async function getMaterialUsage(materialId: string) {
  const row = await prisma.baseMaterial.findUnique({ where: { id: materialId } }).catch(() => null);
  if (!row) return { material: null, linkedArticles: [], formulas: [], stockItem: null };

  const { baseKey } = parseMaterialKey(row.materialKey);
  const linkedArticles = CATALOGUE.filter((a) => {
    const name = a.name.toLowerCase();
    return name.includes(baseKey) || name.includes(row.label.toLowerCase());
  }).map((a) => ({ id: a.id, name: a.name }));

  let stockItem = null;
  const stockItemId = (row as { stockItemId?: string | null }).stockItemId;
  if (stockItemId) {
    stockItem = await prisma.stockItem.findUnique({ where: { id: stockItemId } }).catch(() => null);
  }

  return {
    material: row,
    linkedArticles,
    formulas: [],
    stockItem,
  };
}

export async function createMaterialFromStock(stockItemId: string) {
  const { linkStockToMaterial } = await import('../stock/stock-material-link.service');
  return linkStockToMaterial(stockItemId);
}
