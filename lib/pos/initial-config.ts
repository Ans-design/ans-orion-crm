import type { ConfigField, ConfigSection, ProductConfig } from '@/lib/data/config-types';
import { getSelectionMode, isMultipleSelectionComplete } from '@/lib/pos/chip-selection';
import {
  isCornerRoundingComplete,
  parseCornerRounding,
} from '@/lib/finition/corner-rounding';
import { resolveAutocopiantColorCount, isAutocopiantCustomCopyCount } from '@/lib/pos/autocopiant-policy';

const SKIP_PROGRESS_KEYS = /_mm|_cm|profondeur/;
const SKIP_PROGRESS = new Set([
  'remarques',
  'note_production',
  'note_emplacement_marquage',
  'fichier_visuel',
  'fichier_joint',
  'longueur',
  'largeur',
  'cliche',
  'nb_perforations',
  'description',
]);

/** Laize / plaque : hors progression si format ISO (A0–A5), obligatoire seulement en personnalisé. */
const LAIZE_PROGRESS_KEYS = new Set([
  'laize',
  'laize_autre',
  'laize_plaque',
  'laize_plaque_autre',
]);

export function isPosProgressField(field: ConfigField): boolean {
  if (field.type === 'textarea') return false;
  if (field.required === false) return false;
  if (SKIP_PROGRESS.has(field.key)) return false;
  if (SKIP_PROGRESS_KEYS.test(field.key)) return false;
  return true;
}

function sectionVisible(section: ConfigSection, config: Record<string, unknown>): boolean {
  if (section.posHidden) return false;
  if (!section.showWhen) return true;
  const depVal = config[section.showWhen.field];
  return section.showWhen.values.includes(depVal as string);
}

function fieldVisible(field: ConfigField, config: Record<string, unknown>): boolean {
  if (field.posHidden) return false;
  if (!field.showWhen) return true;
  const depVal = config[field.showWhen.field];
  return field.showWhen.values.includes(depVal as string);
}

function isLaizeRequiredForProgress(config: Record<string, unknown>): boolean {
  const fmt = String(config.format ?? '').trim().toLowerCase();
  if (!fmt) return false;
  // Aligné sur isGrandFormatCustomFormat — sans import GF (évite cycles vitest)
  return fmt.includes('format personnalisé') || fmt === 'autres';
}

/** Champs obligatoires visibles selon la config courante (showWhen). */
export function collectPosProgressFields(
  productConfig: ProductConfig | null,
  config: Record<string, unknown> = {},
): ConfigField[] {
  if (!productConfig) return [];
  const laizeNeeded = isLaizeRequiredForProgress(config);
  return productConfig.sections.flatMap((section) => {
    if (!sectionVisible(section, config)) return [];
    return section.fields.filter((field) => {
      if (!isPosProgressField(field) || !fieldVisible(field, config)) return false;
      // Formats ISO : ne pas bloquer panier / chips « Laize » manquante
      if (LAIZE_PROGRESS_KEYS.has(field.key) && !laizeNeeded) return false;
      return true;
    });
  });
}

export function isFieldValueComplete(field: ConfigField, val: unknown, config?: Record<string, unknown>): boolean {
  if (field.type === 'corner_rounding') {
    const cr = parseCornerRounding(val ?? config?.cornerRounding);
    return isCornerRoundingComplete(cr);
  }
  if (field.type === 'chips_multi') {
    if (field.key === 'couleurs_souches' && config) {
      const needed = resolveAutocopiantColorCount(config);
      const selected = Array.isArray(val) ? val : [];
      return selected.length === needed;
    }
    return isMultipleSelectionComplete(field, val);
  }
  if (field.type === 'chips') {
    if (getSelectionMode(field) === 'single') {
      return val !== '' && val !== undefined && val !== null;
    }
    return isMultipleSelectionComplete(field, val);
  }
  if (field.type === 'size_qty_table') {
    if (typeof val !== 'object' || val === null || Array.isArray(val)) return false;
    return Object.values(val as Record<string, number>).some((q) => (q || 0) > 0);
  }
  if (field.type === 'bache_eyelets') {
    const data = val as { mode?: string; positions?: unknown[]; customCount?: number; count?: number };
    if (!data?.mode || data.mode === 'Aucun') return true;
    if (data.mode === 'Nombre personnalisé') {
      const n = data.customCount ?? data.count ?? 0;
      return n > 0;
    }
    if (data.mode === 'Placement manuel') {
      return Array.isArray(data.positions) && data.positions.length > 0;
    }
    return true;
  }
  if (field.type === 'number') {
    if (field.key === 'nb_copies' && config && isAutocopiantCustomCopyCount(config)) {
      const n = typeof val === 'number' ? val : parseInt(String(val ?? ''), 10);
      return Number.isFinite(n) && n > 4;
    }
    if (val === '' || val === undefined || val === null) return false;
    const n = typeof val === 'number' ? val : parseFloat(String(val));
    const min = field.min ?? 1;
    return Number.isFinite(n) && n >= min;
  }
  return val !== '' && val !== undefined && val !== null;
}

/** Config POS vierge — aucune chip présélectionnée (defaults réservés aux hints UI). */
/** Applique les valeurs par défaut des champs optionnels (ex. finitions « Sans »). */
export function applyOptionalFieldDefaults(
  productConfig: ProductConfig | null,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (!productConfig) return config;
  const next = { ...config };
  for (const section of productConfig.sections) {
    for (const field of section.fields) {
      if (field.required === false && field.default !== undefined && field.default !== null) {
        const val = next[field.key];
        if (val === '' || val === undefined || val === null) {
          next[field.key] = field.default;
        }
      }
    }
  }
  return next;
}

export function buildEmptyPosConfig(productConfig: ProductConfig | null): Record<string, unknown> {
  const initial: Record<string, unknown> = {};
  if (!productConfig) return initial;
  productConfig.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'chips_multi') initial[field.key] = [];
      else if (field.type === 'size_qty_table') initial[field.key] = {};
      else if (field.type === 'corner_rounding') {
        initial[field.key] = { enabled: true, limit: 2, selected: [] };
      } else if (field.type === 'bache_eyelets') {
        initial[field.key] = { mode: 'Aucun', count: 0, positions: [] };
      } else if (
        // Ne pas seed pages_noir / pages_quadri (showWhen Mixte) —
        // présence des clés faisait croire au moteur un mode mixte → intérieur 0 Ar.
        (field.key === 'pages_noir' || field.key === 'pages_quadri')
        && field.showWhen
      ) {
        // omit
      } else if (field.required === false && field.default !== undefined && field.default !== null) {
        // Champs optionnels (ex. finitions carterie) → valeur par défaut « Sans »
        initial[field.key] = field.default;
      } else initial[field.key] = '';
    });
  });
  return initial;
}

export function computePosCompletion(
  productConfig: ProductConfig | null,
  config: Record<string, unknown>,
): { done: number; total: number; pct: number } {
  const requiredFields = collectPosProgressFields(productConfig, config);
  const total = requiredFields.length;
  if (total === 0) return { done: 0, total: 0, pct: 0 };
  const done = requiredFields.filter((f) => isFieldValueComplete(f, config[f.key], config)).length;
  return { done, total, pct: Math.round((done / total) * 100) };
}

export function isPosConfigReady(productConfig: ProductConfig | null, config: Record<string, unknown>): boolean {
  const { done, total } = computePosCompletion(productConfig, config);
  return total > 0 && done === total;
}
