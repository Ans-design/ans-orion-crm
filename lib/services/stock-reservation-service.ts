import { CATALOGUE } from '@/lib/data/catalogue';
import { isCustomMaterial, normalizePaperInConfig, PAPER_LEGACY_PAIRS } from '@/lib/data/paper-material';
import { computeGrandFormatM2 } from '@/lib/pricing/format-dimensions';
import type { PrismaTx } from '@/lib/services/SequenceService';
import {
  findGrandFormatStockItem,
  findPaperStockItem,
  reserveStock,
  stockAvailable,
} from '@/lib/services/stock-service';

const GF_ARTICLE_MATERIAL_HINTS: Record<string, string[]> = {
  'gf-vinyl-blanc': ['Vinyle blanc brillant', 'Vinyle'],
  'gf-vinyl-transp': ['Vinyle transparent'],
  'gf-dosbleu': ['Dos bleu', 'dos bleu'],
  'gf-bache': ['Bâche', '440', 'mesh', '320'],
  'gf-bache440': ['Bâche', '440'],
  'gf-mesh': ['mesh', 'Mesh', '270'],
  'gf-bache320': ['Bâche', '320'],
  'gf-tissu': ['Tissu', 'drapeau'],
  'gf-oneway': ['One-Way', 'Vision'],
  'gf-reflechissant': ['réfléchissant', 'Reflechissant'],
  'gf-frosted': ['Frosted', 'sablé'],
  'gf-photo': ['Photo', 'PP film'],
  'gf-pvc': ['PVC', 'Forex'],
  'gf-pvc3': ['PVC', '3mm'],
  'gf-pvc6': ['PVC', '5mm', '6mm'],
  'gf-plexi': ['Plexi', 'Plexiglas'],
  'gf-plexi3': ['Plexi', '3mm'],
  'gf-plexi5': ['Plexi', '5mm'],
  'gf-acrylic': ['Acrylic', 'Acrylique'],
  'gf-pp': ['PP film'],
};

export type StockReservationOutcome = {
  stockItemId: string;
  sku: string;
  label: string;
  quantity: number;
  unit: string;
  status: 'reserved' | 'skipped';
  reason?: string;
  reservationId?: string;
};

export type DevisLigneForReservation = {
  articleId: string;
  articleLabel: string;
  category: string;
  configSnapshot: unknown;
  quantity: number;
};

type ResolvedNeed = {
  stockItemId: string;
  sku: string;
  label: string;
  quantity: number;
  unit: string;
  source: 'paper' | 'grand_format';
};

