import { normalizePaperInConfig } from '@/lib/data/paper-material';
import { findGrandFormatStockItem, findPaperStockItem } from '@/lib/services/stock-service';
import {
  computeMarginRate,
  getMaterialCostPerM2,
} from '@/lib/services/sale-price-service';
import { computeGrandFormatM2 } from '@/lib/pricing/format-dimensions';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import { BACHE_CANONICAL_ID } from '@/lib/pos/bache-catalog';
import { bacheEvalToGfBillable } from '@/lib/grand-format/bache-bridge';
import { evaluateBache } from '@/lib/grand-format/bache-rules';

export type MarginInsight = {
  unitCostEst: number | null;
  marginAmount: number | null;
  marginRate: number | null;
  marginRatePct: number | null;
  costSource: string | null;
};

/** Estimation coût unitaire + marge — réservé direction (pos:view_margin) */
export async function estimateMarginForLine(
  articleId: string,
  config: Record<string, unknown>,
  prixUnitaire: number,
): Promise<MarginInsight | null> {
  if (prixUnitaire <= 0) return null;

  const { config: normalized } = normalizePaperInConfig(config);
  let unitCostEst: number | null = null;
  let costSource: string | null = null;

  const paperType = String(normalized.paperType || normalized.matiere || '').trim();
  const grammage = String(normalized.paperWeight || normalized.grammage || '').trim();

  if (paperType && grammage && !paperType.toLowerCase().includes('personnalis')) {
    const item = await findPaperStockItem(paperType, grammage);
    if (item?.unitCost && item.unitCost > 0) {
      unitCostEst = item.unitCost;
      costSource = `Stock papier · ${item.label}`;
    }
  }

  if (unitCostEst == null && (articleId.startsWith('gf-') || normalized.matiere)) {
    const matiere = String(normalized.matiere || '').trim();
    let gfStored = normalized._gfBillable as GrandFormatBillableResult | undefined;
    if (!gfStored && articleId === BACHE_CANONICAL_ID) {
      const bacheStored = normalized._bacheEval as ReturnType<typeof evaluateBache> | undefined;
      if (bacheStored) {
        gfStored = bacheEvalToGfBillable(bacheStored);
      } else {
        gfStored = bacheEvalToGfBillable(evaluateBache(normalized));
      }
    }
    const m2 = gfStored?.surfaceFactureeM2 ?? gfStored?.surfaceLaizeM2 ?? computeGrandFormatM2(normalized);
    if (matiere && m2) {
      const gfItem = await findGrandFormatStockItem(matiere);
      if (gfItem?.unitCost) {
        unitCostEst = gfItem.unitCost * m2;
        costSource = `Stock GF · ${gfItem.label} (${m2} m² facturés)`;
      } else {
        const costM2 = await getMaterialCostPerM2(matiere);
        if (costM2) {
          unitCostEst = costM2 * m2;
          costSource = `Fournisseur · ${matiere} (${m2} m² facturés)`;
        }
      }
    } else if (articleId.startsWith('gf-') && m2) {
      const gfItem = await findGrandFormatStockItem(articleId);
      if (gfItem?.unitCost) {
        unitCostEst = gfItem.unitCost * m2;
        costSource = `Stock GF · ${gfItem.label} (${m2} m² facturés)`;
      }
    }
  }

  if (unitCostEst == null || unitCostEst <= 0) return null;

  const marginAmount = Math.round(prixUnitaire - unitCostEst);
  const marginRate = computeMarginRate(prixUnitaire, unitCostEst);

  return {
    unitCostEst: Math.round(unitCostEst),
    marginAmount,
    marginRate,
    marginRatePct: Math.round(marginRate * 1000) / 10,
    costSource,
  };
}
