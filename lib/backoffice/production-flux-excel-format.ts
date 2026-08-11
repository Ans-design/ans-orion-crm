import type { ProductionFluxStep, ProductionFluxTransition, ProductionFluxRule } from '@/lib/data/production-flux-config';
import { formatExcelRowId, parseExcelIdColumn } from '@/lib/backoffice/material-main-reference';

export const PRODUCTION_FLUX_STEPS_COLUMNS = [
  'ÉTAPE',
  'CODE',
  'RÔLE RESPONSABLE',
  'GÉNÈRE TÂCHE',
  'PLANNING',
  'ACTIF',
  'ORDRE',
  'ID',
] as const;

export const PRODUCTION_FLUX_TRANSITIONS_COLUMNS = [
  'DEPUIS',
  'VERS',
  'RÔLE',
  'MODE',
  'GÉNÈRE TÂCHE',
  'PLANNING',
  'ACTIF',
  'LIBELLÉ',
  'ID',
] as const;

export const PRODUCTION_FLUX_RULES_COLUMNS = [
  'RÈGLE',
  'CONDITION',
  'ACTION',
  'MODULE IMPACTÉ',
  'NIVEAU',
  'ACTIF',
  'ID',
] as const;

export function stepToExcelRow(step: ProductionFluxStep, excelRowId?: string | null) {
  return {
    ÉTAPE: step.name,
    CODE: step.code,
    'RÔLE RESPONSABLE': step.responsibleRole,
    'GÉNÈRE TÂCHE': step.generatesTask ? 'oui' : 'non',
    PLANNING: step.visiblePlanning ? 'oui' : 'non',
    ACTIF: step.active ? 'oui' : 'non',
    ORDRE: step.sortOrder,
    ID: excelRowId ?? formatExcelRowId(step.sortOrder),
  };
}

export function transitionToExcelRow(t: ProductionFluxTransition, excelRowId?: string | null) {
  return {
    DEPUIS: t.fromStepId,
    VERS: t.toStepId,
    RÔLE: t.authorizedRole,
    MODE: t.mode,
    'GÉNÈRE TÂCHE': t.generatesTask ? 'oui' : 'non',
    PLANNING: t.updatesPlanning ? 'oui' : 'non',
    ACTIF: t.active ? 'oui' : 'non',
    LIBELLÉ: t.label,
    ID: excelRowId ?? t.id,
  };
}

export function ruleToExcelRow(rule: ProductionFluxRule, excelRowId?: string | null) {
  return {
    RÈGLE: rule.name,
    CONDITION: rule.condition,
    ACTION: rule.action,
    'MODULE IMPACTÉ': rule.impactedModule,
    NIVEAU: rule.level,
    ACTIF: rule.active ? 'oui' : 'non',
    ID: excelRowId ?? rule.id,
  };
}

export function validateProductionFluxExcelRows(rows: Record<string, unknown>[]) {
  if (!rows.length) {
    return { ok: false, message: 'Fichier vide.' };
  }
  const hasStep = rows.some((r) => String(r.ÉTAPE ?? r.Etape ?? '').trim());
  const hasTransition = rows.some((r) => String(r.DEPUIS ?? r.Depuis ?? '').trim());
  const hasRule = rows.some((r) => String(r.RÈGLE ?? r.Regle ?? r['RÈGLE'] ?? '').trim());
  if (!hasStep && !hasTransition && !hasRule) {
    return { ok: false, message: 'Colonnes ÉTAPE, DEPUIS ou RÈGLE introuvables.' };
  }
  return { ok: true, materialColumn: 'ÉTAPE' };
}

function parseBool(v: unknown, def = false) {
  const t = String(v ?? '').trim().toLowerCase();
  if (!t) return def;
  return t === 'oui' || t === '1' || t === 'true';
}

