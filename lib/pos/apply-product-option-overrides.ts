import type { ConfigField, ConfigSection, ProductConfig } from '@/lib/data/config-types';
import type {
  FieldOptionOverride,
  OptionDependencyRule,
  ProductOptionOverrides,
} from '@/lib/pos/product-option-overrides.types';
import { dedupeFormatOptions } from '@/lib/pos/normalize-format-options';

function filterOptions(options: string[] | undefined, inactive: Set<string>): string[] | undefined {
  if (!options?.length || !inactive.size) return options;
  return options.filter((o) => !inactive.has(o));
}

function isFormatFieldKey(key: string): boolean {
  return /format|dimension|taille|^dim$/i.test(key) && !/grammage/.test(key);
}

function mergeActiveLabels(
  base: string[] | undefined,
  activeFromAdmin: string[] | undefined,
  inactive: Set<string>,
  dedupeFormats = false,
): string[] {
  const fromAdmin = (activeFromAdmin ?? []).filter((l) => !inactive.has(l));
  let merged: string[];
  if (fromAdmin.length) {
    // Admin = source de vérité : union ordonnée Admin puis legacy non dupliqués
    const seen = new Set(fromAdmin.map((l) => l.toLowerCase()));
    const extras = (base ?? []).filter((l) => !inactive.has(l) && !seen.has(l.toLowerCase()));
    merged = [...fromAdmin, ...extras];
  } else {
    merged = filterOptions(base, inactive) ?? [];
  }
  if (dedupeFormats && merged.length) {
    return dedupeFormatOptions(merged);
  }
  return merged;
}

function filterFieldOptions(field: ConfigField, override: FieldOptionOverride | undefined): ConfigField {
  if (!override) return field;

  const inactive = new Set(override.inactiveValueLabels);
  const next: ConfigField = { ...field };
  const dedupeFormats = isFormatFieldKey(field.key);

  if (next.options || override.activeValueLabels?.length) {
    next.options = mergeActiveLabels(next.options, override.activeValueLabels, inactive, dedupeFormats);
  }

  if (next.optionsFilter?.optionsByValue) {
    const optionsByValue: Record<string, string[]> = {};
    for (const [key, opts] of Object.entries(next.optionsFilter.optionsByValue)) {
      let filtered = filterOptions(opts, inactive) ?? [];
      if (dedupeFormats) filtered = dedupeFormatOptions(filtered);
      optionsByValue[key] = filtered;
    }
    next.optionsFilter = { ...next.optionsFilter, optionsByValue };
  }

  // Injecter dépendances Admin → optionsFilter si absentes
  if (override.dependencies?.length && !next.optionsFilter) {
    const depsForField = override.dependencies.filter((d) => d.targetField === field.key);
    if (depsForField.length) {
      const optionsByValue: Record<string, string[]> = {};
      for (const d of depsForField) {
        optionsByValue[d.sourceValue] = d.allowedValues;
      }
      next.optionsFilter = {
        field: depsForField[0]!.sourceField,
        optionsByValue,
      };
    }
  }

  if (next.palette?.length) {
    next.palette = next.palette.filter((p) => !inactive.has(p.label) && !inactive.has(p.id));
  }

  if (next.paletteFilter?.palettes) {
    const palettes: Record<string, NonNullable<ConfigField['palette']>> = {};
    for (const [key, entries] of Object.entries(next.paletteFilter.palettes)) {
      palettes[key] = entries.filter((p) => !inactive.has(p.label) && !inactive.has(p.id));
    }
    next.paletteFilter = { ...next.paletteFilter, palettes };
  }

  return next;
}

function isFieldHiddenInPos(field: ConfigField, override: FieldOptionOverride | undefined): boolean {
  if (field.posHidden) return true;
  if (!override) return false;
  return !override.active || !override.visiblePos;
}

function applyToField(
  field: ConfigField,
  overrides: ProductOptionOverrides | null,
  articleDeps?: OptionDependencyRule[],
): ConfigField | null {
  const override = overrides?.fields[field.key];
  if (isFieldHiddenInPos(field, override)) return null;
  let next = filterFieldOptions(field, override);

  // Dépendances article-level (ex. housse) → optionsFilter sur le champ cible
  const deps = [
    ...(articleDeps ?? []),
    ...(override?.dependencies ?? []),
    ...(overrides?.dependencies ?? []),
  ].filter((d) => d.targetField === field.key);
  if (deps.length && !next.optionsFilter) {
    const optionsByValue: Record<string, string[]> = {};
    for (const d of deps) {
      optionsByValue[d.sourceValue] = d.allowedValues;
    }
    next = {
      ...next,
      optionsFilter: {
        field: deps[0]!.sourceField,
        optionsByValue,
      },
    };
  }
  return next;
}

function applyToSection(
  section: ConfigSection,
  overrides: ProductOptionOverrides | null,
): ConfigSection | null {
  if (section.posHidden) return null;

  const fields = section.fields
    .map((f) => applyToField(f, overrides, overrides?.dependencies))
    .filter((f): f is ConfigField => f != null);

  if (!fields.length) return null;

  return { ...section, fields };
}

/** Applique les flags backoffice (actif, visible POS, valeurs Admin) sur la config catalogue. */
export function applyProductOptionOverrides(
  config: ProductConfig | null,
  overrides: ProductOptionOverrides | null,
): ProductConfig | null {
  if (!config) return null;
  if (!overrides || !Object.keys(overrides.fields).length) return config;

  const sections = config.sections
    .map((s) => applyToSection(s, overrides))
    .filter((s): s is ConfigSection => s != null);

  return { ...config, sections };
}

export function getFieldOverride(
  overrides: ProductOptionOverrides | null,
  fieldKey: string,
): FieldOptionOverride | undefined {
  return overrides?.fields[fieldKey];
}

/** Filtre runtime des options selon dépendances + config courante. */
export function filterOptionsByDependencies(
  fieldKey: string,
  options: string[],
  config: Record<string, unknown>,
  dependencies?: OptionDependencyRule[] | null,
): string[] {
  if (!dependencies?.length) return options;
  const rules = dependencies.filter((d) => d.targetField === fieldKey && (d.action ?? 'filter') === 'filter');
  if (!rules.length) return options;
  for (const rule of rules) {
    const src = String(config[rule.sourceField] ?? '').trim();
    if (src && src.toLowerCase() === rule.sourceValue.toLowerCase()) {
      const allowed = new Set(rule.allowedValues.map((v) => v.toLowerCase()));
      return options.filter((o) => allowed.has(o.toLowerCase()));
    }
  }
  return options;
}
