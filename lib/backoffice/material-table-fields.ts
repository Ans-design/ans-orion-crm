import type { MaterialPriceUnifiedRow } from '@/components/backoffice-v2/pricing-custom/material-prices/types';

export type CharacteristicType =
  | 'grammage'
  | 'epaisseur'
  | 'laize'
  | 'format'
  | 'taille'
  | 'face'
  | 'finition'
  | 'couleur'
  | 'autre';

export type MaterialCharacteristic = {
  type: CharacteristicType;
  typeLabel: string;
  value: string;
  unit: string | null;
  displayValue: string;
  display: string;
  isInconsistent: boolean;
};

export type MaterialTableFields = {
  materialName: string;
  grammage: string | null;
  thickness: string | null;
  mainCharacteristic: MaterialCharacteristic | null;
  primaryReference: string;
  secondaryReference: string | null;
  family: string;
  isIncompleteName: boolean;
};

const GENERIC_NAME_PATTERNS = [
  /^mati[eè]re\s+article$/i,
  /^article\s+mati[eè]re$/i,
  /^matiere\s+article$/i,
  /^sans\s+nom$/i,
  /^—$/,
  /^-$/,
  /^null$/i,
  /^undefined$/i,
  /^n\/a$/i,
  /^autre\s*$/i,
];

const GRAMMAGE_SUFFIX = /\s+\d+(?:[.,]\d+)?(?:\s*)?(?:g\/m²|g\/m2|g|gr)\b.*$/i;
const THICKNESS_SUFFIX = /\s+\d+(?:[.,]\d+)?\s*mm\b.*$/i;
const LAIZE_SUFFIX = /\s+\d+(?:[.,]\d+)?\s*cm\b.*$/i;
const GRAMMAGE_TOKEN = /(\d+(?:[.,]\d+)?(?:\s*)?(?:g\/m²|g\/m2|g|gr))\b/i;
const THICKNESS_TOKEN = /(\d+(?:[.,]\d+)?\s*mm)\b/i;
const LAIZE_TOKEN = /(\d+(?:[.,]\d+)?\s*cm)\b/i;
const COMMON_LAIZE_CM = new Set([50, 61, 76, 100, 106, 127, 137, 152, 160, 200, 240, 300, 320]);
const PAPER_MATERIALS = /bâche|bache|toile|canvas|papier|bristol|couché|couche|offset|kraft|carton|textile|vinyle/i;
const FORMAT_RE = /\b(A[0-6])\b/i;
const SIZE_RE = /\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/i;
const FACE_RE = /\b(recto-verso|recto\/verso|recto|verso)\b/i;
const FINISH_RE = /\b(mat|brillant|satiné|satin|gloss|glossy)\b/i;

const TYPE_LABELS: Record<CharacteristicType, string> = {
  grammage: 'Grammage',
  epaisseur: 'Épaisseur',
  laize: 'Laize',
  format: 'Format',
  taille: 'Taille',
  face: 'Face',
  finition: 'Finition',
  couleur: 'Couleur',
  autre: 'Autre',
};

const PLATE_MATERIALS = /acryl|akilux|plexi|pvc|carton|mousse|dibond|alucobond|forex|komacel|plaque|panneau/i;
const GRAND_FORMAT = /grand format|bâche|bache|vinyle|toile|canvas|banner|roll|laize/i;

function stripVariantsFromName(name: string): string {
  return name
    .replace(GRAMMAGE_SUFFIX, '')
    .replace(THICKNESS_SUFFIX, '')
    .replace(LAIZE_SUFFIX, '')
    .trim();
}

function isGrandFormatContext(family: string | null | undefined, materialName: string): boolean {
  const hay = `${family ?? ''} ${materialName}`.toLowerCase();
  return GRAND_FORMAT.test(hay);
}

function isPlateMaterial(materialName: string): boolean {
  return PLATE_MATERIALS.test(materialName);
}

function looksLikeThickness(value: string): boolean {
  return /mm|µm|micron/i.test(value);
}

function looksLikeGrammage(value: string): boolean {
  return /g\/m²|g\/m2|g\b|gr\b|gramme/i.test(value);
}

