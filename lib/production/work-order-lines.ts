import { getProductConfig, type ConfigField } from '@/lib/data/config-types';
import { calculatePackagingSurface } from '@/lib/data/packaging-surface';
import { normalizePaperInConfig } from '@/lib/data/paper-material';
import {
  sanitizeDisplayLines,
  sanitizeDisplayLine,
  sanitizeDisplayText,
} from '@/lib/documents/display-sanitize';
import {
  formatClientDimensionsCm,
  parseGrandFormatDimensionsCm,
} from '@/lib/dimensions/grand-format-units';
import {
  formatClientDimensionsMm,
  isPetitFormatArticle,
  parsePetitFormatDimensionsMm,
} from '@/lib/dimensions/petit-format-units';
import { finitionSummaryLines } from '@/lib/finition/finition-display';
import { normalizeFinitionConfig } from '@/lib/finition/finition-normalize';
import { isStandaloneFinitionArticle } from '@/lib/finition/finition-pricing';
import { bacheWorkOrderBlock } from '@/lib/grand-format/bache-display';
import { gfWorkOrderLines } from '@/lib/grand-format/gf-display';
import type { GrandFormatBillableResult } from '@/lib/grand-format/types';
import { isBlocNoteArticleId } from '@/lib/pricing/bloc-note-pricing';
import {
  articleUsesBindingEngine,
  bindingCartSummaryLine,
  evaluateBindingFromConfig,
} from '@/lib/print/binding-rules';
import { BACHE_CANONICAL_ID } from '@/lib/pos/bache-catalog';
import { formatPosFieldDisplay } from '@/lib/pos/field-display';
import { resolveDisplayFormatLabel } from '@/lib/pos/generated-format-label';
import {
  formatArchivedGoodiesValue,
  isArchivedGoodiesFieldKey,
  isGoodiesArticleId,
  resolveGoodiesFieldLabel,
  shouldShowFieldInNewGoodiesDocuments,
} from '@/lib/pos/goodies-pos-policy';
import {
  formatArchivedTextileValue,
  isArchivedTextileFieldKey,
  isTextileArticleId,
  resolveTextileFieldLabel,
  shouldShowFieldInNewTextileDocuments,
} from '@/lib/pos/textile-pos-policy';

const INTERNAL_KEYS = new Set([
  '_gfBillable',
  '_prix_force',
  '_bindingEvaluation',
  '_stockCheck',
  '_wasteRate',
  'prix_manuel',
  'prixManuel',
  'prix_unitaire_manuel',
  'oeillets_data',
]);

const GENERIC_KEY_LABELS: Record<string, string> = {
  paperType: 'Matière',
  paperWeight: 'Grammage',
  format: 'Format',
  face: 'Impression',
  qty: 'Quantité',
  quantite: 'Quantité',
  finition: 'Finition',
  laize: 'Laize',
  structure: 'Structure',
  technique: 'Technique',
  couleur: 'Couleur',
  type: 'Type',
};

export type ProductionLineSpec = {
  articleId: string;
  articleLabel: string;
  quantity: number;
  specLines: string[];
};

function asConfigRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === 'object' && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function isPopulated(val: unknown): boolean {
  if (val === undefined || val === null) return false;
  if (typeof val === 'string') return val.trim() !== '';
  if (typeof val === 'number') return Number.isFinite(val);
  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === 'object') return Object.keys(val as object).length > 0;
  return true;
}

function pickString(config: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const val = config[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') return String(val);
  }
  return fallback;
}