function asConfig(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

async function resolvePaperNeeds(
  config: Record<string, unknown>,
  orderQty: number,
  tx: PrismaTx,
): Promise<ResolvedNeed[]> {
  const needs: ResolvedNeed[] = [];
  const seen = new Set<string>();

  for (const { matiereKey, typeKey, weightKey } of PAPER_LEGACY_PAIRS) {
    const paperType = String(config[typeKey] ?? config[matiereKey] ?? '').trim();
    const grammage = String(config[weightKey] ?? '').trim();
    if (!paperType || !grammage || isCustomMaterial(paperType) || isCustomMaterial(grammage)) continue;

    const dedupeKey = `${paperType}|${grammage}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const item = await findPaperStockItem(paperType, grammage, tx);
    if (!item) continue;

    needs.push({
      stockItemId: item.id,
      sku: item.sku,
      label: item.label,
      quantity: orderQty,
      unit: item.unit,
      source: 'paper',
    });
  }

  return needs;
}

async function resolveGrandFormatNeed(
  articleId: string,
  config: Record<string, unknown>,
  orderQty: number,
  tx: PrismaTx,
): Promise<ResolvedNeed | null> {
  const candidates: string[] = [];
  const matiere = String(config.matiere || config.support || '').trim();
  if (matiere && !isCustomMaterial(matiere)) candidates.push(matiere);

  for (const hint of GF_ARTICLE_MATERIAL_HINTS[articleId] ?? []) {
    candidates.push(hint);
  }

  const article = CATALOGUE.find((a) => a.id === articleId);
  if (article?.name) candidates.push(article.name);

  let item = null;
  for (const candidate of candidates) {
    item = await findGrandFormatStockItem(candidate, tx);
    if (item) break;
  }
  if (!item) return null;

  const m2 = computeGrandFormatM2(config);
  const unit = item.unit.toLowerCase();
  let quantity = orderQty;
  if (unit.includes('m²') || unit.includes('m2')) {
    if (!m2) return null;
    quantity = parseFloat((m2 * orderQty).toFixed(4));
  }

  return {
    stockItemId: item.id,
    sku: item.sku,
    label: item.label,
    quantity,
    unit: item.unit,
    source: 'grand_format',
  };
}

export async function resolveStockNeedsForLigne(
  ligne: DevisLigneForReservation,
  tx: PrismaTx,
): Promise<ResolvedNeed[]> {
  const rawConfig = asConfig(ligne.configSnapshot);
  const { config } = normalizePaperInConfig(rawConfig);
  const orderQty = Math.max(1, ligne.quantity);
  const needs: ResolvedNeed[] = [];
  const article = CATALOGUE.find((a) => a.id === ligne.articleId);

  const isGrandFormat =
    ligne.category === 'grand_format' ||
    ligne.articleId.startsWith('gf-') ||
    article?.category === 'grand_format';

  if (isGrandFormat) {
    const gf = await resolveGrandFormatNeed(ligne.articleId, config, orderQty, tx);
    if (gf) needs.push(gf);
  }

  const paperNeeds = await resolvePaperNeeds(config, orderQty, tx);
  needs.push(...paperNeeds);

  return needs;
}

export async function reserveStockForDevisAccept(
  tx: PrismaTx,
  params: {
    devisId: string;
    commandeId: string;
    devisNumero: string;
    commandeNumero: string;
    lignes: DevisLigneForReservation[];
  },
): Promise<StockReservationOutcome[]> {
  const aggregated = new Map<string, ResolvedNeed>();

  for (const ligne of params.lignes) {
    const needs = await resolveStockNeedsForLigne(ligne, tx);
    for (const need of needs) {
      const prev = aggregated.get(need.stockItemId);
      if (prev) {
        prev.quantity += need.quantity;
      } else {
        aggregated.set(need.stockItemId, { ...need });
      }
    }
  }

  const outcomes: StockReservationOutcome[] = [];

  for (const need of aggregated.values()) {
    const item = await tx.stockItem.findUnique({ where: { id: need.stockItemId } });
    if (!item) {
      outcomes.push({
        stockItemId: need.stockItemId,
        sku: need.sku,
        label: need.label,
        quantity: need.quantity,
        unit: need.unit,
        status: 'skipped',
        reason: 'Article stock introuvable',
      });
      continue;
    }

    const available = stockAvailable(item);
    if (need.quantity > available) {
      outcomes.push({
        stockItemId: need.stockItemId,
        sku: item.sku,
        label: item.label,
        quantity: need.quantity,
        unit: need.unit,
        status: 'skipped',
        reason: `Stock insuffisant (${Math.floor(available)} ${item.unit} dispo, ${need.quantity} requis)`,
      });
      continue;
    }

    const reservation = await reserveStock(
      {
        stockItemId: need.stockItemId,
        quantity: need.quantity,
        commandeId: params.commandeId,
        devisId: params.devisId,
        unit: need.unit,
        reference: params.commandeNumero,
        notes: `Réservation acceptation devis ${params.devisNumero} → ${params.commandeNumero}`,
      },
      tx,
    );

    outcomes.push({
      stockItemId: need.stockItemId,
      sku: item.sku,
      label: item.label,
      quantity: need.quantity,
      unit: need.unit,
      status: 'reserved',
      reservationId: reservation.id,
    });
  }

  return outcomes;
}

export { computeGrandFormatM2 } from '@/lib/pricing/format-dimensions';
