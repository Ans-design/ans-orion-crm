/**
 * Audit dérive Catalogue 2026 ↔ BaseMaterial (véracité prix).
 */

import { prisma } from '@/lib/prisma';
import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';
import {
  catalogue2026MaterialsWithPrintPrice,
  getCatalogue2026Workbook,
  loadCatalogue2026FromPath,
  parseCatalogue2026Buffer,
  type Catalogue2026MaterialRow,
  type Catalogue2026Workbook,
} from '@/lib/backoffice/catalogue-2026-excel-format';
import { hasBaseMaterialDelegate } from './prisma-delegate-check';

export type Catalogue2026DriftStatus =
  | 'match_ok'
  | 'prix_divergent'
  | 'prix_manquant_db'
  | 'absent_db'
  | 'sans_tarif_2026'
  | 'db_sans_ref_excel';

export type Catalogue2026DriftRow = {
  excelRowId: string;
  materialName: string;
  family: string;
  status: Catalogue2026DriftStatus;
  excelPrintPrice: number | null;
  dbPrintPrice: number | null;
  dbMaterialId: string | null;
  dbMaterialKey: string | null;
  message: string;
};

export type Catalogue2026DriftReport = {
  source: 'reference' | 'upload';
  fileName?: string;
  scannedAt: string;
  summary: {
    totalExcelMaterials: number;
    withExcelPrice: number;
    matchOk: number;
    prixDivergent: number;
    prixManquantDb: number;
    absentDb: number;
    sansTarif2026: number;
    dbSansRefExcel: number;
    servicesExact: number;
    withoutPriceListed: number;
  };
  rows: Catalogue2026DriftRow[];
  divergences: Catalogue2026DriftRow[];
  methodRules: Catalogue2026Workbook['methodRules'];
};

function normalizeExcelId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const parsed = parseExcelIdColumn(raw);
  if (parsed.excelRowId) return formatExcelRowId(Number(parsed.excelRowId));
  const digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  return formatExcelRowId(Number(digits));
}

function pricesEqual(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.round(a) === Math.round(b);
}

export async function auditCatalogue2026Drift(opts?: {
  workbook?: Catalogue2026Workbook;
  fileName?: string;
  source?: 'reference' | 'upload';
}): Promise<Catalogue2026DriftReport> {
  if (!hasBaseMaterialDelegate(prisma)) {
    throw new Error('BaseMaterial non disponible (Prisma)');
  }

  const wb = opts?.workbook ?? getCatalogue2026Workbook();
  const source = opts?.source ?? 'reference';

  const dbRows = await prisma.baseMaterial.findMany({
    where: { archived: false },
    select: {
      id: true,
      label: true,
      excelRowId: true,
      materialKey: true,
      family: true,
      basePrintPrice: true,
      active: true,
    },
  });

  const dbByExcelId = new Map<string, (typeof dbRows)[number]>();
  for (const row of dbRows) {
    const id = normalizeExcelId(row.excelRowId);
    if (id) dbByExcelId.set(id, row);
  }

  const rows: Catalogue2026DriftRow[] = [];
  const materialsWithPrice = catalogue2026MaterialsWithPrintPrice(wb);

  for (const mat of wb.materials) {
    const db = dbByExcelId.get(mat.excelRowId) ?? null;
    const isSansTarif = wb.withoutPriceIds.has(mat.excelRowId);

    if (isSansTarif) {
      rows.push({
        excelRowId: mat.excelRowId,
        materialName: mat.name,
        family: mat.family,
        status: 'sans_tarif_2026',
        excelPrintPrice: mat.printPrice,
        dbPrintPrice: db?.basePrintPrice ?? null,
        dbMaterialId: db?.id ?? null,
        dbMaterialKey: db?.materialKey ?? null,
        message: 'Référencée sans tarif exact PRIX 2026 — ne pas extrapoler',
      });
      continue;
    }

    if (!db) {
      rows.push({
        excelRowId: mat.excelRowId,
        materialName: mat.name,
        family: mat.family,
        status: 'absent_db',
        excelPrintPrice: mat.printPrice,
        dbPrintPrice: null,
        dbMaterialId: null,
        dbMaterialKey: null,
        message: 'Matière absente de la base ORION',
      });
      continue;
    }

    if (mat.printPrice == null || mat.printPrice <= 0) {
      if (db.basePrintPrice == null || db.basePrintPrice <= 0) {
        rows.push({
          excelRowId: mat.excelRowId,
          materialName: mat.name,
          family: mat.family,
          status: 'prix_manquant_db',
          excelPrintPrice: null,
          dbPrintPrice: db.basePrintPrice,
          dbMaterialId: db.id,
          dbMaterialKey: db.materialKey,
          message: 'Prix imprimé manquant Excel et DB',
        });
      }
      continue;
    }

    if (db.basePrintPrice == null || db.basePrintPrice <= 0) {
      rows.push({
        excelRowId: mat.excelRowId,
        materialName: mat.name,
        family: mat.family,
        status: 'prix_manquant_db',
        excelPrintPrice: mat.printPrice,
        dbPrintPrice: db.basePrintPrice,
        dbMaterialId: db.id,
        dbMaterialKey: db.materialKey,
        message: `Prix Excel ${mat.printPrice} Ar — manquant en DB`,
      });
      continue;
    }

    if (!pricesEqual(mat.printPrice, db.basePrintPrice)) {
      rows.push({
        excelRowId: mat.excelRowId,
        materialName: mat.name,
        family: mat.family,
        status: 'prix_divergent',
        excelPrintPrice: mat.printPrice,
        dbPrintPrice: db.basePrintPrice,
        dbMaterialId: db.id,
        dbMaterialKey: db.materialKey,
        message: `DB ${db.basePrintPrice} Ar ≠ Excel ${mat.printPrice} Ar`,
      });
      continue;
    }

    rows.push({
      excelRowId: mat.excelRowId,
      materialName: mat.name,
      family: mat.family,
      status: 'match_ok',
      excelPrintPrice: mat.printPrice,
      dbPrintPrice: db.basePrintPrice,
      dbMaterialId: db.id,
      dbMaterialKey: db.materialKey,
      message: 'Aligné',
    });
  }

  const excelIds = new Set(wb.materials.map((m) => m.excelRowId));
  for (const db of dbRows) {
    const id = normalizeExcelId(db.excelRowId);
    if (!id || excelIds.has(id)) continue;
    rows.push({
      excelRowId: id,
      materialName: db.label,
      family: db.family ?? '',
      status: 'db_sans_ref_excel',
      excelPrintPrice: null,
      dbPrintPrice: db.basePrintPrice,
      dbMaterialId: db.id,
      dbMaterialKey: db.materialKey,
      message: 'En DB mais absente du référentiel Catalogue 2026',
    });
  }

  const count = (s: Catalogue2026DriftStatus) => rows.filter((r) => r.status === s).length;

  return {
    source,
    fileName: opts?.fileName,
    scannedAt: new Date().toISOString(),
    summary: {
      totalExcelMaterials: wb.materials.length,
      withExcelPrice: materialsWithPrice.length,
      matchOk: count('match_ok'),
      prixDivergent: count('prix_divergent'),
      prixManquantDb: count('prix_manquant_db'),
      absentDb: count('absent_db'),
      sansTarif2026: count('sans_tarif_2026'),
      dbSansRefExcel: count('db_sans_ref_excel'),
      servicesExact: wb.services.length,
      withoutPriceListed: wb.withoutPrice.length,
    },
    rows,
    divergences: rows.filter((r) => r.status !== 'match_ok'),
    methodRules: wb.methodRules,
  };
}

