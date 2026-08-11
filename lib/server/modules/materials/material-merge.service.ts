import { logAudit } from '@/lib/audit';
import { listBaseMaterials, patchBaseMaterial, archiveBaseMaterial, type BaseMaterialRow } from '../pricing/base-material.repository';
import { buildMaterialKey, normalizeMaterialName } from './material-key';
import { parseMaterialLabel, uniqueMaterialKey, uniqueVariantKey } from './material-label-parse';

export type MaterialMergeConflict = {
  type: 'price' | 'stock' | 'reference' | 'status';
  message: string;
  keptId: string;
  mergedId: string;
};

export type CleanAndMergeMaterialsResult = {
  scanned: number;
  groupsFound: number;
  merged: number;
  archived: number;
  conflicts: MaterialMergeConflict[];
  anomalies: string[];
};

const STATUS_PRIORITY: Record<string, number> = {
  published: 4,
  draft: 3,
  review: 2,
  unpublished: 1,
};

function pickKeeper<T extends { id: string; publicationStatus?: string; basePrintPrice?: number | null; stockItemId?: string | null; updatedAt?: Date }>(
  a: T,
  b: T,
): { keeper: T; loser: T } {
  const score = (row: T) => {
    let s = STATUS_PRIORITY[row.publicationStatus ?? 'draft'] ?? 0;
    if (row.basePrintPrice != null) s += 2;
    if (row.stockItemId) s += 2;
    return s;
  };
  return score(a) >= score(b) ? { keeper: a, loser: b } : { keeper: b, loser: a };
}

const GENERIC_LABEL = /^mati[eè]re\s+article$|^sans\s+nom$|^—$|^-$/i;

function tryResolveLabel(row: BaseMaterialRow): string | null {
  if (row.normalizedName?.trim() && !GENERIC_LABEL.test(row.normalizedName.trim())) {
    return row.normalizedName.trim();
  }
  const key = row.materialKey?.trim();
  if (key && key.length > 2 && !key.startsWith('print-') && !/^cmr/i.test(key)) {
    const fromKey = key.replace(/[-_:]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (fromKey && !GENERIC_LABEL.test(fromKey)) return fromKey;
  }
  if (row.family?.trim() && row.family !== '—' && !/^autre$/i.test(row.family)) {
    return row.family.trim();
  }
  return null;
}

/**
 * Nettoie et fusionne les doublons BaseMaterial :
 * - regroupe par matière normalisée + famille
 * - fusionne déclinaisons identiques (grammage/épaisseur/laize)
 * - archive les doublons, conserve prix/stock/fournisseurs
 */
export async function cleanAndMergeMaterials(opts?: {
  userId?: string;
  userName?: string;
  dryRun?: boolean;
}): Promise<CleanAndMergeMaterialsResult> {
  const { rows } = await listBaseMaterials({ activeOnly: false });
  const result: CleanAndMergeMaterialsResult = {
    scanned: rows.length,
    groupsFound: 0,
    merged: 0,
    archived: 0,
    conflicts: [],
    anomalies: [],
  };

  for (const row of rows) {
    const label = row.label?.trim() ?? '';
    if (!GENERIC_LABEL.test(label)) continue;
    const resolved = tryResolveLabel(row);
    if (resolved) {
      if (!opts?.dryRun) {
        await patchBaseMaterial(row.id, {
          label: resolved,
          normalizedName: normalizeMaterialName(resolved),
          anomalyNotes: 'Nom normalisé depuis import générique',
        });
      }
      row.label = resolved;
      row.normalizedName = normalizeMaterialName(resolved);
    } else {
      result.anomalies.push(`Nom matière manquant — ${row.id}`);
    }
  }

  const byBase = new Map<string, typeof rows>();
  for (const row of rows) {
    const parsed = parseMaterialLabel(row.label, row.family);
    const baseKey = uniqueMaterialKey(parsed.normalizedName || row.normalizedName || row.label, row.family);
    const list = byBase.get(baseKey) ?? [];
    list.push(row);
    byBase.set(baseKey, list);
  }
  result.groupsFound = byBase.size;

  for (const [, groupRows] of byBase) {
    const variantMap = new Map<string, (typeof rows)[0]>();

    for (const row of groupRows) {
      const parsed = parseMaterialLabel(row.label, row.family);
      const baseKey = uniqueMaterialKey(parsed.normalizedName || row.label, row.family);
      const charType = parsed.characteristicType ?? (row.grammage ? 'grammage' : row.thickness ? 'epaisseur' : 'autre');
      const value = parsed.value ?? row.grammage ?? row.thickness ?? row.label;
      const unit = parsed.unit ?? (row.grammage ? 'g' : row.thickness ? 'mm' : null);
      const variantKey = uniqueVariantKey(baseKey, charType, value, unit);

      const existing = variantMap.get(variantKey);
      if (!existing) {
        variantMap.set(variantKey, row);
        continue;
      }

      const { keeper, loser } = pickKeeper(existing, row);

      if (
        keeper.basePrintPrice != null &&
        loser.basePrintPrice != null &&
        Math.abs(keeper.basePrintPrice - loser.basePrintPrice) > 0.01
      ) {
        result.conflicts.push({
          type: 'price',
          message: `Conflit prix doublon — ${keeper.label} vs ${loser.label}`,
          keptId: keeper.id,
          mergedId: loser.id,
        });
        result.anomalies.push(`Conflit prix: ${keeper.label} / ${loser.label}`);
      }

      if (keeper.stockItemId && loser.stockItemId && keeper.stockItemId !== loser.stockItemId) {
        result.conflicts.push({
          type: 'stock',
          message: `Conflit stock lié — ${keeper.label} vs ${loser.label}`,
          keptId: keeper.id,
          mergedId: loser.id,
        });
      }

      const patch: Record<string, unknown> = {};
      if (keeper.basePrintPrice == null && loser.basePrintPrice != null) patch.basePrintPrice = loser.basePrintPrice;
      if (keeper.purchasePrice == null && loser.purchasePrice != null) patch.purchasePrice = loser.purchasePrice;
      if (!keeper.stockItemId && loser.stockItemId) patch.stockItemId = loser.stockItemId;
      if (!keeper.normalizedName) patch.normalizedName = parsed.normalizedName;
      const baseName = parsed.baseName || stripBaseName(keeper.label);
      if (baseName && keeper.label !== baseName && !keeper.grammage && !keeper.thickness) {
        patch.label = baseName;
        patch.materialKey = buildMaterialKey(normalizeMaterialName(baseName), keeper.grammage ?? loser.grammage);
      }

      if (!opts?.dryRun) {
        if (Object.keys(patch).length > 0) {
          await patchBaseMaterial(keeper.id, patch);
        }
        await archiveBaseMaterial(loser.id);
        await logAudit({
          userId: opts?.userId,
          userName: opts?.userName,
          action: 'MATERIAL_MERGE',
          entity: 'BaseMaterial',
          entityId: keeper.id,
          details: { mergedId: loser.id, keeperLabel: keeper.label, loserLabel: loser.label },
        });
      }

      variantMap.set(variantKey, { ...keeper, ...patch } as typeof keeper);
      result.merged += 1;
      if (!opts?.dryRun) result.archived += 1;
    }
  }

  return result;
}

function stripBaseName(label: string): string {
  return parseMaterialLabel(label).baseName;
}
