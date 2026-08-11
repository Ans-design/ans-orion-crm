/**
 * Import multi-feuilles Prix / Matières / Stock — validation puis écriture atomique.
 */
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { safeErrorMessage } from '@/lib/api-response';

export type SheetReport = {
  sheet: string;
  read: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ line: number; reason: string }>;
};

export type PrixMatieresImportResult = {
  reports: SheetReport[];
  totals: {
    read: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  dryRun: boolean;
  applied: boolean;
  aborted: boolean;
  atomic: boolean;
  message: string;
};

function rowsFromSheet(wb: XLSX.WorkBook, name: string): Record<string, unknown>[] {
  const sheet = wb.Sheets[name];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
}

function pick(row: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(v: unknown): number | null {
  const n = Number(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function totalsOf(reports: SheetReport[]) {
  return reports.reduce(
    (acc, r) => ({
      read: acc.read + r.read,
      created: acc.created + r.created,
      updated: acc.updated + r.updated,
      skipped: acc.skipped + r.skipped,
      errors: acc.errors + r.errors.length,
    }),
    { read: 0, created: 0, updated: 0, skipped: 0, errors: 0 },
  );
}

type MatOp =
  | { kind: 'create'; materialKey: string; excelId: string | null; data: Record<string, unknown> }
  | { kind: 'update'; id: string; data: Record<string, unknown> };

type CtxOp = {
  baseMaterialId: string | null;
  materialKey: string;
  /** Si matière créée dans le même fichier */
  pendingMaterialKey?: string;
  priceContext: string;
  priceUnit: string;
  baseFormat: string;
  priceHT: number;
  costHT: number | null;
  active: boolean;
  isUpdate: boolean;
};

type IsfOp = {
  existingId: string | null;
  payload: Record<string, unknown>;
  syncContext?: { baseMaterialId: string; materialKey: string; priceHT: number };
  isUpdate: boolean;
};

type GfOp =
  | { kind: 'create'; excelId: string | null; data: Record<string, unknown> }
  | { kind: 'update'; id: string; data: Record<string, unknown> };

type Plan = {
  reports: SheetReport[];
  matOps: MatOp[];
  ctxOps: CtxOp[];
  isfOps: IsfOp[];
  gfOps: GfOp[];
  pendingKeys: Set<string>;
};

async function buildPlan(wb: XLSX.WorkBook): Promise<Plan> {
  const reports: SheetReport[] = [];
  const matOps: MatOp[] = [];
  const ctxOps: CtxOp[] = [];
  const isfOps: IsfOp[] = [];
  const gfOps: GfOp[] = [];
  const pendingKeys = new Set<string>();

  // 01 — Matières
  {
    const rows = rowsFromSheet(wb, '01_Matieres_Stock');
    const report: SheetReport = {
      sheet: '01_Matieres_Stock',
      read: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const label = pick(row, 'MATIÈRE', 'matiere', 'label');
      if (!label) {
        report.skipped += 1;
        continue;
      }
      const excelId = pick(row, 'ID', 'excelId') || null;
      const materialKey =
        pick(row, 'MATERIAL_KEY', 'materialKey')
        || label.toLowerCase().replace(/\s+/g, '_').slice(0, 80);
      const data = {
        label,
        family: pick(row, 'FAMILLE', 'family') || 'Petit format',
        grammage: pick(row, 'GRAMMAGE') || null,
        thickness: pick(row, 'ÉPAISSEUR', 'EPAISSEUR') || null,
        saleUnit: pick(row, 'UNITÉ', 'UNITE') || 'pcs',
        purchasePrice: num(pick(row, 'PRIX ACHAT')),
        basePrintPrice: num(pick(row, 'PRIX BASE')),
        visiblePos: !/^non|0|false$/i.test(pick(row, 'VISIBLE POS') || 'oui'),
        publicationStatus: pick(row, 'STATUT') || 'draft',
        anomalyNotes: pick(row, 'DÉTAIL', 'DETAIL') || null,
      };
      try {
        const existing = excelId
          ? await prisma.baseMaterial.findFirst({
              where: { OR: [{ excelRowId: excelId }, { materialKey }, { id: excelId }] },
            })
          : await prisma.baseMaterial.findFirst({ where: { materialKey } });
        if (existing) {
          matOps.push({
            kind: 'update',
            id: existing.id,
            data: {
              ...data,
              purchasePrice: data.purchasePrice ?? existing.purchasePrice,
              basePrintPrice: data.basePrintPrice ?? existing.basePrintPrice,
            },
          });
          report.updated += 1;
        } else {
          matOps.push({ kind: 'create', materialKey, excelId, data });
          pendingKeys.add(materialKey);
          pendingKeys.add(label);
          report.created += 1;
        }
      } catch (e) {
        report.errors.push({ line: i + 2, reason: safeErrorMessage(e) });
      }
    }
    reports.push(report);
  }

  // 02 — Prix contexte
  {
    let rows = rowsFromSheet(wb, '02_Prix_Base');
    if (!rows.length) rows = rowsFromSheet(wb, '02_Prix_Par_Contexte');
    const report: SheetReport = {
      sheet: '02_Prix_Base',
      read: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const materialKey = pick(row, 'MATIÈRE', 'materialKey');
      const priceHT = num(pick(row, 'PRIX HT', 'priceHT'));
      const context = pick(row, 'CONTEXTE PRIX', 'priceContext') || 'PRINT_SMALL_FORMAT';
      if (!materialKey || priceHT == null) {
        report.skipped += 1;
        continue;
      }
      try {
        const mat = await prisma.baseMaterial.findFirst({
          where: { OR: [{ materialKey }, { label: materialKey }] },
        });
        if (!mat && !pendingKeys.has(materialKey)) {
          report.errors.push({ line: i + 2, reason: `Matière introuvable: ${materialKey}` });
          continue;
        }
        const priceUnit = pick(row, 'UNITÉ PRIX', 'UNITE PRIX') || 'a4';
        const baseFormat = pick(row, 'FORMAT BASE') || 'A4';
        let before = null;
        if (mat) {
          before = await prisma.materialContextPrice.findFirst({
            where: {
              baseMaterialId: mat.id,
              priceContext: context,
              priceUnit,
              baseFormat,
            },
          });
        }
        ctxOps.push({
          baseMaterialId: mat?.id ?? null,
          materialKey: mat?.materialKey ?? materialKey,
          pendingMaterialKey: mat ? undefined : materialKey,
          priceContext: context,
          priceUnit,
          baseFormat,
          priceHT,
          costHT: num(pick(row, 'COÛT HT', 'COUT HT')),
          active: !/^non|0|false$/i.test(pick(row, 'ACTIF') || 'oui'),
          isUpdate: Boolean(before),
        });
        if (before) report.updated += 1;
        else report.created += 1;
      } catch (e) {
        report.errors.push({ line: i + 2, reason: safeErrorMessage(e) });
      }
    }
    reports.push(report);
  }

  // 03 — ISF
  {
    const rows = rowsFromSheet(wb, '03_Impression_Sans_Finition');
    const report: SheetReport = {
      sheet: '03_Impression_Sans_Finition',
      read: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const materialKey = pick(row, 'MATIÈRE');
      const basePrice = num(pick(row, 'PRIX A4', 'basePrice'));
      if (!materialKey || basePrice == null) {
        report.skipped += 1;
        continue;
      }
      const id = pick(row, 'ID');
      const grammage = pick(row, 'GRAMMAGE');
      const formatLabel = pick(row, 'FORMAT BASE') || 'A4';
      try {
        const mat = await prisma.baseMaterial.findFirst({
          where: { OR: [{ materialKey }, { label: materialKey }] },
        });
        if (!mat && !pendingKeys.has(materialKey)) {
          report.errors.push({ line: i + 2, reason: `Matière introuvable: ${materialKey}` });
          continue;
        }
        const existing = id
          ? await prisma.basePrintingPrice.findUnique({ where: { id } }).catch(() => null)
          : await prisma.basePrintingPrice.findFirst({
              where: { materialKey, grammage, formatLabel, articleId: 'imp-sf' },
            });
        const payload = {
          articleId: existing?.articleId || 'imp-sf',
          materialKey,
          baseMaterialId: mat?.id ?? null,
          grammage,
          formatLabel,
          face: /^oui/i.test(pick(row, 'VERSO')) ? 'recto_verso' : 'recto',
          basePrice,
          saleUnit: pick(row, 'UNITÉ', 'UNITE') || 'pcs',
          active: !/^non/i.test(pick(row, 'VISIBLE POS') || 'oui'),
          publicationStatus: pick(row, 'STATUT') || 'published',
        };
        isfOps.push({
          existingId: existing?.id ?? null,
          payload,
          syncContext:
            mat && (formatLabel === 'A4' || !formatLabel)
              ? { baseMaterialId: mat.id, materialKey: mat.materialKey, priceHT: basePrice }
              : undefined,
          isUpdate: Boolean(existing),
        });
        if (existing) report.updated += 1;
        else report.created += 1;
      } catch (e) {
        report.errors.push({ line: i + 2, reason: safeErrorMessage(e) });
      }
    }
    reports.push(report);
  }

  // 04 — Grand format
  {
    const rows = rowsFromSheet(wb, '04_Grand_Format');
    const report: SheetReport = {
      sheet: '04_Grand_Format',
      read: rows.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const name = pick(row, 'MATIÈRE', 'name');
      const priceM2 = num(pick(row, 'PRIX M2', 'pricePerM2'));
      if (!name) {
        report.skipped += 1;
        continue;
      }
      const excelId = pick(row, 'ID') || null;
      try {
        const existing = excelId
          ? await prisma.grandFormatPricing.findFirst({
              where: { OR: [{ excelId }, { id: excelId }, { name }] },
            })
          : await prisma.grandFormatPricing.findFirst({ where: { name } });
        const data = {
          name,
          materialName: name,
          pricePerM2: priceM2,
          pricePerLinearMeter: num(pick(row, 'PRIX ML')),
          laize: num(pick(row, 'LAIZE')),
          visiblePOS: !/^non/i.test(pick(row, 'VISIBLE POS') || 'oui'),
          status: pick(row, 'STATUT') || 'draft',
          details: pick(row, 'DÉTAIL', 'DETAIL') || null,
          active: true,
        };
        if (existing) {
          gfOps.push({ kind: 'update', id: existing.id, data });
          report.updated += 1;
        } else {
          gfOps.push({ kind: 'create', excelId, data });
          report.created += 1;
        }
      } catch (e) {
        report.errors.push({ line: i + 2, reason: safeErrorMessage(e) });
      }
    }
    reports.push(report);
  }

  return { reports, matOps, ctxOps, isfOps, gfOps, pendingKeys };
}

async function applyPlan(plan: Plan): Promise<void> {
  const keyToId = new Map<string, string>();

  await prisma.$transaction(
    async (tx) => {
      for (const op of plan.matOps) {
        if (op.kind === 'update') {
          await tx.baseMaterial.update({ where: { id: op.id }, data: op.data as Prisma.BaseMaterialUpdateInput });
        } else {
          const created = await tx.baseMaterial.create({
            data: {
              materialKey: op.materialKey,
              excelRowId: op.excelId,
              ...(op.data as object),
              active: true,
            } as Prisma.BaseMaterialUncheckedCreateInput,
          });
          keyToId.set(op.materialKey, created.id);
          if (typeof op.data.label === 'string') keyToId.set(op.data.label, created.id);
        }
      }

      for (const op of plan.ctxOps) {
        let baseMaterialId = op.baseMaterialId;
        let materialKey = op.materialKey;
        if (!baseMaterialId && op.pendingMaterialKey) {
          baseMaterialId = keyToId.get(op.pendingMaterialKey) ?? null;
          if (baseMaterialId) {
            const m = await tx.baseMaterial.findUnique({ where: { id: baseMaterialId } });
            if (m) materialKey = m.materialKey;
          }
        }
        if (!baseMaterialId) {
          throw new Error(`Matière introuvable pour prix contexte: ${op.materialKey}`);
        }
        const existing = await tx.materialContextPrice.findFirst({
          where: {
            baseMaterialId,
            priceContext: op.priceContext,
            priceUnit: op.priceUnit,
            baseFormat: op.baseFormat,
          },
        });
        const data = {
          materialKey,
          priceHT: op.priceHT,
          costHT: op.costHT,
          sourceTable: 'ExcelImport',
          active: op.active,
        };
        if (existing) {
          await tx.materialContextPrice.update({ where: { id: existing.id }, data });
        } else {
          await tx.materialContextPrice.create({
            data: {
              baseMaterialId,
              priceContext: op.priceContext,
              priceUnit: op.priceUnit,
              baseFormat: op.baseFormat,
              ...data,
            },
          });
        }
      }

      for (const op of plan.isfOps) {
        let payload = { ...op.payload };
        if (!payload.baseMaterialId && typeof payload.materialKey === 'string') {
          const id = keyToId.get(payload.materialKey as string);
          if (id) payload = { ...payload, baseMaterialId: id };
        }
        if (op.existingId) {
          await tx.basePrintingPrice.update({
            where: { id: op.existingId },
            data: payload as Prisma.BasePrintingPriceUpdateInput,
          });
        } else {
          await tx.basePrintingPrice.create({
            data: payload as Prisma.BasePrintingPriceUncheckedCreateInput,
          });
        }
        const sync = op.syncContext;
        if (sync) {
          const existingCtx = await tx.materialContextPrice.findFirst({
            where: {
              baseMaterialId: sync.baseMaterialId,
              priceContext: 'PRINT_SMALL_FORMAT',
              priceUnit: 'a4',
              baseFormat: 'A4',
            },
          });
          const ctxData = {
            materialKey: sync.materialKey,
            priceHT: sync.priceHT,
            sourceTable: 'ExcelImportISF',
            active: true,
          };
          if (existingCtx) {
            await tx.materialContextPrice.update({ where: { id: existingCtx.id }, data: ctxData });
          } else {
            await tx.materialContextPrice.create({
              data: {
                baseMaterialId: sync.baseMaterialId,
                priceContext: 'PRINT_SMALL_FORMAT',
                priceUnit: 'a4',
                baseFormat: 'A4',
                ...ctxData,
              },
            });
          }
        }
      }

      for (const op of plan.gfOps) {
        if (op.kind === 'update') {
          await tx.grandFormatPricing.update({
            where: { id: op.id },
            data: op.data as Prisma.GrandFormatPricingUpdateInput,
          });
        } else {
          await tx.grandFormatPricing.create({
            data: { ...(op.data as object), excelId: op.excelId } as Prisma.GrandFormatPricingUncheckedCreateInput,
          });
        }
      }
    },
    { timeout: 120_000, maxWait: 15_000 },
  );
}

export async function importPrixMatieresStockWorkbook(
  buf: Buffer,
  opts?: { dryRun?: boolean; abortOnErrors?: boolean },
): Promise<PrixMatieresImportResult> {
  const dryRun = opts?.dryRun !== false;
  const abortOnErrors = opts?.abortOnErrors !== false;
  const wb = XLSX.read(buf, { type: 'buffer' });
  const plan = await buildPlan(wb);
  const totals = totalsOf(plan.reports);

  if (dryRun) {
    return {
      reports: plan.reports,
      totals,
      dryRun: true,
      applied: false,
      aborted: false,
      atomic: true,
      message:
        totals.errors > 0
          ? `Prévisualisation : ${totals.errors} erreur(s) — corrigez avant d’importer`
          : `Prévisualisation OK — ${totals.created} créations, ${totals.updated} mises à jour estimées (écriture atomique)`,
    };
  }

  if (abortOnErrors && totals.errors > 0) {
    return {
      reports: plan.reports,
      totals,
      dryRun: false,
      applied: false,
      aborted: true,
      atomic: true,
      message: `Import annulé : ${totals.errors} erreur(s) — aucune donnée écrite (transaction non démarrée)`,
    };
  }

  await applyPlan(plan);

  return {
    reports: plan.reports,
    totals,
    dryRun: false,
    applied: true,
    aborted: false,
    atomic: true,
    message: `Import atomique OK — ${totals.created} créés, ${totals.updated} maj`,
  };
}

export const prixMatieresStockExcelImportService = {
  importPrixMatieresStockWorkbook,
};
