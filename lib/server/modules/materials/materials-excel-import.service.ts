import { logAudit } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import {
  buildCatalogLabel,
  characteristicToStorage,
  type CharacteristicType,
} from '@/lib/backoffice/material-table-fields';
import {
  buildMaterialImportKey,
  parseCharacteristicTypeLabel,
} from '@/lib/backoffice/material-import-key';
import { excelRowToCanonical } from '@/lib/backoffice/material-excel-format';
import {
  generateMainReference,
  isTechnicalDbId,
  normalizePriceUnit,
  storeMainReference,
} from '@/lib/backoffice/material-main-reference';
import { buildMaterialKey, normalizeMaterialName } from '@/lib/server/modules/materials/material-key';
import { nextAvailableExcelRowId } from './material-excel-metadata.service';
import type { BaseMaterialRow } from '../pricing/base-material.repository';
import { hasBaseMaterialDelegate } from '../pricing/prisma-delegate-check';
import {
  countDuplicateExcelIdSkips,
  detectDuplicateExcelIds,
  duplicateExcelIdIssues,
  type DuplicateExcelIdGroup,
} from '@/lib/backoffice/material-excel-duplicate-ids';

export type MaterialExcelImportLine = Record<string, unknown>;

export type MaterialImportIssue = {
  line: number;
  field?: string;
  reason: string;
};

export type MaterialImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  archived: number;
  ignored: number;
  errors: number;
  dbActive: number;
  duplicateIds: number;
  syncModeUsed: 'full' | 'upsert';
  idsGenerated: number;
  referencesGenerated: number;
  activeImported: number;
  duplicateIdGroups: DuplicateExcelIdGroup[];
  issues: MaterialImportIssue[];
};

export type MaterialExcelImportOptions = {
  userId?: string;
  userName?: string;
  fileName?: string;
  /** full = Excel source de vérité (archive les lignes absentes du fichier) */
  syncMode?: 'full' | 'upsert';
  /** Remplacement total : archive d'abord toutes les matières actives puis réactive uniquement l'Excel */
  replaceAll?: boolean;
};

const HEADER_ALIASES: Record<string, string[]> = {
  ID: ['id', 'identifiant', 'identifier'],
  Matière: ['matiere', 'matiere', 'material', 'nom', 'label', 'name'],
  'Type caractéristique': [
    'type caractere',
    'type caracté',
    'type caracteristique',
    'type caract',
    'type',
  ],
  Valeur: ['valeur', 'valeur caracteristique', 'caracteristique'],
  Famille: ['famille', 'family', 'categorie'],
  'Prix base': ['prix base', 'prixbase', 'prix', 'baseprintprice'],
  'Unité prix': ['unite prix', 'unite', 'unit', 'saleunit'],
  'POS actif': ['pos actif', 'visible pos', 'visiblepos', 'pos'],
  'Détails autres': ['details autres', 'details', 'anomalynotes', 'notes', 'detail autre', 'détail autre'],
  'Référence principale': [
    'reference principale',
    'reference pri',
    'reference',
    'ref principale',
    'ref pri',
    'materialkey',
    'ref',
  ],
};

function normalizeHeaderKey(key: string): string {
  return key
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolveCanonicalHeader(rawKey: string): string | null {
  const norm = normalizeHeaderKey(rawKey);
  if (!norm) return null;
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    const canonNorm = normalizeHeaderKey(canonical);
    if (norm === canonNorm || aliases.some((a) => norm === a || norm.startsWith(a))) {
      return canonical;
    }
    if (aliases.some((a) => norm.startsWith(a) || a.startsWith(norm))) {
      return canonical;
    }
  }
  if (norm === 'id' || norm.startsWith('id ')) return 'ID';
  if (norm.startsWith('matiere') || norm.startsWith('material')) return 'Matière';
  if (norm.startsWith('type caract')) return 'Type caractéristique';
  if (norm.startsWith('reference') || norm.startsWith('ref ')) return 'Référence principale';
  if (norm.startsWith('prix base') || norm === 'prix') return 'Prix base';
  if (norm.startsWith('unite')) return 'Unité prix';
  if (norm.startsWith('detail')) return 'Détails autres';
  return null;
}

