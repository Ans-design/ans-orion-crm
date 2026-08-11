/**
 * Charge Admin FinishingPrice → overlays runtime pour moteurs finition / ISF satellites.
 */
import { prisma } from '@/lib/prisma';
import {
  setFinitionRuntimePriceOverrides,
  type FinitionBasePriceKey,
} from '@/lib/finition/finition-price-catalog';

/** Mapping excelId / reference → clé catalogue canonique. */
const FINISHING_TO_BASE_KEY: Array<{
  excelIds: string[];
  references: string[];
  key: FinitionBasePriceKey;
}> = [
  { excelIds: ['FIN-RAINAGE-PLI'], references: ['fin-rainage'], key: 'rainagePerPliA4' },
  { excelIds: ['FIN-PELLI-A4'], references: ['fin-pelliculage'], key: 'pelliculageA4Recto' },
  { excelIds: ['FIN-GAUFRAGE-A4'], references: ['fin-gaufrage'], key: 'gaufrageA4' },
  { excelIds: ['FIN-COINS-50'], references: ['fin-coins'], key: 'coinsArrondisPerSheet' },
  { excelIds: ['FIN-DECOUPE-DROITE'], references: ['fin-decoupe'], key: 'decoupeDroitePapier' },
  { excelIds: ['FIN-VERNIS-A4'], references: ['fin-vernis'], key: 'vernisA4Recto' },
  { excelIds: ['FIN-DORURE-STD-A4', 'FIN-DORURE-A4'], references: ['fin-dorure'], key: 'dorureStandardA4' },
  { excelIds: ['FIN-PLASTI-A4'], references: ['fin-plastification'], key: 'plastificationA4' },
  { excelIds: ['FIN-COLLAGE-SIMPLE-A4'], references: ['fin-collage:simple'], key: 'collageSimpleA4' },
  { excelIds: ['FIN-COLLAGE-CONTRE-A4'], references: ['fin-collage:contre'], key: 'collageContreA4' },
];

let ready = false;
let inflight: Promise<Partial<Record<FinitionBasePriceKey, number>>> | null = null;

export function invalidateFinitionRuntimeCache() {
  ready = false;
  inflight = null;
}

export async function ensureFinitionRuntimePricesReady(): Promise<Partial<Record<FinitionBasePriceKey, number>>> {
  if (ready) return {};
  if (inflight) return inflight;

  inflight = (async () => {
    const excelIds = FINISHING_TO_BASE_KEY.flatMap((m) => m.excelIds);
    const references = FINISHING_TO_BASE_KEY.flatMap((m) => m.references);

    const rows = await prisma.finishingPrice
      .findMany({
        where: {
          active: true,
          OR: [{ excelId: { in: excelIds } }, { reference: { in: references } }],
        },
        orderBy: { updatedAt: 'desc' },
      })
      .catch(() => []);

    const patch: Partial<Record<FinitionBasePriceKey, number>> = {};
    for (const map of FINISHING_TO_BASE_KEY) {
      const row = rows.find(
        (r) =>
          (r.excelId && map.excelIds.includes(r.excelId))
          || (r.reference && map.references.includes(r.reference)),
      );
      if (row?.unitPrice != null && row.unitPrice > 0) {
        patch[map.key] = Math.round(row.unitPrice);
      }
    }

    setFinitionRuntimePriceOverrides(patch);
    ready = true;
    return patch;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export async function forceSyncFinitionRuntimePrices(): Promise<Partial<Record<FinitionBasePriceKey, number>>> {
  invalidateFinitionRuntimeCache();
  return ensureFinitionRuntimePricesReady();
}