function looksLikeLaize(value: string, family: string | null | undefined, materialName: string): boolean {
  return /cm\b/i.test(value) && isGrandFormatContext(family, materialName);
}

function parseNumeric(value: string): number | null {
  const n = Number(value.replace(',', '.').replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function isLikelyLaizeValue(n: number, family: string | null | undefined, materialName: string): boolean {
  if (!isGrandFormatContext(family, materialName)) return false;
  if (COMMON_LAIZE_CM.has(n)) return true;
  if (PAPER_MATERIALS.test(materialName) && n >= 200) return false;
  return n >= 100 && n <= 320;
}

function isLikelyGrammageValue(n: number, materialName: string): boolean {
  if (PAPER_MATERIALS.test(materialName)) return true;
  return n >= 80 && n <= 900;
}

function buildCharacteristic(
  type: CharacteristicType,
  rawValue: string,
  opts?: { inconsistent?: boolean; unit?: string | null },
): MaterialCharacteristic {
  const value = rawValue.trim();
  let unit = opts?.unit ?? null;
  let displayValue = value;

  if (type === 'grammage') {
    if (/g\/m²|g\/m2/i.test(value)) {
      unit = 'g/m²';
      displayValue = value.replace(/\s+/g, '');
    } else if (/g|gr|gramme/i.test(value)) {
      unit = unit ?? 'g';
      displayValue = value.replace(/\s+/g, '');
      if (!/g|gr/i.test(displayValue) && /^\d+/.test(displayValue)) displayValue = `${displayValue}g`;
    } else if (/^\d+([.,]\d+)?$/.test(value)) {
      unit = 'g';
      displayValue = `${value}g`;
    }
  } else if (type === 'epaisseur') {
    unit = unit ?? 'mm';
    displayValue = value.replace(/\s+/g, '');
    if (!/mm|µm/i.test(displayValue) && /^\d+/.test(displayValue)) displayValue = `${displayValue}mm`;
  } else if (type === 'laize') {
    unit = unit ?? 'cm';
    displayValue = value.replace(/\s+/g, '');
    if (!/cm/i.test(displayValue) && /^\d+/.test(displayValue)) displayValue = `${displayValue}cm`;
  }

  const typeLabel = TYPE_LABELS[type];
  return {
    type,
    typeLabel,
    value,
    unit,
    displayValue,
    display: `${typeLabel} · ${displayValue}`,
    isInconsistent: opts?.inconsistent ?? false,
  };
}

/** Détermine la caractéristique principale sans doublon grammage/épaisseur */
export function deriveMainCharacteristic(
  row: MaterialPriceUnifiedRow,
  materialName: string,
): MaterialCharacteristic | null {
  const family = row.family;
  const rawGrammage = row.grammage?.trim() || null;
  const rawThickness = row.thickness?.trim() || null;
  const format = (row.format ?? row.formatLabel)?.trim();
  const face = row.face?.trim();

  const hasValidThickness = !!(rawThickness && looksLikeThickness(rawThickness));
  const hasValidGrammage = !!(rawGrammage && looksLikeGrammage(rawGrammage) && !looksLikeThickness(rawGrammage));
  const grammageIsMisplacedThickness = !!(rawGrammage && looksLikeThickness(rawGrammage));

  if (hasValidThickness && hasValidGrammage) {
    if (isPlateMaterial(materialName)) return buildCharacteristic('epaisseur', rawThickness!);
    return buildCharacteristic('grammage', rawGrammage!);
  }

  if (hasValidThickness) {
    return buildCharacteristic('epaisseur', rawThickness!);
  }

  if (grammageIsMisplacedThickness) {
    return buildCharacteristic('epaisseur', rawGrammage!, { inconsistent: true });
  }

  if (hasValidGrammage) {
    return buildCharacteristic('grammage', rawGrammage!);
  }

  if (rawGrammage && looksLikeLaize(rawGrammage, family, materialName)) {
    return buildCharacteristic('laize', rawGrammage);
  }

  if (format && FORMAT_RE.test(format)) {
    return buildCharacteristic('format', format.match(FORMAT_RE)![1]!.toUpperCase());
  }

  if (face && FACE_RE.test(face)) {
    const m = face.match(FACE_RE);
    const label = m?.[1] ?? face;
    return buildCharacteristic('face', label.charAt(0).toUpperCase() + label.slice(1).toLowerCase());
  }

  if (rawGrammage && FINISH_RE.test(rawGrammage)) {
    const m = rawGrammage.match(FINISH_RE);
    return buildCharacteristic('finition', m?.[1] ?? rawGrammage);
  }

  if (rawGrammage && SIZE_RE.test(rawGrammage)) {
    return buildCharacteristic('taille', rawGrammage.match(SIZE_RE)![1]!.toUpperCase());
  }

  const nameThickness = row.name.match(THICKNESS_TOKEN)?.[1];
  const nameGrammage = row.name.match(GRAMMAGE_TOKEN)?.[1];

  if (nameThickness && (!nameGrammage || isPlateMaterial(materialName))) {
    return buildCharacteristic('epaisseur', nameThickness);
  }

  if (nameGrammage) {
    return buildCharacteristic('grammage', nameGrammage);
  }

  const nameLaize = row.name.match(LAIZE_TOKEN)?.[1];
  if (nameLaize && isGrandFormatContext(family, materialName)) {
    return buildCharacteristic('laize', nameLaize);
  }

  if (rawThickness) {
    return buildCharacteristic('epaisseur', rawThickness);
  }

  if (rawGrammage) {
    if (/^\d+([.,]\d+)?$/.test(rawGrammage)) {
      const n = parseNumeric(rawGrammage)!;
      if (isPlateMaterial(materialName) || (n <= 30 && !isGrandFormatContext(family, materialName))) {
        return buildCharacteristic('epaisseur', rawGrammage);
      }
      if (isLikelyLaizeValue(n, family, materialName)) {
        return buildCharacteristic('laize', `${rawGrammage}cm`);
      }
      if (isLikelyGrammageValue(n, materialName)) {
        return buildCharacteristic('grammage', rawGrammage);
      }
      return buildCharacteristic('grammage', rawGrammage);
    }
    return buildCharacteristic('autre', rawGrammage);
  }

  if (format) return buildCharacteristic('format', format);
  if (face) return buildCharacteristic('face', face);

  return null;
}

function normalizeGrammage(raw: string | null | undefined, name: string): string | null {
  const fromField = raw?.trim();
  if (fromField && looksLikeGrammage(fromField) && !looksLikeThickness(fromField)) {
    if (/g|gr|gramme|g\/m/i.test(fromField)) return fromField.replace(/\s+/g, '');
    if (/^\d+([.,]\d+)?$/.test(fromField)) return `${fromField}g`;
    return fromField;
  }
  const m = name.match(GRAMMAGE_TOKEN);
  if (!m) return null;
  return m[1]!.replace(/\s+/g, '');
}

function normalizeThickness(raw: string | null | undefined, name: string): string | null {
  const fromField = raw?.trim();
  if (fromField && looksLikeThickness(fromField)) return fromField.replace(/\s+/g, '');
  if (fromField && looksLikeGrammage(fromField)) return null;
  const m = name.match(THICKNESS_TOKEN);
  if (!m) return null;
  return m[1]!.replace(/\s+/g, '');
}

function isTechnicalId(value: string): boolean {
  return /^cmr[a-z0-9]{8,}$/i.test(value) || value.startsWith('print-');
}

const GLOSSY_EXCLUSIVE_WEIGHTS = new Set(['120g', '160g', '180g']);
const MERGED_GLOSSY_PCB_RE = /glossy\s*\/\s*couch[eé]\s*brillant/i;

/** Sépare les libellés legacy « Glossy / Couché brillant » → Glossy ou PCB */
export function normalizeLegacyPaperLabel(
  rawName: string,
  grammage: string | null | undefined,
  materialKey?: string | null,
): string {
  if (!MERGED_GLOSSY_PCB_RE.test(rawName)) return rawName;
  const keyBase = materialKey?.split(':')[0]?.toLowerCase();
  if (keyBase === 'glossy') {
    return rawName.replace(MERGED_GLOSSY_PCB_RE, 'Glossy').replace(/\s+/g, ' ').trim();
  }
  if (keyBase === 'pcb') {
    return rawName.replace(MERGED_GLOSSY_PCB_RE, 'PCB').replace(/\s+/g, ' ').trim();
  }
  const g = grammage?.trim() || rawName.match(GRAMMAGE_TOKEN)?.[1] || '';
  if (GLOSSY_EXCLUSIVE_WEIGHTS.has(g)) {
    return `Glossy${g ? ` ${g}` : ''}`.trim();
  }
  return `PCB${g ? ` ${g}` : ''}`.trim();
}

export function isLegacyMergedPaperLabel(label: string): boolean {
  return MERGED_GLOSSY_PCB_RE.test(label);
}

export function isGenericMaterialName(name: string): boolean {
  const t = name.trim();
  if (!t || t === '—') return true;
  return GENERIC_NAME_PATTERNS.some((re) => re.test(t));
}

function resolveMaterialName(
  row: MaterialPriceUnifiedRow,
  rawName: string,
): { materialName: string; isIncompleteName: boolean } {
  const stripped = stripVariantsFromName(rawName) || rawName.trim();

  if (!isGenericMaterialName(stripped)) {
    return { materialName: stripped, isIncompleteName: false };
  }

  if (row.articleName?.trim()) {
    const fromArticle = stripVariantsFromName(row.articleName.trim());
    if (!isGenericMaterialName(fromArticle)) {
      return { materialName: fromArticle, isIncompleteName: false };
    }
  }

  const key = row.materialKey?.trim();
  if (key && !isTechnicalId(key) && !key.startsWith('catalog-') && key.length > 2) {
    const fromKey = stripVariantsFromName(
      key.replace(/[-_:]+/g, ' ').replace(/\s+/g, ' ').trim(),
    );
    if (!isGenericMaterialName(fromKey)) {
      return { materialName: fromKey, isIncompleteName: false };
    }
  }

  if (row.family?.trim() && row.family !== '—' && !/^autre$/i.test(row.family.trim())) {
    const fam = row.family.trim();
    if (!isGenericMaterialName(fam) && fam.length > 2) {
      return { materialName: fam, isIncompleteName: true };
    }
  }

  return { materialName: 'À compléter', isIncompleteName: true };
}

/** Nom affiché avec variante (ex. Acrylic + 3mm → Acrylic 3mm) */
function buildDisplayMaterialName(
  baseName: string,
  characteristic: MaterialCharacteristic | null,
): string {
  if (!characteristic?.displayValue?.trim()) return baseName;
  const v = characteristic.displayValue.trim();
  const normalizedHay = baseName.toLowerCase().replace(/\s+/g, '');
  const normalizedVal = v.toLowerCase().replace(/\s+/g, '');
  if (normalizedHay.includes(normalizedVal)) return baseName;

  if (
    characteristic.type === 'epaisseur' ||
    characteristic.type === 'grammage' ||
    characteristic.type === 'laize' ||
    characteristic.type === 'format' ||
    characteristic.type === 'taille'
  ) {
    return `${baseName} ${v}`.trim();
  }
  return baseName;
}

function buildPrimaryReference(
  row: MaterialPriceUnifiedRow,
  materialName: string,
  characteristic: MaterialCharacteristic | null,
): string {
  const key = row.materialKey?.trim();
  if (key && key !== row.id && !key.startsWith('catalog-') && key.length > 1 && !isTechnicalId(key)) {
    return key.toUpperCase();
  }

  const slug = materialName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase();

  if (characteristic) {
    const n = characteristic.displayValue.replace(/[^0-9]/g, '');
    if (n) {
      if (characteristic.type === 'epaisseur') return `${slug}-${n}MM`;
      if (characteristic.type === 'grammage' || characteristic.type === 'laize') return `${slug}-${n}`;
    }
  }
  return slug || '—';
}

function buildSecondaryReference(row: MaterialPriceUnifiedRow, primary: string): string | null {
  // Réf. métier seulement (SKU stock) — jamais l’id technique Prisma / print- / cuid.
  const sku = row.stockSku?.trim();
  if (!sku) return null;
  if (isTechnicalId(sku) || sku.startsWith('print-') || sku.startsWith('catalog-')) return null;
  if (sku.toUpperCase() === primary.toUpperCase()) return null;
  return sku;
}

/** Dérive les champs tableau Matières sans concaténation dans les cellules */
export function deriveMaterialTableFields(row: MaterialPriceUnifiedRow): MaterialTableFields {
  const rawName = row.name?.trim() || '';
  const normalizedRaw = normalizeLegacyPaperLabel(rawName || '—', row.grammage ?? row.thickness, row.materialKey);
  const { materialName: baseName, isIncompleteName } = resolveMaterialName(row, normalizedRaw || '—');
  const mainCharacteristic = deriveMainCharacteristic(row, baseName);
  const materialName = buildDisplayMaterialName(baseName, mainCharacteristic);
  const grammage = normalizeGrammage(row.grammage, rawName);
  const thickness = normalizeThickness(row.thickness, rawName);
  const primaryReference = buildPrimaryReference(row, materialName, mainCharacteristic);
  const secondaryReference = buildSecondaryReference(row, primaryReference);
  const family = row.family?.trim() || '—';

  return {
    materialName,
    grammage,
    thickness,
    mainCharacteristic,
    primaryReference,
    secondaryReference,
    family,
    isIncompleteName,
  };
}

/** Ligne à contrôler : anomalie, stock non lié ou nom incomplet */
export function isMaterialRowToVerify(row: MaterialPriceUnifiedRow): boolean {
  const fields = deriveMaterialTableFields(row);
  return (row.anomaliesCount ?? 0) > 0 || !row.stockItemId || fields.isIncompleteName;
}

export function formatGroupSubtitle(count: number): string {
  return `${count} déclinaison${count > 1 ? 's' : ''}`;
}

export function characteristicToStorage(
  type: CharacteristicType,
  value: string,
): { grammage: string | null; thickness: string | null } {
  const v = value.trim();
  if (!v) return { grammage: null, thickness: null };
  switch (type) {
    case 'epaisseur':
      return { grammage: null, thickness: v };
    case 'grammage':
    case 'laize':
    case 'format':
    case 'taille':
    case 'face':
    case 'finition':
    case 'couleur':
    case 'autre':
      return { grammage: v, thickness: null };
    default:
      return { grammage: v, thickness: null };
  }
}

const CHAR2_PREFIX = '__c2__:';

/** Encode / decode 2e caractéristique dans anomalyNotes (sans migration DB). */
export function encodeSecondaryCharacteristic(
  type: CharacteristicType,
  value: string,
  existingNotes?: string | null,
): string | null {
  const v = value.trim();
  const base = (existingNotes ?? '').replace(new RegExp(`${CHAR2_PREFIX}[^\\n]*`, 'g'), '').trim();
  if (!v) return base || null;
  const encoded = `${CHAR2_PREFIX}${type}:${v}`;
  return base ? `${base}\n${encoded}` : encoded;
}

export function decodeSecondaryCharacteristic(
  notes?: string | null,
): { type: CharacteristicType; value: string } | null {
  if (!notes) return null;
  const m = notes.match(/__c2__:([a-z]+):(.+)/i);
  if (!m) return null;
  const type = m[1] as CharacteristicType;
  const value = m[2]!.trim();
  if (!value) return null;
  return { type, value };
}

/** Reconstruit le libellé catalogue à partir du nom + caractéristique */
export function buildCatalogLabel(
  materialName: string,
  charType: CharacteristicType,
  charValue: string,
): string {
  const base = materialName.trim();
  const v = charValue.trim();
  if (!base) return v;
  if (!v) return base;
  if (base.toLowerCase().includes(v.toLowerCase())) return base;
  return `${base} ${v}`.trim();
}