/** Délègue au format Excel simple (capture 1). */
export function normalizeExcelMaterialRow(line: MaterialExcelImportLine): MaterialExcelImportLine {
  return excelRowToCanonical(line) as MaterialExcelImportLine;
}

function parseLine(line: MaterialExcelImportLine, index: number) {
  const normalized = excelRowToCanonical(line);
  const lineNo = index + 2;
  const excelRowId = String(normalized.excelRowId ?? '').trim();
  const id = String(normalized.ID ?? '').trim();
  const materialName = String(normalized.Matière ?? '').trim();
  let materialKeyRef = String(normalized['Référence principale'] ?? '').trim();
  const priceRaw = normalized['Prix base'];
  const blankRaw = normalized['Prix matière'];
  const marginGainRaw = normalized['Marge de gain'];
  const priceUnitRaw = String(normalized['Unité prix'] ?? '').trim();
  const priceUnit = priceUnitRaw ? normalizePriceUnit(priceUnitRaw) : 'feuille';
  const familyRaw = String(normalized.Famille ?? '').trim();
  const family = familyRaw || 'Autre';
  const charValue = String(normalized.Valeur ?? '').trim();
  const charType = parseCharacteristicTypeLabel(String(normalized['Type caractéristique'] ?? ''));
  const otherDetails = String(normalized['Détails autres'] ?? '').trim();

  if (!materialKeyRef && materialName) {
    materialKeyRef = generateMainReference({
      materialName,
      characteristicType: charType,
      value: charValue,
      secondDetail: otherDetails || null,
    });
  } else if (materialKeyRef) {
    materialKeyRef = storeMainReference(materialKeyRef);
  }

  let basePrintPrice: number | null = null;
  if (priceRaw !== '' && priceRaw != null) {
    const n = Number(String(priceRaw).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isNaN(n) && n >= 0) basePrintPrice = n;
  }

  let blankSellPrice: number | null = null;
  if (blankRaw !== '' && blankRaw != null) {
    const n = Number(String(blankRaw).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isNaN(n) && n >= 0) blankSellPrice = n;
  }

  let targetMargin: number | null = null;
  if (marginGainRaw !== '' && marginGainRaw != null) {
    const gain = Number(String(marginGainRaw).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isNaN(gain) && gain >= 0 && blankSellPrice != null && blankSellPrice > 0) {
      targetMargin = Math.round((gain / blankSellPrice) * 1000) / 10;
    }
  }

  let stockQty: number | null = null;
  const stockRaw = normalized.Stock;
  if (stockRaw !== '' && stockRaw != null) {
    const n = Number(String(stockRaw).replace(/\s/g, '').replace(',', '.'));
    if (!Number.isNaN(n) && n >= 0) stockQty = n;
  }

  const stored = characteristicToStorage(charType, charValue);
  const importKey = materialName
    ? buildMaterialImportKey({
        materialName,
        characteristicType: charType,
        characteristicValue: charValue,
        priceUnit,
        family,
      })
    : '';

  return {
    lineNo,
    excelRowId,
    id,
    materialName,
    materialKeyRef,
    referenceFromExcel: Boolean(String(normalized['Référence principale'] ?? '').trim()),
    priceUnit,
    family,
    charType,
    charValue,
    otherDetails,
    basePrintPrice,
    blankSellPrice,
    targetMargin,
    stockQty,
    stored,
    importKey,
    visiblePos: true,
    visiblePosProvided: false,
  };
}

/**
 * 1ère occurrence gagne pour un même ID — évite qu'une ligne originale plus bas
 * dans le fichier écrase les modifications en haut (cas fréquent après export Excel).
 */