export function parseStepExcelRow(line: Record<string, unknown>, lineNo: number, existing?: ProductionFluxStep) {
  const idRaw = String(line.ID ?? line.id ?? '').trim();
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  const code = String(line.CODE ?? line.Code ?? existing?.code ?? '').trim();
  return {
    lineNo,
    excelRowId,
    id: technicalId || existing?.id || code || `step-${lineNo}`,
    step: {
      id: technicalId || existing?.id || code || `step-${lineNo}`,
      code: code || existing?.code || `STEP-${lineNo}`,
      name: String(line.ÉTAPE ?? line.Etape ?? existing?.name ?? '').trim(),
      description: existing?.description ?? '',
      responsibleRole: String(line['RÔLE RESPONSABLE'] ?? line.Role ?? existing?.responsibleRole ?? 'manager'),
      linkedModules: existing?.linkedModules ?? ['commande'],
      targetDelayHours: existing?.targetDelayHours ?? 24,
      active: parseBool(line.ACTIF, existing?.active ?? true),
      required: existing?.required ?? true,
      visiblePlanning: parseBool(line.PLANNING, existing?.visiblePlanning ?? false),
      generatesTask: parseBool(line['GÉNÈRE TÂCHE'], existing?.generatesTask ?? false),
      requiresValidation: existing?.requiresValidation ?? false,
      blocksNext: existing?.blocksNext ?? false,
      commandeStatut: existing?.commandeStatut ?? null,
      taskType: existing?.taskType ?? null,
      planningResource: existing?.planningResource ?? null,
      sortOrder: Number(line.ORDRE ?? line.Ordre ?? existing?.sortOrder ?? lineNo),
    } satisfies ProductionFluxStep,
  };
}

export function parseTransitionExcelRow(
  line: Record<string, unknown>,
  lineNo: number,
  existing?: ProductionFluxTransition,
) {
  const idRaw = String(line.ID ?? line.id ?? '').trim();
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  const fromStepId = String(line.DEPUIS ?? line.Depuis ?? existing?.fromStepId ?? '').trim();
  const toStepId = String(line.VERS ?? line.To ?? existing?.toStepId ?? '').trim();
  const id = technicalId || existing?.id || `t-${fromStepId}-${toStepId}` || `transition-${lineNo}`;
  return {
    lineNo,
    excelRowId,
    transition: {
      id,
      fromStepId,
      toStepId,
      condition: existing?.condition ?? '',
      authorizedRole: String(line.RÔLE ?? line.Role ?? existing?.authorizedRole ?? 'manager'),
      mode: (String(line.MODE ?? line.Mode ?? existing?.mode ?? 'manual').toLowerCase() === 'auto'
        ? 'auto'
        : 'manual') as 'auto' | 'manual',
      generatesTask: parseBool(line['GÉNÈRE TÂCHE'], existing?.generatesTask ?? false),
      updatesPlanning: parseBool(line.PLANNING, existing?.updatesPlanning ?? false),
      active: parseBool(line.ACTIF, existing?.active ?? true),
      label: String(line.LIBELLÉ ?? line.Libelle ?? existing?.label ?? `${fromStepId} → ${toStepId}`),
    } satisfies ProductionFluxTransition,
  };
}

export function parseRuleExcelRow(
  line: Record<string, unknown>,
  lineNo: number,
  existing?: ProductionFluxRule,
) {
  const idRaw = String(line.ID ?? line.id ?? '').trim();
  const { excelRowId, technicalId } = parseExcelIdColumn(idRaw);
  const name = String(line.RÈGLE ?? line.Regle ?? existing?.name ?? '').trim();
  const levelRaw = String(line.NIVEAU ?? line.Niveau ?? existing?.level ?? 'info').toLowerCase();
  const level = (['info', 'warning', 'blocking'].includes(levelRaw)
    ? levelRaw
    : existing?.level ?? 'info') as ProductionFluxRule['level'];
  return {
    lineNo,
    excelRowId,
    rule: {
      id: technicalId || existing?.id || `rule-${lineNo}`,
      name,
      condition: String(line.CONDITION ?? line.Condition ?? existing?.condition ?? ''),
      action: String(line.ACTION ?? line.Action ?? existing?.action ?? ''),
      impactedModule: String(
        line['MODULE IMPACTÉ'] ?? line.Module ?? existing?.impactedModule ?? 'production',
      ),
      level,
      active: parseBool(line.ACTIF, existing?.active ?? true),
    } satisfies ProductionFluxRule,
  };
}
