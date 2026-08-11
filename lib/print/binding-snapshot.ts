import { articleUsesBindingEngine, evaluateBindingFromConfig } from '@/lib/print/binding-rules';
import type { BindingEvaluation } from '@/lib/print/binding-rules';

export const BINDING_SNAPSHOT_VERSION = 'bind-v1';

export type BindingCalculationSnapshot = {
  formulaVersion: string;
  bindingType: string;
  pageCount: number | null;
  printMode: string;
  physicalSheets: number | null;
  grammageLabel: string;
  reference: string | null;
  referenceLabel: string | null;
  spineMmCalculated: number | null;
  spineMmRange: string | null;
  priceAr: number | null;
  compatible: boolean;
  summaryLine: string | null;
  createdAt: string;
};

export function buildBindingCalculationSnapshot(
  articleId: string,
  config: Record<string, unknown>,
): BindingCalculationSnapshot | null {
  if (!articleUsesBindingEngine(articleId)) return null;
  const ev = evaluateBindingFromConfig(config);
  if (!ev) return null;
  return evaluationToSnapshot(ev);
}

function evaluationToSnapshot(ev: BindingEvaluation): BindingCalculationSnapshot {
  const parts: string[] = [];
  if (ev.pageCount) parts.push(`${ev.pageCount} pages`);
  parts.push(ev.printModeLabel);
  if (ev.physicalSheets != null) parts.push(`${ev.physicalSheets} feuilles`);
  parts.push(ev.bindingType);
  if (ev.referenceLabel) parts.push(ev.referenceLabel);

  return {
    formulaVersion: BINDING_SNAPSHOT_VERSION,
    bindingType: ev.bindingType,
    pageCount: ev.pageCount,
    printMode: ev.printModeLabel,
    physicalSheets: ev.physicalSheets,
    grammageLabel: ev.paperWeightLabel,
    reference: ev.reference ?? null,
    referenceLabel: ev.referenceLabel ?? null,
    spineMmCalculated: ev.spineMmCalculated ?? null,
    spineMmRange: ev.spineMmRange ?? null,
    priceAr: ev.priceAr ?? null,
    compatible: ev.compatible,
    summaryLine: parts.join(' — '),
    createdAt: new Date().toISOString(),
  };
}

export function readBindingSnapshotFromConfig(
  config: Record<string, unknown>,
): BindingCalculationSnapshot | null {
  const raw = config._bindingSnapshot;
  if (!raw || typeof raw !== 'object') return null;
  return raw as BindingCalculationSnapshot;
}