export function dedupeExcelMaterialLines(lines: MaterialExcelImportLine[]): {
  lines: MaterialExcelImportLine[];
  duplicateIssues: MaterialImportIssue[];
  duplicateIdGroups: DuplicateExcelIdGroup[];
} {
  const duplicateIdGroups = detectDuplicateExcelIds(lines);
  const duplicateIssues = duplicateExcelIdIssues(duplicateIdGroups) as MaterialImportIssue[];

  const skipIndexes = new Set<number>();
  for (const group of duplicateIdGroups) {
    for (let i = 1; i < group.entries.length; i++) {
      skipIndexes.add(group.entries[i]!.rowIndex);
    }
  }

  const kept = lines.filter((_, i) => !skipIndexes.has(i));
  return { lines: kept, duplicateIssues, duplicateIdGroups };
}

function inferCharType(row: BaseMaterialRow): CharacteristicType {
  if (row.thickness?.trim()) return 'epaisseur';
  if (row.grammage?.trim()) return 'grammage';
  return 'autre';
}

function rowImportKeyFromDb(row: BaseMaterialRow): string {
  const charType = inferCharType(row);
  const charValue = row.thickness?.trim() || row.grammage?.trim() || '';
  const materialName =
    row.normalizedName?.trim()
    || row.displayName?.trim()
    || row.label.split(/\s+\d/)[0]?.trim()
    || row.label;
  return buildMaterialImportKey({
    materialName,
    characteristicType: charType,
    characteristicValue: charValue,
    priceUnit: row.saleUnit || row.unitDisplay || 'feuille',
    family: row.family || 'Autre',
  });
}