export async function auditCatalogue2026FromUpload(
  buf: Buffer | ArrayBuffer,
  fileName?: string,
): Promise<Catalogue2026DriftReport> {
  const wb = parseCatalogue2026Buffer(buf);
  return auditCatalogue2026Drift({ workbook: wb, fileName, source: 'upload' });
}

export async function auditCatalogue2026FromPath(filePath: string): Promise<Catalogue2026DriftReport> {
  const wb = loadCatalogue2026FromPath(filePath);
  return auditCatalogue2026Drift({ workbook: wb, fileName: filePath, source: 'reference' });
}

export type Catalogue2026ApplyReport = {
  materials: {
    read: number;
    updated: number;
    created: number;
    errors: number;
    issues: { line: number; reason: string }[];
  };
  services: {
    read: number;
    updated: number;
    created: number;
    errors: number;
    synced: number;
    issues: { line: number; reason: string }[];
  };
  appliedAt: string;
};

export async function applyCatalogue2026Prices(opts?: {
  workbook?: Catalogue2026Workbook;
  userId?: string;
  userName?: string;
  fileName?: string;
  applyMaterials?: boolean;
  applyServices?: boolean;
}): Promise<Catalogue2026ApplyReport> {
  const wb = opts?.workbook ?? getCatalogue2026Workbook();
  const applyMaterials = opts?.applyMaterials !== false;
  const applyServices = opts?.applyServices !== false;

  let materialsReport = {
    read: 0,
    updated: 0,
    created: 0,
    errors: 0,
    issues: [] as { line: number; reason: string }[],
  };

  let servicesReport = {
    read: 0,
    updated: 0,
    created: 0,
    errors: 0,
    synced: 0,
    issues: [] as { line: number; reason: string }[],
  };

  if (applyMaterials) {
    const { importMaterialsFromExcel } = await import(
      '@/lib/server/modules/materials/materials-excel-import.service'
    );
    const { catalogue2026MaterialToImportRow } = await import(
      '@/lib/backoffice/catalogue-2026-excel-format'
    );
    const rows = catalogue2026MaterialsWithPrintPrice(wb).map(catalogue2026MaterialToImportRow);
    const report = await importMaterialsFromExcel(rows, {
      userId: opts?.userId,
      userName: opts?.userName,
      fileName: opts?.fileName ?? 'catalogue-2026-prix-exacts.xlsx',
      syncMode: 'upsert',
      replaceAll: false,
    });
    materialsReport = {
      read: report.read,
      updated: report.updated,
      created: report.created,
      errors: report.errors,
      issues: report.issues.map((i) => ({ line: i.line, reason: i.reason })),
    };
  }

  if (applyServices) {
    const { importFinishingFromExcel } = await import(
      '@/lib/server/modules/direct-sale/pricing-tables.service'
    );
    const { catalogue2026ServiceToFinishingRow } = await import(
      '@/lib/backoffice/catalogue-2026-excel-format'
    );
    const rows = wb.services.map(catalogue2026ServiceToFinishingRow);
    const report = await importFinishingFromExcel(rows, {
      userId: opts?.userId,
      userName: opts?.userName,
    });
    servicesReport = {
      read: report.read,
      updated: report.updated,
      created: report.created,
      errors: report.errors,
      synced: report.synced,
      issues: report.issues.map((i) => ({ line: i.line, reason: i.reason })),
    };
  }

  const { logAudit } = await import('@/lib/audit');
  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT',
    entity: 'Catalogue2026',
    details: { materials: materialsReport, services: servicesReport },
  });

  return {
    materials: materialsReport,
    services: servicesReport,
    appliedAt: new Date().toISOString(),
  };
}
