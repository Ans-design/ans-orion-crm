import { prisma } from '@/lib/prisma';
import {
  formatExcelRowId,
  generateMainReference,
  storeMainReference,
} from '@/lib/backoffice/material-main-reference';
import { characteristicToStorage, type CharacteristicType } from '@/lib/backoffice/material-table-fields';
import { parseCharacteristicTypeLabel } from '@/lib/backoffice/material-import-key';
import { listBaseMaterials, type BaseMaterialRow } from '../pricing/base-material.repository';
import { hasBaseMaterialDelegate } from '../pricing/prisma-delegate-check';

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function inferCharType(row: BaseMaterialRow): CharacteristicType {
  if (row.thickness?.trim()) return 'epaisseur';
  if (row.grammage?.trim()) return 'grammage';
  return 'autre';
}

function charValueFromRow(row: BaseMaterialRow): string {
  return row.thickness?.trim() || row.grammage?.trim() || '';
}

function looksTechnicalReference(key: string): boolean {
  return (
    key.length > 32
    || /^cm[a-z0-9]+$/i.test(key)
    || key.includes(':')
    || !key
  );
}

/** Assigne IDs Excel 001, 002… aux matières actives qui n'en ont pas */
export async function ensureMaterialExcelRowIds(): Promise<{ assigned: number; preserved: number }> {
  if (!hasBaseMaterialDelegate(prisma)) return { assigned: 0, preserved: 0 };

  const rows = await prisma.baseMaterial.findMany({
    where: { archived: false },
    orderBy: [{ family: 'asc' }, { label: 'asc' }],
    select: { id: true, excelRowId: true },
  });

  const used = new Set(
    rows.map((r) => r.excelRowId).filter((x): x is string => Boolean(x)),
  );
  let maxNum = 0;
  for (const id of used) {
    const n = parseInt(id, 10);
    if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
  }

  let assigned = 0;
  let preserved = 0;
  for (const row of rows) {
    if (row.excelRowId) {
      preserved += 1;
      continue;
    }
    maxNum += 1;
    const nextId = formatExcelRowId(maxNum);
    await prisma.baseMaterial.update({
      where: { id: row.id },
      data: { excelRowId: nextId },
    });
    used.add(nextId);
    assigned += 1;
  }
  return { assigned, preserved };
}

export type GenerateReferencesMode = 'missing' | 'all';

/** Génère références métier courtes (materialKey) */
export async function ensureMaterialMainReferences(
  mode: GenerateReferencesMode = 'missing',
): Promise<{ updated: number; skipped: number }> {
  if (!hasBaseMaterialDelegate(prisma)) return { updated: 0, skipped: 0 };

  const allKeyRows = await prisma.baseMaterial.findMany({
    select: { id: true, materialKey: true },
  });
  const keyOwner = new Map(allKeyRows.map((r) => [r.materialKey, r.id]));

  const isKeyTaken = (key: string, excludeId: string) => {
    const owner = keyOwner.get(key);
    return owner != null && owner !== excludeId;
  };

  const allocateUniqueRef = (base: string, excludeId: string) => {
    let ref = base;
    let suffix = 2;
    while (isKeyTaken(ref, excludeId)) {
      ref = `${base}-${String(suffix).padStart(2, '0')}`;
      suffix += 1;
    }
    return ref;
  };

  const { rows } = await listBaseMaterials({ activeOnly: false, archivedOnly: false });
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const key = row.materialKey?.trim() ?? '';
    const hasValidRef = key && !looksTechnicalReference(key);

    if (mode === 'missing' && hasValidRef) {
      skipped += 1;
      continue;
    }

    const charType = inferCharType(row);
    const value = charValueFromRow(row);
    const materialName =
      row.normalizedName?.trim()
      || row.displayName?.trim()
      || row.label.split(/\s+\d/)[0]?.trim()
      || row.label;

    let ref = generateMainReference({
      materialName,
      characteristicType: charType,
      value,
      secondDetail: row.anomalyNotes?.trim() || null,
    });
    ref = storeMainReference(ref);
    ref = allocateUniqueRef(ref, row.id);

    if (ref === storeMainReference(row.materialKey ?? '')) {
      skipped += 1;
      continue;
    }

    const previousKey = row.materialKey;
    await prisma.baseMaterial.update({
      where: { id: row.id },
      data: { materialKey: ref },
    });
    if (previousKey) keyOwner.delete(previousKey);
    keyOwner.set(ref, row.id);
    updated += 1;
  }
  return { updated, skipped };
}

export async function getMaterialExcelMetadata(
  row: BaseMaterialRow,
): Promise<{ excelRowId: string | null }> {
  const db = await prisma.baseMaterial.findUnique({
    where: { id: row.id },
    select: { excelRowId: true },
  });
  return { excelRowId: db?.excelRowId ?? null };
}

export function charPartsFromRow(row: BaseMaterialRow): { type: CharacteristicType; value: string } {
  const type = inferCharType(row);
  const value = charValueFromRow(row);
  return { type, value };
}

export function charPartsFromParsed(
  charType: CharacteristicType,
  charValue: string,
): { grammage: string | null; thickness: string | null } {
  return characteristicToStorage(charType, charValue);
}

export async function nextAvailableExcelRowId(tx: PrismaTx): Promise<string> {
  const rows = await tx.baseMaterial.findMany({
    where: { excelRowId: { not: null } },
    select: { excelRowId: true },
  });
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.excelRowId ?? '', 10);
    if (!Number.isNaN(n)) max = Math.max(max, n);
  }
  return formatExcelRowId(max + 1);
}

/** Réorganise les IDs Excel 001, 002… selon l'ordre actuel des matières actives */
export async function reorganizeMaterialExcelIds(): Promise<{
  reassigned: number;
  preserved: number;
}> {
  if (!hasBaseMaterialDelegate(prisma)) return { reassigned: 0, preserved: 0 };

  const rows = await prisma.baseMaterial.findMany({
    where: { archived: false },
    orderBy: [{ family: 'asc' }, { label: 'asc' }],
    select: { id: true, excelRowId: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.baseMaterial.updateMany({
      where: { archived: false, excelRowId: { not: null } },
      data: { excelRowId: null },
    });
    for (let i = 0; i < rows.length; i++) {
      await tx.baseMaterial.update({
        where: { id: rows[i]!.id },
        data: { excelRowId: formatExcelRowId(i + 1) },
      });
    }
  });

  return { reassigned: rows.length, preserved: 0 };
}

export { parseCharacteristicTypeLabel };