function normalizeRefKey(ref: string): string {
  return ref
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildMaterialKeyLookup(rows: BaseMaterialRow[]): Map<string, BaseMaterialRow> {
  const map = new Map<string, BaseMaterialRow>();
  for (const row of rows) {
    const raw = normalizeRefKey(row.materialKey);
    if (raw) map.set(raw, row);
  }
  return map;
}

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function findMaterialByKeyRef(
  tx: PrismaTx,
  ref: string,
): Promise<BaseMaterialRow | null> {
  const slug = storeMainReference(ref);
  if (!slug) return null;

  const exact = await tx.baseMaterial.findUnique({ where: { materialKey: slug } });
  if (exact) return exact as BaseMaterialRow;

  return null;
}

async function resolveImportTargetWithDb(
  tx: PrismaTx,
  parsed: ReturnType<typeof parseLine>,
  byExcelRowId: Map<string, BaseMaterialRow>,
  byId: Map<string, BaseMaterialRow>,
  byImportKey: Map<string, BaseMaterialRow>,
  byMaterialKeyRef: Map<string, BaseMaterialRow>,
): Promise<{ target?: BaseMaterialRow; staleExcelId?: boolean }> {
  const memory = resolveImportTarget(parsed, byExcelRowId, byId, byImportKey, byMaterialKeyRef);
  if (memory.target) return memory;
  if (memory.staleExcelId && parsed.excelRowId) return memory;

  if (parsed.excelRowId) {
    const byExcel = await tx.baseMaterial.findUnique({ where: { excelRowId: parsed.excelRowId } });
    if (byExcel) return { target: byExcel as BaseMaterialRow };
    if (parsed.materialKeyRef) {
      const byRef = await findMaterialByKeyRef(tx, parsed.materialKeyRef);
      if (byRef) return { target: byRef };
    }
    return { staleExcelId: true };
  }

  if (parsed.materialKeyRef) {
    const byRef = await findMaterialByKeyRef(tx, parsed.materialKeyRef);
    if (byRef) return { target: byRef };
  }

  if (parsed.id && isTechnicalDbId(parsed.id)) {
    const byPk = await tx.baseMaterial.findUnique({ where: { id: parsed.id } });
    if (byPk) return { target: byPk as BaseMaterialRow };
    return { staleExcelId: true };
  }

  return {};
}

function buildImportPatch(
  parsed: ReturnType<typeof parseLine>,
  syncMode: 'full' | 'upsert',
  _target?: BaseMaterialRow,
): Record<string, unknown> {
  const label = buildCatalogLabel(parsed.materialName, parsed.charType as CharacteristicType, parsed.charValue);
  const patch: Record<string, unknown> = {
    label,
    displayName: parsed.materialName,
    normalizedName: normalizeMaterialName(parsed.materialName),
    family: parsed.family,
    saleUnit: parsed.priceUnit,
    unitDisplay: parsed.priceUnit,
    grammage: parsed.stored.grammage,
    thickness: parsed.stored.thickness,
    source: 'excel-import',
    archived: false,
    archivedAt: null,
    active: true,
    /** Publié immédiatement pour propager prix → POS / catalogue. */
    publicationStatus: 'published',
    visiblePos: true,
  };

  if (parsed.excelRowId) {
    patch.excelRowId = parsed.excelRowId;
  }

  // Ne pas écraser materialKey avec une référence auto-générée (évite collisions PAPIE-AUTRE, etc.)
  if (parsed.materialKeyRef && parsed.referenceFromExcel) {
    patch.materialKey = parsed.materialKeyRef;
  }

  if (syncMode === 'full') {
    patch.basePrintPrice = parsed.basePrintPrice;
    patch.blankSellPrice = parsed.blankSellPrice;
    if (parsed.blankSellPrice != null) patch.maxPrice = parsed.blankSellPrice;
    if (parsed.targetMargin != null) patch.targetMargin = parsed.targetMargin;
    patch.anomalyNotes = parsed.otherDetails || null;
  } else {
    if (parsed.basePrintPrice != null) patch.basePrintPrice = parsed.basePrintPrice;
    if (parsed.blankSellPrice != null) {
      patch.blankSellPrice = parsed.blankSellPrice;
      patch.maxPrice = parsed.blankSellPrice;
    }
    if (parsed.targetMargin != null) patch.targetMargin = parsed.targetMargin;
    if (parsed.otherDetails) patch.anomalyNotes = parsed.otherDetails;
  }

  return patch;
}

async function assertMaterialKeyAvailable(
  tx: PrismaTx,
  materialKey: string,
  excludeId?: string,
): Promise<void> {
  const taken = await tx.baseMaterial.findUnique({ where: { materialKey } });
  if (taken && taken.id !== excludeId) {
    throw new Error(`Référence principale « ${materialKey} » déjà utilisée par une autre matière`);
  }
}

async function generateUniqueMaterialKey(
  tx: PrismaTx,
  parsed: ReturnType<typeof parseLine>,
  index: number,
): Promise<string> {
  const baseSlug = slugKey(parsed.materialName);
  const suffix = parsed.stored.thickness || parsed.stored.grammage || '';
  const candidates = [
    parsed.materialKeyRef || '',
    buildMaterialKey(baseSlug, suffix),
    `${baseSlug}-${suffix}`,
    `${baseSlug}-${Date.now().toString(36)}-${index}`,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const taken = await tx.baseMaterial.findUnique({ where: { materialKey: candidate } });
    if (!taken) return candidate;
  }
  return `${baseSlug}-${Date.now().toString(36)}-${index}`;
}

function valuesEqual(prev: unknown, next: unknown): boolean {
  if (prev == null && next == null) return true;
  if (typeof prev === 'number' || typeof next === 'number') {
    const a = Number(prev);
    const b = Number(next);
    if (Number.isNaN(a) && Number.isNaN(b)) return true;
    return a === b;
  }
  if (prev instanceof Date) {
    return next instanceof Date ? prev.getTime() === next.getTime() : false;
  }
  return String(prev ?? '').trim() === String(next ?? '').trim();
}

function patchHasChanges(target: BaseMaterialRow, patch: Record<string, unknown>): boolean {
  return Object.keys(patch).some((k) => {
    const prev = (target as Record<string, unknown>)[k];
    return !valuesEqual(prev, patch[k]);
  });
}

function slugKey(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'matiere';
}

export function resolveImportTarget(
  parsed: ReturnType<typeof parseLine>,
  byExcelRowId: Map<string, BaseMaterialRow>,
  byId: Map<string, BaseMaterialRow>,
  byImportKey: Map<string, BaseMaterialRow>,
  byMaterialKeyRef: Map<string, BaseMaterialRow>,
): { target?: BaseMaterialRow; staleExcelId?: boolean } {
  if (parsed.excelRowId && byExcelRowId.has(parsed.excelRowId)) {
    return { target: byExcelRowId.get(parsed.excelRowId) };
  }

  if (parsed.excelRowId) {
    if (parsed.materialKeyRef) {
      const ref = normalizeRefKey(parsed.materialKeyRef);
      if (ref && byMaterialKeyRef.has(ref)) {
        return { target: byMaterialKeyRef.get(ref) };
      }
    }
    return { staleExcelId: true };
  }

  if (parsed.materialKeyRef) {
    const ref = normalizeRefKey(parsed.materialKeyRef);
    if (ref && byMaterialKeyRef.has(ref)) {
      return { target: byMaterialKeyRef.get(ref) };
    }
  }

  if (parsed.importKey && byImportKey.has(parsed.importKey)) {
    return { target: byImportKey.get(parsed.importKey) };
  }

  if (parsed.id && isTechnicalDbId(parsed.id) && byId.has(parsed.id)) {
    return { target: byId.get(parsed.id) };
  }

  if (parsed.id && isTechnicalDbId(parsed.id)) {
    return { staleExcelId: true };
  }

  return {};
}

async function listMaterialsForImport(archivedOnly: boolean): Promise<BaseMaterialRow[]> {
  if (!hasBaseMaterialDelegate(prisma)) return [];
  const where = archivedOnly ? { archived: true } : { archived: false };
  return (await prisma.baseMaterial.findMany({
    where,
    orderBy: [{ family: 'asc' }, { label: 'asc' }],
  })) as BaseMaterialRow[];
}

async function findReuseTargetByMaterialKey(
  tx: PrismaTx,
  materialKey: string,
): Promise<BaseMaterialRow | null> {
  if (!materialKey) return null;
  const row = await tx.baseMaterial.findUnique({ where: { materialKey } });
  return row ? (row as BaseMaterialRow) : null;
}

export { detectDuplicateExcelIds, formatDuplicateExcelIdGroup } from '@/lib/backoffice/material-excel-duplicate-ids';
export type { DuplicateExcelIdGroup } from '@/lib/backoffice/material-excel-duplicate-ids';

export async function importMaterialsFromExcel(
  rawLines: MaterialExcelImportLine[],
  opts?: MaterialExcelImportOptions,
): Promise<MaterialImportReport> {
  const dbRows = await listMaterialsForImport(false);
  const archivedRows = await listMaterialsForImport(true);
  const allRowsForMatch = [...dbRows, ...archivedRows];
  const deduped = dedupeExcelMaterialLines(rawLines);

  const syncMode: 'full' | 'upsert' = opts?.syncMode === 'upsert' ? 'upsert' : 'full';
  // replaceAll explicite uniquement — jamais par défaut (évite archivage massif silencieux)
  const replaceAll = syncMode === 'full' && opts?.replaceAll === true;
  const lines = deduped.lines;
  const report: MaterialImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    archived: 0,
    ignored: 0,
    errors: 0,
    dbActive: 0,
    duplicateIds: countDuplicateExcelIdSkips(deduped.duplicateIdGroups),
    syncModeUsed: syncMode,
    idsGenerated: 0,
    referencesGenerated: 0,
    activeImported: 0,
    duplicateIdGroups: deduped.duplicateIdGroups,
    issues: [...deduped.duplicateIssues],
  };

  if (!lines.length) {
    report.issues.push({ line: 1, reason: 'Fichier Excel vide' });
    return report;
  }

  const touchedIds = new Set<string>();
  /** Quantités stock à appliquer après transaction (matérières liées). */
  const stockByMaterialId = new Map<string, number>();

  const rows = dbRows;
  const byId = new Map(allRowsForMatch.map((r) => [r.id, r]));
  const byExcelRowId = new Map<string, BaseMaterialRow>();
  const byImportKey = new Map<string, BaseMaterialRow>();
  const byMaterialKeyRef = buildMaterialKeyLookup(allRowsForMatch);
  for (const row of allRowsForMatch) {
    if (row.excelRowId) byExcelRowId.set(row.excelRowId, row);
    byImportKey.set(rowImportKeyFromDb(row), row);
  }

  await prisma.$transaction(async (tx) => {
    // Ne plus archiver en tête de transaction : on archive les absents
    // uniquement en fin, si aucune erreur ligne (rollback sinon).
    const initialActiveIds = new Set(
      rows.filter((row) => !row.archived && !row.id.startsWith('print-')).map((row) => row.id),
    );

    for (let i = 0; i < lines.length; i++) {
      const parsed = parseLine(lines[i]!, i);
      if (!parsed.materialName?.trim()) {
        report.ignored += 1;
        report.issues.push({
          line: parsed.lineNo,
          field: 'Matière',
          reason: 'Nom matière manquant',
        });
        continue;
      }

      // Produits finis → Prix articles / Catalogue Articles 2026 (pas BaseMaterial)
      if (
        /roll[\s-]?up|x[\s-]?banner|\boriflamme\b|\bstylo\b|\bmug\b|\bpins?\b|\bgourde\b|\bcasquette\b|\bbob\b|\btrousse\b|\btote\s*bag\b|\bsweat\b|\bt[\s-]?shirt\b|\bpolo\b|\bflyer\b|\bcarte\s+de\s+visite\b|\bplaque\s+(pvc|plexiglass)\s+imprim|\bcalendrier\b|\bbloc[\s-]?note\b|\bhangtag\b/i.test(
          parsed.materialName,
        )
      ) {
        report.ignored += 1;
        report.issues.push({
          line: parsed.lineNo,
          field: 'Matière',
          reason: `Produit fini commercial « ${parsed.materialName} » — utiliser Prix articles / Catalogue Articles 2026`,
        });
        continue;
      }

      try {
        let { target, staleExcelId } = await resolveImportTargetWithDb(
          tx,
          parsed,
          byExcelRowId,
          byId,
          byImportKey,
          byMaterialKeyRef,
        );

        if (!target && parsed.materialKeyRef) {
          const reuse = await findReuseTargetByMaterialKey(tx, parsed.materialKeyRef);
          if (reuse) target = reuse;
        }

        /**
         * Conflit de référence : la clé appartient déjà à une autre matière.
         * → On met à jour le propriétaire de la clé (Excel = vérité métier),
         *   au lieu d’annuler tout l’import.
         */
        if (target && parsed.materialKeyRef) {
          const keyOwner = await findMaterialByKeyRef(tx, parsed.materialKeyRef);
          if (keyOwner && keyOwner.id !== target.id) {
            report.issues.push({
              line: parsed.lineNo,
              field: 'Référence principale',
              reason: `Référence « ${parsed.materialKeyRef} » déjà sur une autre matière — fusion sur la fiche existante`,
            });
            target = keyOwner as BaseMaterialRow;
          }
        }

        const patch = buildImportPatch(parsed, syncMode, target);

        if (target) {
          touchedIds.add(target.id);
          if (parsed.stockQty != null) stockByMaterialId.set(target.id, parsed.stockQty);
          if (parsed.materialKeyRef && parsed.referenceFromExcel) {
            const keyOwner = await findMaterialByKeyRef(tx, parsed.materialKeyRef);
            if (keyOwner && keyOwner.id !== target.id) {
              // Dernière sécurité : générer une clé unique plutôt qu’échouer
              patch.materialKey = await generateUniqueMaterialKey(tx, parsed, i);
              report.referencesGenerated += 1;
            } else {
              await assertMaterialKeyAvailable(tx, parsed.materialKeyRef, target.id);
            }
          }

          if (replaceAll) {
            await tx.baseMaterial.update({
              where: { id: target.id },
              data: patch as Parameters<typeof tx.baseMaterial.update>[0]['data'],
            });
            const refreshed = { ...target, ...patch, archived: false } as BaseMaterialRow;
            byId.set(refreshed.id, refreshed);
            if (refreshed.excelRowId) byExcelRowId.set(refreshed.excelRowId, refreshed);
            if (refreshed.materialKey) {
              byMaterialKeyRef.set(normalizeRefKey(refreshed.materialKey), refreshed);
            }
            const oldKey = rowImportKeyFromDb(target);
            if (oldKey !== parsed.importKey) byImportKey.delete(oldKey);
            byImportKey.set(parsed.importKey, refreshed);
            if (patchHasChanges(target, patch)) {
              report.updated += 1;
            } else {
              report.unchanged += 1;
            }
            continue;
          }

          const mustRestore = Boolean(target.archived);
          const hasChange = patchHasChanges(target, patch) || mustRestore;
          if (!hasChange) {
            report.unchanged += 1;
            continue;
          }
          await tx.baseMaterial.update({
            where: { id: target.id },
            data: patch as Parameters<typeof tx.baseMaterial.update>[0]['data'],
          });
          const refreshed = { ...target, ...patch } as BaseMaterialRow;
          byId.set(refreshed.id, refreshed);
          if (refreshed.excelRowId) byExcelRowId.set(refreshed.excelRowId, refreshed);
          if (refreshed.materialKey) {
            byMaterialKeyRef.set(normalizeRefKey(refreshed.materialKey), refreshed);
          }
          const oldKey = rowImportKeyFromDb(target);
          if (oldKey !== parsed.importKey) byImportKey.delete(oldKey);
          byImportKey.set(parsed.importKey, refreshed);
          report.updated += 1;
          continue;
        }

        // Clé déjà prise → MAJ de la ligne existante au lieu d'échouer
        if (parsed.materialKeyRef) {
          const existing = await findMaterialByKeyRef(tx, parsed.materialKeyRef);
          if (existing) {
            target = existing;
            const restorePatch = buildImportPatch(parsed, syncMode, target);
            touchedIds.add(target.id);
            await tx.baseMaterial.update({
              where: { id: target.id },
              data: restorePatch as Parameters<typeof tx.baseMaterial.update>[0]['data'],
            });
            const refreshed = { ...target, ...restorePatch, archived: false } as BaseMaterialRow;
            byId.set(refreshed.id, refreshed);
            if (parsed.stockQty != null) stockByMaterialId.set(refreshed.id, parsed.stockQty);
            if (refreshed.excelRowId) byExcelRowId.set(refreshed.excelRowId, refreshed);
            if (refreshed.materialKey) {
              byMaterialKeyRef.set(normalizeRefKey(refreshed.materialKey), refreshed);
            }
            byImportKey.set(parsed.importKey, refreshed);
            report.updated += 1;
            continue;
          }
        }

        const materialKey = await generateUniqueMaterialKey(tx, parsed, i);
        const excelRowId = parsed.excelRowId || (await nextAvailableExcelRowId(tx));
        if (!parsed.excelRowId) report.idsGenerated += 1;
        if (!parsed.referenceFromExcel && parsed.materialKeyRef) {
          report.referencesGenerated += 1;
        }

        const created = await tx.baseMaterial.create({
          data: {
            materialKey,
            excelRowId,
            label: patch.label as string,
            displayName: patch.displayName as string,
            normalizedName: patch.normalizedName as string,
            family: patch.family as string,
            grammage: patch.grammage as string | null,
            thickness: patch.thickness as string | null,
            saleUnit: patch.saleUnit as string,
            unitDisplay: patch.unitDisplay as string,
            basePrintPrice: patch.basePrintPrice as number | null | undefined,
            blankSellPrice: patch.blankSellPrice as number | null | undefined,
            maxPrice: patch.maxPrice as number | null | undefined,
            targetMargin: patch.targetMargin as number | null | undefined,
            anomalyNotes: patch.anomalyNotes as string | null | undefined,
            visiblePos: true,
            source: 'excel-import',
            publicationStatus: 'published',
            active: true,
            impactsPrice: true,
            impactsStock: true,
            archived: false,
          },
        });

        const createdRow = created as unknown as BaseMaterialRow;
        touchedIds.add(createdRow.id);
        if (parsed.stockQty != null) stockByMaterialId.set(createdRow.id, parsed.stockQty);
        byId.set(createdRow.id, createdRow);
        if (createdRow.excelRowId) byExcelRowId.set(createdRow.excelRowId, createdRow);
        if (createdRow.materialKey) {
          byMaterialKeyRef.set(normalizeRefKey(createdRow.materialKey), createdRow);
        }
        byImportKey.set(parsed.importKey, createdRow);
        report.created += 1;
        if (staleExcelId) {
          report.issues.push({
            line: parsed.lineNo,
            field: 'ID',
            reason: `ID Excel inconnu (${parsed.id}) — nouvelle matière créée`,
          });
        }
      } catch (e) {
        report.errors += 1;
        report.issues.push({
          line: parsed.lineNo,
          reason: e instanceof Error ? e.message : 'Erreur import',
        });
        // Ne plus annuler tout le replaceAll : on continue les autres lignes.
      }
    }

    // Archive les matières absentes du fichier après traitement des lignes
    if (replaceAll && touchedIds.size > 0) {
      const toArchive = rows
        .filter((row) => !row.archived && !row.id.startsWith('print-') && !touchedIds.has(row.id))
        .map((row) => row.id);

      if (toArchive.length > 0) {
        const result = await tx.baseMaterial.updateMany({
          where: { id: { in: toArchive } },
          data: {
            archived: true,
            archivedAt: new Date(),
            active: false,
            visiblePos: false,
            publicationStatus: 'draft',
          },
        });
        report.archived = result.count;
      }
    } else if (syncMode === 'full' && !replaceAll && touchedIds.size > 0) {
      // Mode full sans replaceAll : pas d’archive automatique des absents
    }

    if (replaceAll && initialActiveIds.size > 0) {
      const keptActive = [...touchedIds].filter((id) => initialActiveIds.has(id)).length;
      if (report.archived === 0) {
        report.archived = Math.max(0, initialActiveIds.size - keptActive);
      }
    }
  }, { timeout: 120_000 });

  // Applique les stocks Excel sur les fiches liées (hors transaction matières)
  if (stockByMaterialId.size > 0) {
    const { adjustStock } = await import('@/lib/services/stock-service');
    for (const [materialId, qty] of stockByMaterialId) {
      try {
        const mat = await prisma.baseMaterial.findUnique({
          where: { id: materialId },
          select: { stockItemId: true, label: true },
        });
        if (!mat?.stockItemId) continue;
        await adjustStock({
          stockItemId: mat.stockItemId,
          type: 'ajustement',
          quantity: qty,
          userId: opts?.userId,
          userName: opts?.userName,
          notes: 'Import Excel Matières & tarifs',
          reference: `excel-import:${materialId}:${qty}`,
        });
      } catch (e) {
        report.issues.push({
          line: 0,
          field: 'Stock',
          reason:
            e instanceof Error
              ? `Stock non appliqué (${materialId}): ${e.message}`
              : `Stock non appliqué (${materialId})`,
        });
      }
    }
  }

  const after = await listMaterialsForImport(false);
  report.dbActive = after.filter((r) => !String(r.id).startsWith('print-')).length;
  report.activeImported = report.dbActive;

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'IMPORT_EXCEL',
    entity: 'BaseMaterial',
    entityLabel: 'Stock & Matières',
    details: {
      module: 'Stock & Matières',
      fileName: opts?.fileName ?? null,
      syncMode,
      read: report.read,
      created: report.created,
      updated: report.updated,
      unchanged: report.unchanged,
      archived: report.archived,
      dbActive: report.dbActive,
      duplicateIds: report.duplicateIds,
      duplicateIdGroups: report.duplicateIdGroups,
      syncModeUsed: report.syncModeUsed,
      activeImported: report.activeImported,
      ignored: report.ignored,
      errors: report.errors,
      issues: report.issues.slice(0, 30),
    },
  });

  return report;
}
