import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';

export const BUSINESS_RULES_EXCEL_COLUMNS = [
  'CLÉ',
  'NOM',
  'TYPE',
  'FAMILLE',
  'ARTICLE',
  'PRIORITÉ',
  'ACTIF',
  'CONNECTÉ',
  'MESSAGE',
  'CONDITION (JSON)',
  'ACTION (JSON)',
  'ID',
] as const;

function pick(line: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = line[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseBool(v: unknown, def = true): boolean {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return def;
  return t === 'oui' || t === '1' || t === 'true' || t === 'x';
}

function parseJsonField(v: unknown, fallback: Record<string, unknown> = {}) {
  const raw = String(v ?? '').trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : fallback;
  } catch {
    return { expression: raw };
  }
}

export function businessRuleToExcelRow(
  rule: {
    id: string;
    ruleKey: string;
    ruleName: string;
    ruleType: string;
    family: string;
    articleId?: string | null;
    priority: number;
    active: boolean;
    connected: boolean;
    message?: string | null;
    condition: unknown;
    action: unknown;
  },
  excelRowId?: string | null,
) {
  return {
    CLÉ: rule.ruleKey,
    NOM: rule.ruleName,
    TYPE: rule.ruleType,
    FAMILLE: rule.family,
    ARTICLE: rule.articleId ?? '',
    PRIORITÉ: rule.priority,
    ACTIF: rule.active ? 'oui' : 'non',
    CONNECTÉ: rule.connected ? 'oui' : 'non',
    MESSAGE: rule.message ?? '',
    'CONDITION (JSON)': JSON.stringify(rule.condition ?? {}),
    'ACTION (JSON)': JSON.stringify(rule.action ?? {}),
    ID: excelRowId ?? '',
  };
}

export function parseBusinessRuleExcelRow(line: Record<string, unknown>, lineNo: number) {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  const ruleKey = pick(line, 'CLÉ', 'Cle', 'CLE', 'ruleKey');
  return {
    lineNo,
    excelRowId,
    technicalId,
    ruleKey,
    ruleName: pick(line, 'NOM', 'Nom', 'ruleName'),
    ruleType: pick(line, 'TYPE', 'Type', 'ruleType') || 'validation',
    family: pick(line, 'FAMILLE', 'Famille', 'family') || 'Général',
    articleId: pick(line, 'ARTICLE', 'Article', 'articleId') || null,
    priority: Number(pick(line, 'PRIORITÉ', 'Priorite', 'priority') || '100') || 100,
    active: parseBool(line.ACTIF ?? line.Actif, true),
    connected: parseBool(line.CONNECTÉ ?? line.Connecte, true),
    message: pick(line, 'MESSAGE', 'Message') || null,
    condition: parseJsonField(line['CONDITION (JSON)'] ?? line.CONDITION ?? line.Condition),
    action: parseJsonField(line['ACTION (JSON)'] ?? line.ACTION ?? line.Action),
  };
}

export function excelRowToRuleCanonical(line: Record<string, unknown>): Record<string, unknown> {
  const idRaw = pick(line, 'ID', 'id');
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  return {
    CLÉ: pick(line, 'CLÉ', 'Cle', 'CLE', 'ruleKey'),
    NOM: pick(line, 'NOM', 'Nom', 'ruleName'),
    excelRowId: excelRowId ?? '',
    ID: technicalId ?? idRaw,
  };
}

export function validateBusinessRulesExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) return { ok: false, message: 'Fichier vide.' };
  const hasKey = rows.some((r) => String(r.CLÉ ?? r.Cle ?? r.CLE ?? '').trim());
  const hasName = rows.some((r) => String(r.NOM ?? r.Nom ?? '').trim());
  if (!hasKey && !hasName) return { ok: false, message: 'Colonnes CLÉ ou NOM introuvables.' };
  return { ok: true, materialColumn: 'CLÉ' };
}

export function assignBusinessRuleExcelIds(
  rules: Array<{ id: string }>,
  existingMap: Record<string, string>,
) {
  const map = { ...existingMap };
  const used = new Set(Object.values(map));
  let maxNum = 0;
  for (const id of used) {
    const n = parseInt(id, 10);
    if (!Number.isNaN(n)) maxNum = Math.max(maxNum, n);
  }
  let assigned = 0;
  let preserved = 0;
  for (const r of rules) {
    if (map[r.id]) {
      preserved += 1;
      continue;
    }
    maxNum += 1;
    map[r.id] = formatExcelRowId(maxNum);
    assigned += 1;
  }
  return { map, assigned, preserved };
}
