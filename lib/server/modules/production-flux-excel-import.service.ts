import {
  getProductionFluxConfig,
  saveProductionFluxConfig,
} from '@/lib/services/production-flux-service';
import {
  parseStepExcelRow,
  parseTransitionExcelRow,
  parseRuleExcelRow,
} from '@/lib/backoffice/production-flux-excel-format';
import type { ProductionFluxConfig } from '@/lib/data/production-flux-config';

export type ProductionFluxImportReport = {
  read: number;
  created: number;
  updated: number;
  unchanged: number;
  ignored: number;
  errors: number;
  issues: Array<{ line: number; field?: string; reason: string }>;
};

function isStepLine(line: Record<string, unknown>) {
  return Boolean(String(line.ÉTAPE ?? line.Etape ?? '').trim());
}

function isTransitionLine(line: Record<string, unknown>) {
  return Boolean(String(line.DEPUIS ?? line.Depuis ?? '').trim());
}

function isRuleLine(line: Record<string, unknown>) {
  return Boolean(String(line.RÈGLE ?? line.Regle ?? '').trim());
}

export async function importProductionFluxFromExcel(
  rawLines: Record<string, unknown>[],
  opts?: { userId?: string },
): Promise<ProductionFluxImportReport> {
  const report: ProductionFluxImportReport = {
    read: rawLines.length,
    created: 0,
    updated: 0,
    unchanged: 0,
    ignored: 0,
    errors: 0,
    issues: [],
  };

  const config = await getProductionFluxConfig();
  const byStepCode = new Map(config.steps.map((s) => [s.code, s]));
  const byStepId = new Map(config.steps.map((s) => [s.id, s]));
  const byTransitionId = new Map(config.transitions.map((t) => [t.id, t]));
  const byRuleId = new Map(config.rules.map((r) => [r.id, r]));

  const nextSteps = [...config.steps];
  const nextTransitions = [...config.transitions];
  const nextRules = [...config.rules];

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i]!;
    const lineNo = i + 2;

    if (isStepLine(line)) {
      const code = String(line.CODE ?? line.Code ?? '').trim();
      const existing =
        (code ? byStepCode.get(code) : undefined) ?? byStepId.get(String(line.ID ?? ''));
      const parsed = parseStepExcelRow(line, lineNo, existing);

      if (!parsed.step.name) {
        report.ignored += 1;
        report.issues.push({ line: lineNo, field: 'ÉTAPE', reason: 'Nom étape manquant' });
        continue;
      }

      const idx = nextSteps.findIndex((s) => s.id === parsed.step.id);
      if (idx >= 0) {
        const prev = nextSteps[idx]!;
        const same = JSON.stringify(prev) === JSON.stringify(parsed.step);
        if (same) report.unchanged += 1;
        else {
          nextSteps[idx] = parsed.step;
          report.updated += 1;
        }
      } else {
        nextSteps.push(parsed.step);
        report.created += 1;
      }
      continue;
    }

    if (isTransitionLine(line)) {
      const idRaw = String(line.ID ?? '').trim();
      const existing = idRaw ? byTransitionId.get(idRaw) : undefined;
      const parsed = parseTransitionExcelRow(line, lineNo, existing);

      if (!parsed.transition.fromStepId || !parsed.transition.toStepId) {
        report.ignored += 1;
        report.issues.push({ line: lineNo, field: 'DEPUIS/VERS', reason: 'Transition incomplète' });
        continue;
      }

      const idx = nextTransitions.findIndex((t) => t.id === parsed.transition.id);
      if (idx >= 0) {
        const prev = nextTransitions[idx]!;
        const same = JSON.stringify(prev) === JSON.stringify(parsed.transition);
        if (same) report.unchanged += 1;
        else {
          nextTransitions[idx] = parsed.transition;
          report.updated += 1;
        }
      } else {
        nextTransitions.push(parsed.transition);
        report.created += 1;
      }
      continue;
    }

    if (isRuleLine(line)) {
      const idRaw = String(line.ID ?? '').trim();
      const existing = idRaw ? byRuleId.get(idRaw) : undefined;
      const parsed = parseRuleExcelRow(line, lineNo, existing);

      if (!parsed.rule.name) {
        report.ignored += 1;
        report.issues.push({ line: lineNo, field: 'RÈGLE', reason: 'Nom règle manquant' });
        continue;
      }

      const idx = nextRules.findIndex((r) => r.id === parsed.rule.id);
      if (idx >= 0) {
        const prev = nextRules[idx]!;
        const same = JSON.stringify(prev) === JSON.stringify(parsed.rule);
        if (same) report.unchanged += 1;
        else {
          nextRules[idx] = parsed.rule;
          report.updated += 1;
        }
      } else {
        nextRules.push(parsed.rule);
        report.created += 1;
      }
      continue;
    }

    report.ignored += 1;
  }

  const finalConfig: ProductionFluxConfig = {
    ...config,
    steps: nextSteps.sort((a, b) => a.sortOrder - b.sortOrder),
    transitions: nextTransitions,
    rules: nextRules,
  };

  await saveProductionFluxConfig(finalConfig, opts?.userId);
  return report;
}
