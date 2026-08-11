import { excelRowToCanonical } from '@/lib/backoffice/material-excel-format';
import { isTechnicalDbId } from '@/lib/backoffice/material-main-reference';

export type DuplicateExcelIdEntry = {
  lineNo: number;
  materialName: string;
  reference: string;
  rowIndex: number;
};

export type DuplicateExcelIdGroup = {
  excelId: string;
  entries: DuplicateExcelIdEntry[];
  keptLineNo: number;
  keptMaterial: string;
  /** Matières différentes sur le même ID — erreur métier */
  hasConflictingMaterials: boolean;
};

function lineLabel(entry: DuplicateExcelIdEntry): string {
  const mat = entry.materialName.trim() || '—';
  const ref = entry.reference.trim();
  return ref ? `L${entry.lineNo} « ${mat} » (${ref})` : `L${entry.lineNo} « ${mat} »`;
}

/** Détecte les ID Excel en doublon avec détail des lignes pour correction. */
export function detectDuplicateExcelIds(
  lines: Record<string, unknown>[],
  canonicalize: (line: Record<string, unknown>) => Record<string, unknown> = excelRowToCanonical,
): DuplicateExcelIdGroup[] {
  const byId = new Map<string, DuplicateExcelIdEntry[]>();

  for (let i = 0; i < lines.length; i++) {
    const norm = canonicalize(lines[i] ?? {});
    const excelRowId = String(norm.excelRowId ?? '').trim();
    const techId = String(norm.ID ?? '').trim();
    const idKey = excelRowId || (isTechnicalDbId(techId) ? techId : '');
    if (!idKey) continue;

    const entry: DuplicateExcelIdEntry = {
      lineNo: i + 2,
      materialName: String(norm.Matière ?? norm.LIBELLÉ ?? norm['Libellé'] ?? '').trim(),
      reference: String(norm['Référence principale'] ?? norm.CHAMP ?? norm.Champ ?? '').trim(),
      rowIndex: i,
    };

    const list = byId.get(idKey) ?? [];
    list.push(entry);
    byId.set(idKey, list);
  }

  const groups: DuplicateExcelIdGroup[] = [];

  for (const [excelId, entries] of byId) {
    if (entries.length < 2) continue;

    const materials = new Set(
      entries.map((e) => e.materialName.trim().toLowerCase()).filter(Boolean),
    );
    const kept = entries[0]!;

    groups.push({
      excelId,
      entries,
      keptLineNo: kept.lineNo,
      keptMaterial: kept.materialName.trim() || '—',
      hasConflictingMaterials: materials.size > 1,
    });
  }

  return groups.sort((a, b) => a.keptLineNo - b.keptLineNo);
}

export function formatDuplicateExcelIdGroup(group: DuplicateExcelIdGroup): string {
  const allLines = group.entries.map(lineLabel).join(' · ');
  const conflict = group.hasConflictingMaterials
    ? ' — matières différentes sur le même ID, corrigez l’Excel'
    : '';
  return `ID « ${group.excelId} » en doublon (${group.entries.length} lignes) : ${allLines}. Conservée : L${group.keptLineNo} « ${group.keptMaterial} »${conflict}`;
}

export function duplicateExcelIdIssues(groups: DuplicateExcelIdGroup[]): Array<{
  line: number;
  field: string;
  reason: string;
}> {
  const issues: Array<{ line: number; field: string; reason: string }> = [];

  for (const group of groups) {
    const summary = formatDuplicateExcelIdGroup(group);
    issues.push({
      line: group.keptLineNo,
      field: 'ID',
      reason: summary,
    });

    for (let i = 1; i < group.entries.length; i++) {
      const entry = group.entries[i]!;
      issues.push({
        line: entry.lineNo,
        field: 'ID',
        reason: `Ignorée — ID « ${group.excelId} » déjà utilisé L${group.keptLineNo} « ${group.keptMaterial} ». ${lineLabel(entry)}`,
      });
    }
  }

  return issues;
}

export function countDuplicateExcelIdSkips(groups: DuplicateExcelIdGroup[]): number {
  return groups.reduce((sum, g) => sum + Math.max(0, g.entries.length - 1), 0);
}
