/**
 * Watermark KPI + invalidation liée V12 (Vague 3).
 * Persisté sur disque pour partage multi-instance local (PARTIAL vs Redis).
 */

import fs from 'fs';
import path from 'path';
import { invalidateKpiCaches as clearSlices } from '@/lib/services/kpi-cache-invalidation';

let processWatermarkIso = new Date(0).toISOString();
let hydrated = false;

function watermarkPath(): string {
  return path.join(process.cwd(), 'data', 'kpi-watermark.json');
}

function hydrateFromDisk(): void {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = fs.readFileSync(watermarkPath(), 'utf8');
    const parsed = JSON.parse(raw) as { watermark?: string };
    if (parsed.watermark && parsed.watermark > processWatermarkIso) {
      processWatermarkIso = parsed.watermark;
    }
  } catch {
    /* first boot / no file */
  }
}

function persistToDisk(iso: string): void {
  try {
    const dir = path.dirname(watermarkPath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(watermarkPath(), JSON.stringify({ watermark: iso, updatedAt: new Date().toISOString() }));
  } catch (e) {
    console.warn('[kpi-watermark] persist failed', e instanceof Error ? e.message : e);
  }
}

export function getKpiSourceWatermark(): string {
  hydrateFromDisk();
  return processWatermarkIso;
}

export function advanceKpiWatermark(iso?: string): string {
  hydrateFromDisk();
  processWatermarkIso = iso ?? new Date().toISOString();
  persistToDisk(processWatermarkIso);
  clearSlices();
  return processWatermarkIso;
}

/** Matrice événement → familles KPI (documentation exécutable). */
export const KPI_INVALIDATION_MAP: Record<string, string[]> = {
  DevisAccepted: ['COM-005', 'COM-007', 'DIR-002', 'PRO-004', 'PRO-005'],
  PaiementRecorded: ['DIR-001', 'FIN-004', 'FIN-006', 'LOG-FIN-COUNT'],
  LivraisonCompleted: ['LOG-FIN-COUNT', 'PRO-004'],
  PricingReleasePublished: ['ADM-008'],
  PermissionPolicyChanged: ['*'],
  StockMovement: ['STK-003', 'STK-004'],
};

export function kpisAffectedByEvent(type: string): string[] {
  return KPI_INVALIDATION_MAP[type] ?? [];
}
