import type { ConfigField, ConfigSection, ProductConfig } from '@/lib/data/config-types';
import {
  collectPosProgressFields,
  isFieldValueComplete,
} from '@/lib/pos/initial-config';

export type PosStepItem = {
  field: ConfigField;
  complete: boolean;
  isCurrent: boolean;
};

/** Étape wizard affichée (plusieurs champs possibles : L×P×H, matière+grammage). */
export type PosWizardStage = {
  id: string;
  label: string;
  fieldKeys: string[];
  /** Clé utilisée pour sélection / activeFieldKey */
  primaryKey: string;
  fields: ConfigField[];
  section: ConfigSection | null;
  complete: boolean;
  isCurrent: boolean;
};

export function buildPosSteps(
  productConfig: ProductConfig | null,
  config: Record<string, unknown>,
): PosStepItem[] {
  const fields = collectPosProgressFields(productConfig, config);
  const firstIncompleteIdx = fields.findIndex(
    (f) => !isFieldValueComplete(f, config[f.key], config),
  );

  return fields.map((field, idx) => ({
    field,
    complete: isFieldValueComplete(field, config[field.key], config),
    isCurrent: idx === firstIncompleteIdx,
  }));
}

export function getPosNextStepField(
  productConfig: ProductConfig | null,
  config: Record<string, unknown>,
): ConfigField | null {
  const fields = collectPosProgressFields(productConfig, config);
  return (
    fields.find((f) => !isFieldValueComplete(f, config[f.key], config)) ?? null
  );
}

function sectionForField(
  productConfig: ProductConfig,
  fieldKey: string,
): ConfigSection | null {
  for (const section of productConfig.sections) {
    if (section.fields.some((f) => f.key === fieldKey)) return section;
  }
  return null;
}

/** Matière / grammage (et synonymes) → même étape visuelle. */
export function isMaterialOrGrammageField(field: ConfigField): boolean {
  const blob = `${field.key} ${field.label}`.toLowerCase();
  return /mati[eè]re|material|grammage|papier\s*gram|weight/.test(blob);
}

function clusterKey(
  field: ConfigField,
  section: ConfigSection | null,
  sectionIdx: number,
): string {
  if (field.group) return `group:${sectionIdx}:${field.group}`;
  if (field.type === 'number' && section) {
    return `dims:${sectionIdx}`;
  }
  if (isMaterialOrGrammageField(field) && section) {
    return `support:${sectionIdx}`;
  }
  return `field:${field.key}`;
}

function stageLabel(fields: ConfigField[], section: ConfigSection | null): string {
  if (fields.length === 1) return fields[0]!.label;
  if (fields.every((f) => f.type === 'number')) {
    return section?.title?.replace(/\s*\(.*\)\s*$/, '').trim() || 'Dimensions';
  }
  if (fields.every(isMaterialOrGrammageField)) {
    const title = section?.title?.trim();
    if (title?.includes('&')) return title;
    // Intérieur / Couverture / etc. → libellé section plutôt que « Matière » seul
    if (title && !/^mati[eè]re/i.test(title) && !/^grammage/i.test(title)) {
      return title;
    }
    return 'Matière & grammage';
  }
  if (fields[0]?.group) return fields[0].group;
  return section?.title ?? fields[0]!.label;
}

/**
 * Étapes wizard compactes : regroupe L×P×H, matière+grammage, champs `group`.
 * La progression champ-par-champ (completion.done/total) reste inchangée.
 */
export function buildPosWizardStages(
  productConfig: ProductConfig | null,
  config: Record<string, unknown>,
): PosWizardStage[] {
  if (!productConfig) return [];
  const flat = collectPosProgressFields(productConfig, config);
  if (!flat.length) return [];

  const sectionIndex = new Map<ConfigSection, number>();
  productConfig.sections.forEach((s, i) => sectionIndex.set(s, i));

  const clusters: {
    id: string;
    fields: ConfigField[];
    section: ConfigSection | null;
  }[] = [];
  const clusterById = new Map<string, (typeof clusters)[number]>();

  for (const field of flat) {
    const section = sectionForField(productConfig, field.key);
    const sIdx = section ? (sectionIndex.get(section) ?? 0) : 0;
    const id = clusterKey(field, section, sIdx);
    let cluster = clusterById.get(id);
    if (!cluster) {
      cluster = { id, fields: [], section };
      clusterById.set(id, cluster);
      clusters.push(cluster);
    }
    cluster.fields.push(field);
  }

  const stages: PosWizardStage[] = clusters.map((c) => {
    let displayFields = c.fields;
    // L/P souvent exclus du stepper (SKIP_PROGRESS) mais affichés avec H
    if (c.section && c.fields.some((f) => f.type === 'number')) {
      const numbers = c.section.fields.filter((f) => f.type === 'number');
      if (numbers.length > displayFields.length) {
        displayFields = numbers;
      }
    }
    // Matière / grammage : tous les champs support de la section
    if (c.section && c.fields.every(isMaterialOrGrammageField)) {
      const support = c.section.fields.filter(isMaterialOrGrammageField);
      if (support.length > displayFields.length) {
        displayFields = support;
      }
    }

    const complete = c.fields.every((f) =>
      isFieldValueComplete(f, config[f.key], config),
    );
    return {
      id: c.id,
      label: stageLabel(displayFields, c.section),
      fieldKeys: displayFields.map((f) => f.key),
      primaryKey: c.fields[0]!.key,
      fields: displayFields,
      section: c.section,
      complete,
      isCurrent: false,
    };
  });

  const firstIncomplete = stages.findIndex((s) => !s.complete);
  if (firstIncomplete >= 0) {
    stages[firstIncomplete]!.isCurrent = true;
  }

  return stages;
}

export function resolveWizardStageIndex(
  stages: PosWizardStage[],
  activeFieldKey: string | null | undefined,
): number {
  if (!stages.length) return 0;
  if (!activeFieldKey) {
    const cur = stages.findIndex((s) => s.isCurrent);
    return cur >= 0 ? cur : 0;
  }
  const idx = stages.findIndex((s) => s.fieldKeys.includes(activeFieldKey));
  return idx >= 0 ? idx : 0;
}
