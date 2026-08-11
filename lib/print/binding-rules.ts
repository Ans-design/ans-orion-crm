/**
 * Moteur central règles reliure — références spirale, agrafe, dos carré.
 */

import {
  BINDING_LABELS,
  computePhysicalSheets,
  getPhysicalSheetsFromConfig,
  grammageToBand,
  parsePagesFromConfig,
  printModeFromConfig,
  SPIRALES,
  PIQURES,
  DCC,
  type GrammageBand,
} from '@/lib/data/binding-catalog';

export type PaperWeightGroup = '80g' | '120_170g' | '250_300g' | 'custom';

export const PAPER_CALIPER_MM: Record<string, number> = {
  '80g': 0.1,
  '100g': 0.12,
  '120g': 0.14,
  '170g': 0.2,
  '250g': 0.28,
  '300g': 0.34,
};

const GRAMMAGE_BAND_KEYS: Record<GrammageBand, keyof (typeof SPIRALES)[0]> = {
  '80': 'f80',
  '120': 'f120',
  '250': 'f250',
};

function parseMaxFromLimit(raw: string): number | null {
  const m = raw.match(/≤\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function parsePageRange(raw: string): { min: number; max: number } | null {
  const m = raw.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (!m) return null;
  return { min: Number(m[1]), max: Number(m[2]) };
}

export function getPaperWeightGroup(grammageRaw: unknown): PaperWeightGroup {
  const g = parseInt(String(grammageRaw ?? '').replace(/[^0-9]/g, ''), 10);
  if (!Number.isFinite(g)) return 'custom';
  if (g <= 100) return '80g';
  if (g <= 200) return '120_170g';
  if (g <= 300) return '250_300g';
  return 'custom';
}

export function normalizePaperWeightLabel(grammageRaw: unknown): string {
  const s = String(grammageRaw ?? '').trim();
  if (!s) return '80g';
  if (/^\d/.test(s) && !s.endsWith('g')) return `${s}g`;
  return s;
}

export function estimateSpineThicknessMm(params: {
  physicalSheets: number;
  paperWeight: string;
  glueAllowanceMm?: number;
}): number {
  const caliper = PAPER_CALIPER_MM[params.paperWeight] ?? 0.1;
  const raw = params.physicalSheets * caliper + (params.glueAllowanceMm ?? 0.8);
  return Math.round(raw * 10) / 10;
}

export function validateSaddleStitchPageCount(pageCount: number): boolean {
  return pageCount > 0 && pageCount % 4 === 0;
}

export function getNearestMultiplesOf4(pageCount: number): { lower: number; upper: number } {
  const lower = Math.floor(pageCount / 4) * 4 || 4;
  const upper = Math.ceil(pageCount / 4) * 4;
  return { lower, upper };
}

function pickSpiral(physicalSheets: number, band: GrammageBand, metal: boolean) {
  const key = GRAMMAGE_BAND_KEYS[band];
  for (const row of SPIRALES) {
    if (metal && !row.metal) continue;
    const max = parseMaxFromLimit(String(row[key]));
    if (max != null && physicalSheets <= max) return row;
  }
  return null;
}

function pickStaple(physicalSheets: number, band: GrammageBand) {
  const key = band === '250' ? 'f120' : (`f${band}` as 'f80' | 'f120');
  for (const row of PIQURES) {
    const max = parseMaxFromLimit(String(row[key]));
    if (max != null && physicalSheets <= max) return row;
  }
  return null;
}

function pickDcc(physicalSheets: number, band: GrammageBand) {
  const key = `p${band}` as 'p80' | 'p120' | 'p250';
  for (const row of DCC) {
    const range = parsePageRange(String(row[key]));
    if (range && physicalSheets >= range.min && physicalSheets <= range.max) return row;
  }
  return null;
}

export function isMetalSpiralCompatible(config: Record<string, unknown>): boolean {
  const sheets = getPhysicalSheetsFromConfig(config);
  if (sheets == null || sheets <= 0) return true;
  const band = grammageToBand(
    config.grammage_int ?? config.grammage_interieur ?? config.grammage ?? config.grammage_couv,
  );
  return pickSpiral(sheets, band, true) != null;
}

export function validatePerfectBindingMinimum(params: {
  pageCount: number;
  physicalSheets: number;
  paperWeightGroup: PaperWeightGroup;
  spineMm: number;
}): { valid: boolean; message?: string } {
  if (params.paperWeightGroup === '80g' && params.pageCount < 40) {
    return { valid: false, message: 'Dos carré collé 80g : minimum 40 pages document requis.' };
  }
  if (params.spineMm < 4) {
    return {
      valid: false,
      message:
        'Dos carré collé : dos trop mince pour une reliure propre. Choisir piqûre à cheval ou spirale.',
    };
  }
  return { valid: true };
}

export interface BindingEvaluation {
  valid: boolean;
  compatible: boolean;
  bindingType: string;
  pageCount: number | null;
  printMode: 'recto' | 'recto_verso';
  printModeLabel: string;
  physicalSheets: number | null;
  grammageBand: GrammageBand;
  paperWeightLabel: string;
  paperWeightGroup: PaperWeightGroup;
  reference?: string;
  referenceLabel?: string;
  dimensionMm?: number;
  legMm?: string;
  spineMmCalculated?: number;
  spineMmRange?: string;
  maxCapacityLabel?: string;
  priceAr?: number;
  metalSpiralAvailable: boolean;
  plasticSpiralAvailable: boolean;
  errors: string[];
  warnings: string[];
  summaryLines: string[];
}

function grammageFromConfig(config: Record<string, unknown>) {
  return config.grammage_int ?? config.grammage_interieur ?? config.grammage ?? config.grammage_couv;
}

export function resolveBindingLabelFromConfig(config: Record<string, unknown>): string {
  return String(config.reliure ?? config.type_reliure ?? config.type ?? '').trim();
}

export function articleUsesBindingEngine(articleId: string): boolean {
  if (articleId === 'fin-reliure' || articleId === 'bk-livres') return true;
  if (articleId.startsWith('bn-')) return true;
  if (articleId === 'cal-chevalet' || articleId === 'cal-chevalet-table') return true;
  return false;
}

export function evaluateBinding(bindingLabel: string, config: Record<string, unknown>): BindingEvaluation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const summaryLines: string[] = [];

  const pageCount = parsePagesFromConfig(config);
  const printMode = printModeFromConfig(config);
  const printModeLabel = printMode === 'recto_verso' ? 'Recto-Verso' : 'Recto';
  const physicalSheets =
    pageCount != null && pageCount > 0
      ? computePhysicalSheets(pageCount, printMode)
      : getPhysicalSheetsFromConfig(config);

  const grammageRaw = grammageFromConfig(config);
  const grammageBand = grammageToBand(grammageRaw);
  const paperWeightLabel = normalizePaperWeightLabel(grammageRaw);
  const paperWeightGroup = getPaperWeightGroup(grammageRaw);

  const base: BindingEvaluation = {
    valid: true,
    compatible: true,
    bindingType: bindingLabel,
    pageCount,
    printMode,
    printModeLabel,
    physicalSheets,
    grammageBand,
    paperWeightLabel,
    paperWeightGroup,
    metalSpiralAvailable: isMetalSpiralCompatible(config),
    plasticSpiralAvailable: true,
    errors,
    warnings,
    summaryLines,
  };

  if (pageCount != null) {
    summaryLines.push(`Pages document : ${pageCount}`);
    summaryLines.push(`Mode impression : ${printModeLabel}`);
  }
  if (physicalSheets != null) summaryLines.push(`Feuilles physiques : ${physicalSheets}`);
  if (paperWeightLabel) summaryLines.push(`Grammage : ${paperWeightLabel}`);

  if (!bindingLabel) {
    return { ...base, valid: false, compatible: false, errors: ['Veuillez sélectionner le type de reliure.'] };
  }
  if (pageCount == null || pageCount <= 0) {
    warnings.push('Indiquez le nombre de pages pour afficher la référence technique.');
    return base;
  }
  if (physicalSheets == null || physicalSheets <= 0) {
    return { ...base, valid: false, compatible: false, errors: ['Volume document invalide.'] };
  }

  if (bindingLabel === BINDING_LABELS.SPIRALE_PLASTIQUE || bindingLabel === BINDING_LABELS.SPIRALE_METAL) {
    const metal = bindingLabel === BINDING_LABELS.SPIRALE_METAL;
    const row = pickSpiral(physicalSheets, grammageBand, metal);
    if (metal && !row) {
      const plasticRow = pickSpiral(physicalSheets, grammageBand, false);
      const msg =
        plasticRow && plasticRow.mm > 16
          ? 'Spirale métallique indisponible : volume trop important, référence supérieure à 16 mm.'
          : 'Spirale métallique indisponible pour ce volume. Choisir spirale plastique.';
      errors.push(msg);
      if (plasticRow) warnings.push(`Réf. plastique : ${plasticRow.mm} mm — ${plasticRow.ref}`);
      return { ...base, valid: false, compatible: false, metalSpiralAvailable: false, errors, warnings, summaryLines };
    }
    if (!row) {
      errors.push('Aucune spirale compatible avec ce volume.');
      return { ...base, valid: false, compatible: false, errors, summaryLines };
    }
    const max = parseMaxFromLimit(String(row[GRAMMAGE_BAND_KEYS[grammageBand]]));
    const refLabel = `Spirale ${row.mm} mm — Réf. ${row.ref}`;
    return {
      ...base,
      reference: row.ref,
      referenceLabel: refLabel,
      dimensionMm: row.mm,
      maxCapacityLabel: max ? `jusqu'à ${max} feuilles en ${grammageBand}g` : undefined,
      priceAr: row.px,
      summaryLines: [
        ...summaryLines,
        `Reliure : ${bindingLabel}`,
        `Référence : ${refLabel}`,
        ...(max ? [`Capacité : ${max} feuilles en ${grammageBand}g`] : []),
        ...(row.px ? [`Prix : ${row.px.toLocaleString('fr-FR')} Ar / exemplaire`] : []),
      ],
    };
  }

  if (bindingLabel === BINDING_LABELS.PIQURE) {
    if (!validateSaddleStitchPageCount(pageCount)) {
      const { lower, upper } = getNearestMultiplesOf4(pageCount);
      const msg = `Piqûre à cheval impossible : pages divisibles par 4 requises. Choisir ${lower} ou ${upper} pages.`;
      errors.push(msg);
      return { ...base, valid: false, compatible: false, errors, summaryLines: [...summaryLines, msg] };
    }
    const row = pickStaple(physicalSheets, grammageBand);
    if (!row) {
      errors.push('Aucune agrafe compatible. Choisir une autre reliure.');
      return { ...base, valid: false, compatible: false, errors, summaryLines };
    }
    const max = parseMaxFromLimit(String(row[grammageBand === '250' ? 'f120' : (`f${grammageBand}` as 'f80' | 'f120')]));
    const refLabel = `Agrafe ${row.ref} — pattes ${row.mm}`;
    return {
      ...base,
      reference: row.ref,
      referenceLabel: refLabel,
      legMm: row.mm,
      maxCapacityLabel: max ? `jusqu'à ${max} feuilles en ${grammageBand}g` : undefined,
      priceAr: row.px,
      summaryLines: [
        ...summaryLines,
        `Reliure : ${bindingLabel}`,
        `Agrafe : ${refLabel}`,
        ...(row.px ? [`Prix : ${row.px.toLocaleString('fr-FR')} Ar / exemplaire`] : []),
      ],
    };
  }

  if (
    bindingLabel === BINDING_LABELS.DCC ||
    bindingLabel === BINDING_LABELS.DCC_COUSU ||
    bindingLabel === BINDING_LABELS.RELIURE_COUSUE
  ) {
    const spineMm = estimateSpineThicknessMm({ physicalSheets, paperWeight: paperWeightLabel });
    const minCheck = validatePerfectBindingMinimum({ pageCount, physicalSheets, paperWeightGroup, spineMm });
    if (!minCheck.valid && minCheck.message) errors.push(minCheck.message);

    const row = pickDcc(physicalSheets, grammageBand);
    if (!row) {
      errors.push('Dos carré hors plage technique. Chiffrage manuel ou autre reliure.');
      return {
        ...base,
        valid: false,
        compatible: false,
        spineMmCalculated: spineMm,
        errors,
        summaryLines: [...summaryLines, `Épaisseur calculée : ${spineMm} mm`, ...errors],
      };
    }
    if (errors.length) {
      return { ...base, valid: false, compatible: false, spineMmCalculated: spineMm, spineMmRange: row.ep, errors, summaryLines };
    }
    const refLabel = `${bindingLabel} — dos estimé : ${row.ep}`;
    return {
      ...base,
      referenceLabel: refLabel,
      spineMmCalculated: spineMm,
      spineMmRange: row.ep,
      priceAr: row.px,
      summaryLines: [
        ...summaryLines,
        `Reliure : ${bindingLabel}`,
        `Épaisseur calculée : ${spineMm.toLocaleString('fr-FR')} mm`,
        `Tranche tarifaire : ${row.ep}`,
        ...(row.px ? [`Prix : ${row.px.toLocaleString('fr-FR')} Ar / exemplaire`] : []),
      ],
    };
  }

  summaryLines.push(`Reliure : ${bindingLabel}`);
  return base;
}

export function evaluateBindingFromConfig(config: Record<string, unknown>): BindingEvaluation | null {
  const label = resolveBindingLabelFromConfig(config);
  if (!label) return null;
  if (label === 'Sans reliure' || label === 'Pelliculé' || label === 'Pli simple') return null;
  return evaluateBinding(label, config);
}

export function bindingCartSummaryLine(config: Record<string, unknown>, articleName?: string): string | null {
  const ev = evaluateBindingFromConfig(config);
  if (!ev?.referenceLabel && !ev?.reference) return null;
  const parts: string[] = [];
  if (articleName) parts.push(articleName);
  if (ev.pageCount) parts.push(`${ev.pageCount} pages`);
  parts.push(ev.printModeLabel);
  if (ev.physicalSheets != null) parts.push(`${ev.physicalSheets} feuilles`);
  parts.push(ev.bindingType);
  if (ev.referenceLabel) parts.push(ev.referenceLabel);
  if (ev.spineMmCalculated != null && ev.spineMmRange) {
    parts.push(`dos ${ev.spineMmCalculated} mm / tranche ${ev.spineMmRange}`);
  }
  return parts.join(' — ');
}

export function isBindingConfigValid(config: Record<string, unknown>): boolean {
  const label = resolveBindingLabelFromConfig(config);
  if (!label || ['Sans reliure', 'Pelliculé', 'Pli simple', 'Reliure personnalisée', 'Autres'].includes(label)) {
    return true;
  }
  const ev = evaluateBinding(label, config);
  return ev.valid && ev.compatible;
}

export function bindingValidationMessage(config: Record<string, unknown>): string | null {
  const label = resolveBindingLabelFromConfig(config);
  if (!label) return null;
  const ev = evaluateBinding(label, config);
  if (ev.valid && ev.compatible) return null;
  return ev.errors[0] ?? 'Configuration reliure incompatible.';
}
