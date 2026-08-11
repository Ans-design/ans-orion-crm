import type { ConfigField, ConfigSection, ProductConfig } from '@/lib/data/config-types';
import {
  buildPaperSplitFromOptions,
  isCombinedPaperFieldKey,
  isCombinedPaperOption,
  paperTypeKeyFromMatiere,
  paperWeightKeyFromMatiere,
} from '@/lib/data/paper-material';

function splitMatiereField(field: ConfigField): ConfigField[] {
  const options = field.options ?? [];
  const hasCombined = options.some(isCombinedPaperOption);
  if (!hasCombined || !isCombinedPaperFieldKey(field.key)) return [field];

  const { types, weightsByType, defaultType, defaultWeight } = buildPaperSplitFromOptions(
    options,
    field.default as string | undefined,
  );

  const typeKey = paperTypeKeyFromMatiere(field.key);
  const weightKey = paperWeightKeyFromMatiere(field.key);

  const typeField: ConfigField = {
    key: typeKey,
    label: field.label,
    type: 'chips',
    options: types,
    default: defaultType,
    forcePriceValues: field.forcePriceValues,
    customInput: 'material',
  };

  const typesWithWeight = types.filter((t) => (weightsByType[t]?.length ?? 0) > 0);
  if (typesWithWeight.length === 0) return [typeField];

  const weightField: ConfigField = {
    key: weightKey,
    label: 'Grammage',
    type: 'chips',
    options: [],
    optionsFilter: { field: typeKey, optionsByValue: weightsByType },
    forcePriceValues: ['Grammage personnalisé', 'Autres'],
    customInput: 'grammage',
  };

  return [typeField, weightField];
}

function migrateSectionFields(fields: ConfigField[]): ConfigField[] {
  const out: ConfigField[] = [];
  let addedPaperWeight = false;

  for (const field of fields) {
    if (field.key === 'grammage') {
      out.push(field);
      continue;
    }
    const split = splitMatiereField(field);
    if (split.some((f) => f.key.startsWith('paperWeight'))) addedPaperWeight = true;
    out.push(...split);
  }

  if (addedPaperWeight) {
    return out.filter((f) => f.key !== 'grammage');
  }
  return out;
}

function migrateSections(sections: ConfigSection[]): ConfigSection[] {
  let hasPaperWeightField = false;
  const migrated = sections.map((section) => {
    const fields = migrateSectionFields(section.fields);
    if (fields.some((f) => f.key.startsWith('paperWeight') || (f.key.startsWith('grammage') && fields.some((x) => x.key.startsWith('matiere') || x.key.startsWith('paperType'))))) {
      hasPaperWeightField = true;
    }
    const hasMatiereGrammagePair = fields.some((f) => f.key.startsWith('grammage') || f.key.startsWith('paperWeight'))
      && fields.some((f) => f.key === 'matiere' || f.key.startsWith('matiere_') || f.key.startsWith('paperType') || f.key === 'famille_papier');
    return {
      ...section,
      layout: hasMatiereGrammagePair ? (section.layout ?? 'grid-2') : section.layout,
      fields,
    };
  });

  return migrated.filter((section) => {
    if (hasPaperWeightField && section.title === 'Grammage') {
      const onlyLegacyGrammage = section.fields.every((f) => f.key === 'grammage');
      if (onlyLegacyGrammage) return false;
    }
    return section.fields.length > 0;
  });
}

/** Transforme configs : chips fusionnées → paperType + paperWeight filtré */
export function migrateProductConfigPaper(config: ProductConfig): ProductConfig {
  return { ...config, sections: migrateSections(config.sections) };
}
