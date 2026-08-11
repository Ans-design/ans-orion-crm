/**
 * Validation des règles SI/ALORS OptionDependency (§14).
 * Pure : graphe champ→champ + contradictions locales.
 */

export type OptionDependencyEdge = {
  id?: string;
  articleId: string;
  sourceField: string;
  sourceValue: string;
  targetField: string;
  allowedValues?: string | string[];
  action?: string;
};

export type OptionDependencyIssue = {
  code: 'CYCLE' | 'SELF_EDGE' | 'CONTRADICTION' | 'EMPTY_TARGET';
  severity: 'error' | 'warning';
  message: string;
  articleId: string;
  ruleIds?: string[];
  path?: string[];
};

function norm(s: string): string {
  return String(s ?? '').trim().toLowerCase();
}

function parseAllowed(raw: string | string[] | undefined): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  return String(raw ?? '')
    .split(/[|,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** DFS cycle sur graphe orienté champs (par article). */
export function findFieldCycles(
  edges: Array<{ sourceField: string; targetField: string }>,
): string[][] {
  const adj = new Map<string, Set<string>>();
  for (const e of edges) {
    const s = norm(e.sourceField);
    const t = norm(e.targetField);
    if (!s || !t || s === t) continue;
    if (!adj.has(s)) adj.set(s, new Set());
    adj.get(s)!.add(t);
  }

  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();
  const stack: string[] = [];

  function dfs(node: string) {
    if (done.has(node)) return;
    if (visiting.has(node)) {
      const i = stack.indexOf(node);
      if (i >= 0) cycles.push([...stack.slice(i), node]);
      return;
    }
    visiting.add(node);
    stack.push(node);
    for (const next of adj.get(node) ?? []) dfs(next);
    stack.pop();
    visiting.delete(node);
    done.add(node);
  }

  for (const node of adj.keys()) dfs(node);
  return cycles;
}

/**
 * Valide un jeu de règles (existant + candidat éventuel).
 * Les cycles et auto-dépendances sont des erreurs bloquantes ;
 * contradictions show/hide ou filtres incompatibles = warning.
 */
export function validateOptionDependencies(
  rows: OptionDependencyEdge[],
): OptionDependencyIssue[] {
  const issues: OptionDependencyIssue[] = [];

  const byArticle = new Map<string, OptionDependencyEdge[]>();
  for (const row of rows) {
    const aid = String(row.articleId ?? '').trim();
    if (!aid) continue;
    if (!byArticle.has(aid)) byArticle.set(aid, []);
    byArticle.get(aid)!.push(row);
  }

  for (const [articleId, list] of byArticle) {
    for (const r of list) {
      if (!norm(r.targetField)) {
        issues.push({
          code: 'EMPTY_TARGET',
          severity: 'error',
          message: 'Champ cible vide',
          articleId,
          ruleIds: r.id ? [r.id] : undefined,
        });
      }
      if (norm(r.sourceField) && norm(r.sourceField) === norm(r.targetField)) {
        issues.push({
          code: 'SELF_EDGE',
          severity: 'error',
          message: `Le champ « ${r.sourceField} » ne peut pas se conditionner lui-même`,
          articleId,
          ruleIds: r.id ? [r.id] : undefined,
        });
      }
    }

    for (const path of findFieldCycles(list)) {
      issues.push({
        code: 'CYCLE',
        severity: 'error',
        message: `Cycle de champs : ${path.join(' → ')}`,
        articleId,
        path,
      });
    }

    // Contradictions : même SI (sourceField+sourceValue) + même target, actions ou ensembles incompatibles
    const groups = new Map<string, OptionDependencyEdge[]>();
    for (const r of list) {
      const key = `${norm(r.sourceField)}|${norm(r.sourceValue)}|${norm(r.targetField)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const actions = new Set(group.map((g) => norm(g.action || 'filter')));
      if (actions.has('show') && actions.has('hide')) {
        issues.push({
          code: 'CONTRADICTION',
          severity: 'warning',
          message: `Contradiction show/hide sur ${group[0].targetField} (SI ${group[0].sourceField}=${group[0].sourceValue})`,
          articleId,
          ruleIds: group.map((g) => g.id).filter(Boolean) as string[],
        });
      }
      const allowedSets = group.map((g) => new Set(parseAllowed(g.allowedValues).map(norm)));
      if (allowedSets.length >= 2 && allowedSets.every((s) => s.size > 0)) {
        const inter = [...allowedSets[0]].filter((v) => allowedSets.every((s) => s.has(v)));
        if (inter.length === 0) {
          issues.push({
            code: 'CONTRADICTION',
            severity: 'warning',
            message: `Filtres incompatibles (intersection vide) sur ${group[0].targetField}`,
            articleId,
            ruleIds: group.map((g) => g.id).filter(Boolean) as string[],
          });
        }
      }
    }
  }

  return issues;
}

/** True si l’ajout de `candidate` créerait un cycle (ou self-edge) pour l’article. */
export function wouldCreateBlockingIssue(
  existing: OptionDependencyEdge[],
  candidate: OptionDependencyEdge,
): OptionDependencyIssue | null {
  const merged = [
    ...existing.filter((e) => !candidate.id || e.id !== candidate.id),
    candidate,
  ];
  const issues = validateOptionDependencies(merged).filter((i) => i.severity === 'error');
  return issues[0] ?? null;
}
