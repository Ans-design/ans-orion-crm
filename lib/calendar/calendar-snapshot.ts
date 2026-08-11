import type { CalendarMaterialRecap } from '@/lib/calendar/calendar-calculation';
import { calculateCalendarMaterialRecap } from '@/lib/calendar/calendar-calculation';
import { isCalendarArticleId } from '@/lib/calendar/calendar-material-policy';

export const CALENDAR_SNAPSHOT_VERSION = 'cal-v1';

/** Snapshot figé devis / commande / facture — ne pas recalculer rétroactivement. */
export type CalendarCalculationSnapshot = {
  formulaVersion: string;
  productType: string;
  formatLabel: string;
  widthMm: number;
  heightMm: number;
  material: string;
  grammage: string;
  printMode: string;
  quantity: number;
  numberOfSheets: number;
  realSurfaceM2: number;
  grossSurfaceM2: number;
  totalRealSurfaceM2: number;
  totalGrossSurfaceM2: number;
  supportSurfaceM2?: number;
  sheetsSurfaceM2?: number;
  wasteMarginMm: number;
  grossWidthMm: number;
  grossHeightMm: number;
  unitPrice: number;
  materialPrice: number;
  printPrice: number;
  finishingPrice: number;
  bindingPrice: number;
  totalPrice: number;
  alert?: string;
  createdAt: string;
};

function recapToSnapshot(
  recap: CalendarMaterialRecap,
  opts: { unitPrice: number; qty: number; prixM2: number },
): CalendarCalculationSnapshot {
  const materialPrice = Math.round(opts.prixM2 * recap.grossSurfaceM2);
  const printCoef = /recto-verso/i.test(recap.printMode) ? 1.8 : 1;
  const printPrice = Math.round(materialPrice * 0.4 * printCoef);
  const finishingPrice = 0;
  const bindingPrice = String(recap.articleId).includes('chevalet') ? 500 : 0;
  const unitPrice = opts.unitPrice || materialPrice + printPrice + finishingPrice + bindingPrice;

  return {
    formulaVersion: CALENDAR_SNAPSHOT_VERSION,
    productType: recap.articleId,
    formatLabel: recap.formatLabel,
    widthMm: recap.widthMm,
    heightMm: recap.heightMm,
    material: recap.material,
    grammage: recap.grammage,
    printMode: recap.printMode,
    quantity: opts.qty,
    numberOfSheets: recap.sheetCount,
    realSurfaceM2: recap.realSurfaceM2,
    grossSurfaceM2: recap.grossSurfaceM2,
    totalRealSurfaceM2: recap.totalRealSurfaceM2,
    totalGrossSurfaceM2: recap.totalGrossSurfaceM2,
    supportSurfaceM2: recap.supportSurfaceM2,
    sheetsSurfaceM2: recap.sheetsSurfaceM2,
    wasteMarginMm: recap.wasteMarginMm,
    grossWidthMm: recap.grossWidthMm,
    grossHeightMm: recap.grossHeightMm,
    unitPrice,
    materialPrice,
    printPrice,
    finishingPrice,
    bindingPrice,
    totalPrice: unitPrice * opts.qty,
    alert: recap.alert,
    createdAt: new Date().toISOString(),
  };
}

export function buildCalendarCalculationSnapshot(
  articleId: string,
  config: Record<string, unknown>,
  opts?: { unitPrice?: number; prixM2?: number },
): CalendarCalculationSnapshot | null {
  if (!isCalendarArticleId(articleId)) return null;
  const recap = calculateCalendarMaterialRecap(articleId, config);
  if (!recap) return null;
  const qty = Number(config.qty) > 0 ? Math.floor(Number(config.qty)) : 1;
  const prixM2 = opts?.prixM2 ?? null;
  if (opts?.unitPrice == null && (prixM2 == null || prixM2 <= 0)) return null;
  const unitPrice = opts?.unitPrice ?? Math.round((prixM2 ?? 0) * recap.grossSurfaceM2);
  const effectivePrixM2 =
    prixM2 != null && prixM2 > 0
      ? prixM2
      : Math.round(unitPrice / Math.max(recap.grossSurfaceM2, 0.0001));
  return recapToSnapshot(recap, { unitPrice, qty, prixM2: effectivePrixM2 });
}

export function readCalendarSnapshotFromConfig(
  config: Record<string, unknown>,
): CalendarCalculationSnapshot | null {
  const raw = config._calendarSnapshot;
  if (!raw || typeof raw !== 'object') return null;
  return raw as CalendarCalculationSnapshot;
}