function humanizeKey(key: string): string {
  return GENERIC_KEY_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatGenericValue(val: unknown): string | null {
  if (Array.isArray(val)) {
    const joined = val.filter(Boolean).join(', ');
    return joined || null;
  }
  if (typeof val === 'object' && val !== null) return null;
  const cleaned = sanitizeDisplayText(String(val));
  return cleaned;
}

function dedupeLines(lines: string[]): string[] {
  return sanitizeDisplayLines(lines);
}

function resolveConfigFieldLabel(articleId: string, fieldKey: string, fallback: string): string {
  const pc = getProductConfig(articleId);
  for (const section of pc?.sections ?? []) {
    const field = section.fields.find((f) => f.key === fieldKey);
    if (field) {
      if (
        section.title &&
        (section.fields.length === 1 || section.posHidden) &&
        section.title.length >= field.label.length
      ) {
        return section.title;
      }
      return field.label;
    }
  }
  if (isGoodiesArticleId(articleId)) return resolveGoodiesFieldLabel(fieldKey, fallback);
  if (isTextileArticleId(articleId)) return resolveTextileFieldLabel(fieldKey, fallback);
  return fallback;
}

function configValueForField(config: Record<string, unknown>, field: ConfigField): unknown {
  const direct = config[field.key];
  if (isPopulated(direct)) return direct;
  if (field.key === 'matiere') {
    return config.paperType ?? config.paperType_int ?? config.matiere;
  }
  if (field.key === 'grammage') {
    return config.paperWeight ?? config.paperWeight_int ?? config.grammage;
  }
  return direct;
}

/** Préserve matière historique goodies/textile — pas de migration paperType sur gd-* / tx-*. */
export function normalizeWorkOrderConfig(
  articleId: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  let next = { ...config };
  if (articleId.startsWith('fin-')) {
    next = normalizeFinitionConfig(articleId, next);
  }
  if (!articleId.startsWith('gd-') && !articleId.startsWith('tx-')) {
    const { config: paperNorm } = normalizePaperInConfig(next);
    next = paperNorm;
  }
  return next;
}

function textileLines(config: Record<string, unknown>, qty: number, articleId?: string): string[] {
  const lines: string[] = [];
  const tailles = config.tailles;
  if (tailles && typeof tailles === 'object' && !Array.isArray(tailles)) {
    const entries = Object.entries(tailles as Record<string, number>).filter(([, q]) => (q || 0) > 0);
    if (entries.length) {
      lines.push(`Répartition tailles : ${entries.map(([s, q]) => `${s}×${q}`).join(', ')}`);
      const total = entries.reduce((s, [, q]) => s + (q || 0), 0);
      lines.push(`Total pièces : ${total}`);
    }
  }
  const dimensions = pickString(config, ['format']);
  if (dimensions) lines.push(`Format / dimensions : ${dimensions}`);
  const matiere = pickString(config, ['matiere', 'type', 'couleur_vetement']);
  if (matiere) lines.push(`Matière : ${matiere}`);
  const grammage = pickString(config, ['grammage']);
  if (grammage) lines.push(`Grammage : ${grammage}`);
  const couleur = pickString(config, ['couleur']);
  if (couleur) lines.push(`Couleur : ${couleur}`);
  const doublure = pickString(config, ['doublure']);
  if (doublure) lines.push(`Doublure : ${doublure}`);
  const technique = pickString(config, ['technique', 'impression', 'marquage']);
  if (technique) lines.push(`Technique : ${technique}`);
  const tailleMarquage = pickString(config, ['format_marquage']);
  if (tailleMarquage) {
    const label = resolveDisplayFormatLabel(config, ['format_marquage']) || tailleMarquage;
    lines.push(`Taille du marquage : ${label}`);
  }
  const fichier = pickString(config, ['fichier_joint', 'fichier_visuel']);
  if (fichier) lines.push(`Fichier / visuel : ${fichier}`);
  const notes = pickString(config, ['remarques', 'note']);
  if (notes) lines.push(`Notes & remarques : ${notes}`);
  if (!isTextileArticleId(articleId)) {
    const noteEmplacement = pickString(config, ['note_emplacement_marquage']);
    if (noteEmplacement) lines.push(`Emplacement marquage : ${noteEmplacement}`);
    const noteProd = pickString(config, ['note_production']);
    if (noteProd) lines.push(`Note production : ${noteProd}`);
  }

  if (isTextileArticleId(articleId)) {
    for (const [key, label] of [
      ['zone_marquage', 'Zone de marquage'],
      ['coupe', 'Coupe / genre'],
      ['modele', 'Modèle'],
      ['fermeture', 'Fermeture'],
      ['anses', 'Anses / poignées'],
      ['soufflet', 'Soufflet / fond'],
      ['fichier_visuel', 'Fichier / visuel'],
      ['note_emplacement_marquage', 'Emplacement marquage'],
      ['note_production', 'Note production'],
    ] as const) {
      const val = pickString(config, [key]);
      if (val && isArchivedTextileFieldKey(key, articleId)) {
        lines.push(`${label} : ${formatArchivedTextileValue(val)}`);
      }
    }
  }

  if (!lines.some((l) => /^total pièces/i.test(l)) && qty > 0) {
    lines.push(`Quantité commandée : ${qty}`);
  }
  return lines;
}

function goodiesLines(config: Record<string, unknown>, qty: number, articleId?: string): string[] {
  const lines: string[] = [];

  for (const key of ['format', 'diametre', 'taille'] as const) {
    const val = pickString(config, [key]);
    if (!val) continue;
    const label = resolveGoodiesFieldLabel(key, humanizeKey(key));
    if (/personnalis/i.test(val)) {
      lines.push(`${label} : ${resolveDisplayFormatLabel(config, [key, 'format', 'diametre', 'taille'])}`);
    } else {
      lines.push(`${label} : ${val}`);
    }
  }

  const activeKeys = [
    'type',
    'capacite',
    'interface',
    'couleur',
    'technique',
    'contenance',
    'forme',
    'matiere',
    'bouchon',
    'mecanisme',
    'encre',
    'attache',
    'panneaux',
  ] as const;

  for (const key of activeKeys) {
    const val = pickString(config, [key]);
    if (!val) continue;
    if (isGoodiesArticleId(articleId) && !shouldShowFieldInNewGoodiesDocuments(key, articleId)) {
      continue;
    }
    const label = resolveConfigFieldLabel(articleId ?? '', key, resolveGoodiesFieldLabel(key, humanizeKey(key)));
    lines.push(`${label} : ${val}`);
  }

  const fichier = pickString(config, ['fichier_joint', 'fichier_visuel']);
  if (fichier) lines.push(`Fichier / visuel : ${fichier}`);
  const notes = pickString(config, ['remarques', 'note']);
  if (notes) lines.push(`Notes & remarques : ${notes}`);

  if (isGoodiesArticleId(articleId)) {
    for (const key of [
      'type',
      'matiere',
      'zone_marquage',
      'origine',
      'fichier_visuel',
      'note_emplacement_marquage',
      'note_production',
      'finition',
      'attache',
      'poignee',
      'matiere_surface',
      'base',
      'soucoupe',
    ] as const) {
      const val = pickString(config, [key]);
      if (key === 'fichier_visuel' && pickString(config, ['fichier_joint'])) continue;
      if (val && isArchivedGoodiesFieldKey(key, articleId)) {
        const label = resolveConfigFieldLabel(
          articleId ?? '',
          key,
          resolveGoodiesFieldLabel(key, humanizeKey(key)),
        );
        lines.push(`${label} : ${formatArchivedGoodiesValue(val)}`);
      }
    }
  }

  if (qty > 0 && !lines.some((l) => /^quantit/i.test(l))) {
    lines.push(`Quantité : ${qty}`);
  }
  return lines;
}

function formatFieldLine(
  field: ConfigField,
  config: Record<string, unknown>,
  articleId?: string,
): string | null {
  const val = configValueForField(config, field);
  if (!isPopulated(val)) return null;

  if (isGoodiesArticleId(articleId) && !shouldShowFieldInNewGoodiesDocuments(field.key, articleId)) {
    const displayVal = formatPosFieldDisplay(field, val, config);
    if (!displayVal || displayVal === 'non choisi') return null;
    const label = resolveGoodiesFieldLabel(field.key, field.label);
    return sanitizeDisplayLine(`${label} : ${formatArchivedGoodiesValue(displayVal)}`);
  }

  if (isTextileArticleId(articleId) && !shouldShowFieldInNewTextileDocuments(field.key, articleId)) {
    const displayVal = formatPosFieldDisplay(field, val, config);
    if (!displayVal || displayVal === 'non choisi') return null;
    const label = resolveTextileFieldLabel(field.key, field.label);
    return sanitizeDisplayLine(`${label} : ${formatArchivedTextileValue(displayVal)}`);
  }

  if (field.type === 'size_qty_table') {
    const sub = textileLines(config, 0, articleId);
    return sub.length ? sub.join(' · ') : null;
  }

  const display = formatPosFieldDisplay(field, val, config);
  if (!display) return null;
  const cleaned = sanitizeDisplayText(display);
  if (!cleaned || cleaned === 'non choisi') return null;
  if (field.type === 'chips_multi' && cleaned === 'Aucun') return null;

  let label = field.label;
  if (isTextileArticleId(articleId)) label = resolveTextileFieldLabel(field.key, field.label);
  else if (isGoodiesArticleId(articleId)) label = resolveGoodiesFieldLabel(field.key, field.label);

  return sanitizeDisplayLine(`${label} : ${cleaned}`);
}

function productConfigLines(articleId: string, config: Record<string, unknown>): string[] {
  const pc = getProductConfig(articleId);
  if (!pc) return cartDisplayLines(config, articleId);

  const skipKeys = new Set(['qty', 'quantite', 'oeillets', 'oeillets_data']);
  const lines: string[] = [];
  const usesPosHiddenArchive = isTextileArticleId(articleId) || isGoodiesArticleId(articleId);

  for (const section of pc.sections) {
    if (section.posHidden && usesPosHiddenArchive) continue;
    for (const field of section.fields) {
      if (skipKeys.has(field.key)) continue;
      if (field.posHidden && usesPosHiddenArchive) {
        const archivedLine = formatFieldLine(field, config, articleId);
        if (archivedLine) lines.push(archivedLine);
        continue;
      }
      if (field.type === 'bache_eyelets') continue;
      const line = formatFieldLine(field, config, articleId);
      if (line) lines.push(line);
    }
  }

  return lines.length ? lines : cartDisplayLines(config, articleId);
}

function genericConfigScan(config: Record<string, unknown>, articleId: string): string[] {
  const lines: string[] = [];

  if (articleId.startsWith('gf-') || articleId === BACHE_CANONICAL_ID) {
    const dims = parseGrandFormatDimensionsCm(config);
    if (dims) lines.push(`Format : ${formatClientDimensionsCm(dims.longueurCm, dims.largeurCm)}`);
  } else if (isPetitFormatArticle(articleId)) {
    const dims = parsePetitFormatDimensionsMm(config);
    if (dims) lines.push(`Format : ${formatClientDimensionsMm(dims.longueurMm, dims.largeurMm)}`);
  }

  const skipDimKeys = new Set([
    'longueur',
    'largeur',
    'hauteur',
    'longueur_cm',
    'largeur_cm',
    'hauteur_cm',
    'longueur_mm',
    'largeur_mm',
    'custom_width',
    'custom_height',
  ]);

  for (const [key, val] of Object.entries(config)) {
    if (INTERNAL_KEYS.has(key)) continue;
    if (skipDimKeys.has(key) && lines.some((l) => l.startsWith('Format :'))) continue;
    if (!isPopulated(val)) continue;
    const formatted = formatGenericValue(val);
    if (!formatted) continue;
    lines.push(sanitizeDisplayLine(`${humanizeKey(key)} : ${formatted}`) ?? `${humanizeKey(key)} : ${formatted}`);
  }

  return lines;
}

function cartDisplayLines(config: Record<string, unknown>, articleId: string): string[] {
  return genericConfigScan(config, articleId);
}

function gfLines(config: Record<string, unknown>, qty: number): string[] {
  const billable = config._gfBillable as GrandFormatBillableResult | undefined;
  const fromBillable = gfWorkOrderLines(config, billable);
  if (fromBillable.length) return fromBillable;

  const lines: string[] = [];
  const dims = parseGrandFormatDimensionsCm(config);
  if (dims) {
    lines.push(`Dimensions : ${formatClientDimensionsCm(dims.longueurCm, dims.largeurCm)}`);
  }
  const laize = pickString(config, ['laize']);
  if (laize) lines.push(`Laize : ${laize}`);
  const face = pickString(config, ['face']);
  if (face) lines.push(`Impression : ${face}`);
  if (qty > 1) lines.push(`Quantité : ${qty}`);
  return lines;
}

function packagingLines(config: Record<string, unknown>, qty: number): string[] {
  const lines: string[] = [];
  const structure = pickString(config, ['structure']);
  if (structure) lines.push(`Structure : ${structure}`);

  const longueur = pickString(config, ['longueur']);
  const hauteur = pickString(config, ['hauteur']);
  const profondeur = pickString(config, ['profondeur']);
  if (longueur && hauteur && profondeur) {
    lines.push(`Dimensions : ${longueur} × ${hauteur} × ${profondeur} mm`);
  }

  const surface = calculatePackagingSurface(config);
  if (surface) {
    lines.push(
      `Surface matière : ${surface.surfaceM2.toFixed(4)} m² (${surface.structure} — développé ${surface.formatDeveloppe})`,
    );
    lines.push(`Format brut : ${surface.formatBrut}`);
  }

  const matiere = pickString(config, ['matiere', 'paperType']);
  if (matiere) lines.push(`Matière : ${matiere}`);
  const couleur = pickString(config, ['couleur']);
  if (couleur) lines.push(`Couleur : ${couleur}`);
  const finition = pickString(config, ['finition', 'finition_surface']);
  if (finition) lines.push(`Finition : ${finition}`);

  if (qty > 0) lines.push(`Quantité : ${qty}`);
  return lines;
}

function bindingLines(articleId: string, config: Record<string, unknown>): string[] {
  const ev = evaluateBindingFromConfig(config);
  if (ev?.summaryLines.length) return ev.summaryLines;
  const cartLine = bindingCartSummaryLine(config);
  if (cartLine) return [cartLine];
  return finitionSummaryLines(articleId, config);
}

function blocNoteLines(config: Record<string, unknown>, qty: number): string[] {
  const lines: string[] = [];
  const produit = pickString(config, ['produit']);
  if (produit) lines.push(`Produit : ${produit}`);
  const format = pickString(config, ['format']);
  if (format) lines.push(`Format : ${format}`);
  const feuillets = pickString(config, ['nombre_feuilles']);
  const feuilletsCustom = config.nombre_feuilles_custom;
  if (feuillets) {
    const customN = typeof feuilletsCustom === 'number'
      ? feuilletsCustom
      : parseInt(String(feuilletsCustom ?? ''), 10);
    if (/autres/i.test(feuillets) && Number.isFinite(customN) && customN > 0) {
      lines.push(`Nombre de feuilles : ${customN}`);
    } else {
      lines.push(`Nombre de feuilles : ${feuillets}`);
    }
  }
  const matiereCouv = pickString(config, ['matiere_couverture']);
  if (matiereCouv) lines.push(`Matière couverture : ${matiereCouv}`);
  const couverture = pickString(config, ['type_support_couverture']);
  if (couverture) lines.push(`Type support tarif : ${couverture}`);
  const grammageCouv = pickString(config, ['grammage_couverture']);
  if (grammageCouv) lines.push(`Grammage couverture : ${grammageCouv}`);
  const famille = pickString(config, ['famille_papier']);
  if (famille) lines.push(`Matière intérieure : ${famille}`);
  const grammageInt = pickString(config, ['grammage_interieur']);
  if (grammageInt) lines.push(`Grammage intérieur : ${grammageInt}`);
  const finition = pickString(config, ['finition_pelliculage']);
  if (finition) lines.push(`Finition / pelliculage : ${finition}`);
  const reliure = pickString(config, ['type_reliure']);
  if (reliure) lines.push(`Reliure : ${reliure}`);
  const couleur = pickString(config, ['couleur_impression']);
  if (couleur) lines.push(`Impression intérieur : ${couleur}`);
  const techCouv = pickString(config, ['technologie_couverture']);
  if (techCouv) lines.push(`Impression couverture : ${techCouv}`);
  if (qty > 0) lines.push(`Quantité : ${qty}`);
  return lines;
}

function plvLines(articleId: string, config: Record<string, unknown>, qty: number): string[] {
  const lines = productConfigLines(articleId, config);
  if (lines.length) return lines;
  const type = pickString(config, ['type']);
  if (type) lines.push(`Type : ${type}`);
  const format = pickString(config, ['format', 'format_affiche']);
  if (format) lines.push(`Format : ${format}`);
  const w = pickString(config, ['largeur_mm', 'longueur']);
  const h = pickString(config, ['hauteur_mm', 'largeur']);
  const d = pickString(config, ['profondeur_mm', 'profondeur']);
  if (w && h) lines.push(`Dimensions : ${w}×${h}${d ? `×${d}` : ''} mm`);
  const matiere = pickString(config, ['matiere', 'tissu']);
  if (matiere) lines.push(`Matière : ${matiere}`);
  const ep = pickString(config, ['epaisseur', 'grammage']);
  if (ep) lines.push(`Épaisseur : ${ep}`);
  const support = pickString(config, ['support', 'type_support']);
  if (support) lines.push(`Support : ${support}`);
  const hauteur = pickString(config, ['hauteur']);
  if (hauteur && articleId === 'plv-oriflamme') lines.push(`Hauteur support : ${hauteur}`);
  const face = pickString(config, ['face']);
  if (face) lines.push(`Impression : ${face}`);
  const finition = pickString(config, ['finition', 'finition_pelliculage']);
  if (finition) lines.push(`Finition : ${finition}`);
  if (qty > 0) lines.push(`Quantité : ${qty}`);
  return lines;
}

export function buildWorkOrderLines(
  articleId: string,
  configInput: unknown,
  options?: { quantity?: number },
): string[] {
  const id = articleId.trim();
  const rawConfig = asConfigRecord(configInput);
  if (Object.keys(rawConfig).length === 0) return [];

  const config = normalizeWorkOrderConfig(id, rawConfig);
  const qty = Math.max(1, Number(options?.quantity ?? config.qty ?? config.quantite ?? 1));

  let lines: string[] = [];

  if (id === BACHE_CANONICAL_ID) {
    lines = bacheWorkOrderBlock(config);
  } else if (id.startsWith('gf-')) {
    lines = gfLines(config, qty);
  } else if (isStandaloneFinitionArticle(id) || id.startsWith('fin-')) {
    lines = finitionSummaryLines(id, config);
  } else if (id.startsWith('pkg-')) {
    lines = packagingLines(config, qty);
  } else if (id.startsWith('gd-')) {
    lines = goodiesLines(config, qty, id);
    if (!lines.length) lines = productConfigLines(id, config);
  } else if (id.startsWith('tx-') || (config.tailles && typeof config.tailles === 'object')) {
    lines = textileLines(config, qty, id);
    if (!lines.length) lines = productConfigLines(id, config);
  } else if (articleUsesBindingEngine(id)) {
    lines = bindingLines(id, config);
    if (!lines.length) lines = productConfigLines(id, config);
  } else if (id.startsWith('plv-')) {
    lines = plvLines(id, config, qty);
  } else if (isBlocNoteArticleId(id)) {
    lines = productConfigLines(id, config);
    if (!lines.length) lines = blocNoteLines(config, qty);
  } else {
    lines = productConfigLines(id, config);
    if (!lines.length) lines = cartDisplayLines(config, id);
  }

  if (
    qty > 0 &&
    !lines.some((l) => /^quantit/i.test(l)) &&
    !id.startsWith('tx-') &&
    !id.startsWith('gd-')
  ) {
    lines.push(`Quantité : ${qty}`);
  }

  return dedupeLines(lines);
}

export function hasWorkOrderBlock(articleId: string, configInput: unknown): boolean {
  return buildWorkOrderLines(articleId, configInput).length > 0;
}

export function buildProductionLineSpec(input: {
  articleId?: string | null;
  articleLabel: string;
  quantity: number;
  configSnapshot?: unknown;
}): ProductionLineSpec {
  const articleId = String(input.articleId ?? '').trim();
  const specLines = articleId
    ? buildWorkOrderLines(articleId, input.configSnapshot ?? {}, { quantity: input.quantity })
    : [];

  return {
    articleId,
    articleLabel: input.articleLabel,
    quantity: input.quantity,
    specLines,
  };
}
