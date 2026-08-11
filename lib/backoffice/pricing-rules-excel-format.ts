import { parseBoolExcel } from '@/lib/direct-sale/categories';

function pick(raw: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = raw[k] ?? raw[k.toUpperCase()] ?? raw[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function num(val: string) {
  const n = Number(String(val).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

export const PAPER_FORMAT_EXCEL_COLUMNS = [
  'ID', 'FORMAT', 'LARGEUR MM', 'HAUTEUR MM', 'RATIO A4', 'SUPPLÉMENT AR', 'DÉCOUPE AR', 'FORMULE', 'ACTIF', 'DÉTAIL',
] as const;

export function parsePaperFormatExcelRow(raw: Record<string, unknown>, line: number) {
  const formatCode = pick(raw, 'FORMAT', 'format', 'formatCode');
  if (!formatCode) return { error: `Ligne ${line} : FORMAT requis` as const };
  return {
    row: {
      excelId: pick(raw, 'ID') || null,
      formatCode: formatCode.toUpperCase(),
      widthMm: num(pick(raw, 'LARGEUR MM', 'largeur mm')) || 210,
      heightMm: num(pick(raw, 'HAUTEUR MM', 'hauteur mm')) || 297,
      ratioA4: num(pick(raw, 'RATIO A4', 'ratio a4')) || 1,
      supplementAr: num(pick(raw, 'SUPPLÉMENT AR', 'supplement ar')),
      cutAr: num(pick(raw, 'DÉCOUPE AR', 'decoupe ar')),
      formula: pick(raw, 'FORMULE', 'formule') || null,
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL', 'detail') || null,
    },
  };
}

export function paperFormatToExcelRow(r: {
  excelId?: string | null;
  formatCode: string;
  widthMm: number;
  heightMm: number;
  ratioA4: number;
  supplementAr: number;
  cutAr: number;
  formula?: string | null;
  active: boolean;
  details?: string | null;
}) {
  return {
    ID: r.excelId ?? '',
    FORMAT: r.formatCode,
    'LARGEUR MM': r.widthMm,
    'HAUTEUR MM': r.heightMm,
    'RATIO A4': r.ratioA4,
    'SUPPLÉMENT AR': r.supplementAr,
    'DÉCOUPE AR': r.cutAr,
    FORMULE: r.formula ?? '',
    ACTIF: r.active ? 'oui' : 'non',
    DÉTAIL: r.details ?? '',
  };
}

export const SUPPORT_FACE_EXCEL_COLUMNS = [
  'ID', 'SUPPORT / MATIÈRE', 'RECTO AUTORISÉ', 'VERSO AUTORISÉ', 'RECTO-VERSO AUTORISÉ', 'RAISON', 'ACTIF', 'DÉTAIL',
] as const;

export function parseSupportFaceExcelRow(raw: Record<string, unknown>, line: number) {
  const label = pick(raw, 'SUPPORT / MATIÈRE', 'SUPPORT', 'support');
  if (!label) return { error: `Ligne ${line} : SUPPORT / MATIÈRE requis` as const };
  const key = label.toLowerCase().replace(/\s+/g, '_').slice(0, 80);
  return {
    row: {
      excelId: pick(raw, 'ID') || null,
      supportKey: key,
      supportLabel: label,
      rectoAllowed: parseBoolExcel(pick(raw, 'RECTO AUTORISÉ') || 'oui'),
      versoAllowed: parseBoolExcel(pick(raw, 'VERSO AUTORISÉ') || 'oui'),
      rectoVersoAllowed: parseBoolExcel(pick(raw, 'RECTO-VERSO AUTORISÉ') || 'oui'),
      reason: pick(raw, 'RAISON') || null,
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
    },
  };
}

export function supportFaceToExcelRow(r: {
  excelId?: string | null;
  supportLabel: string;
  rectoAllowed: boolean;
  versoAllowed: boolean;
  rectoVersoAllowed: boolean;
  reason?: string | null;
  active: boolean;
  details?: string | null;
}) {
  return {
    ID: r.excelId ?? '',
    'SUPPORT / MATIÈRE': r.supportLabel,
    'RECTO AUTORISÉ': r.rectoAllowed ? 'oui' : 'non',
    'VERSO AUTORISÉ': r.versoAllowed ? 'oui' : 'non',
    'RECTO-VERSO AUTORISÉ': r.rectoVersoAllowed ? 'oui' : 'non',
    RAISON: r.reason ?? '',
    ACTIF: r.active ? 'oui' : 'non',
    DÉTAIL: r.details ?? '',
  };
}

export const MATERIAL_EQUIV_EXCEL_COLUMNS = [
  'ID', 'MATIÈRE', 'GRAMMAGE', 'GRAMMAGE MIN', 'GRAMMAGE MAX', 'MATIÈRE RÉFÉRENCE', 'GRAMMAGE RÉFÉRENCE',
  'OPÉRATION', 'VALEUR AR', 'SUPPLÉMENT AR', 'PRIX IDENTIQUE OUI/NON', 'GROUPE PRIX', 'ACTIF', 'DÉTAIL',
] as const;

export function parseMaterialEquivExcelRow(raw: Record<string, unknown>, line: number) {
  const materialLabel = pick(raw, 'MATIÈRE', 'matiere');
  if (!materialLabel) return { error: `Ligne ${line} : MATIÈRE requise` as const };
  const grammageSingle = parseInt(String(pick(raw, 'GRAMMAGE') || '').replace(/\D/g, ''), 10);
  const gMinRaw = pick(raw, 'GRAMMAGE MIN');
  const gMaxRaw = pick(raw, 'GRAMMAGE MAX');
  const grammageMin = Number.isFinite(grammageSingle) && !gMinRaw
    ? grammageSingle
    : (parseInt(gMinRaw, 10) || 0);
  const grammageMax = Number.isFinite(grammageSingle) && !gMaxRaw
    ? grammageSingle
    : (gMaxRaw ? parseInt(gMaxRaw, 10) : null);
  const op = String(pick(raw, 'OPÉRATION') || '').trim();
  const valeur = num(pick(raw, 'VALEUR AR'));
  let supplementAr = num(pick(raw, 'SUPPLÉMENT AR'));
  if (op === '-' || op === '−') supplementAr = -Math.abs(valeur || Math.abs(supplementAr));
  else if (op === '+' || op === 'plus') supplementAr = Math.abs(valeur || Math.abs(supplementAr));
  else if (valeur && !pick(raw, 'SUPPLÉMENT AR')) supplementAr = valeur;
  return {
    row: {
      excelId: pick(raw, 'ID') || null,
      materialKey: materialLabel.toLowerCase().replace(/\s+/g, '_').slice(0, 80),
      materialLabel,
      grammageMin,
      grammageMax,
      referenceMaterial: pick(raw, 'MATIÈRE RÉFÉRENCE') || materialLabel,
      referenceGrammage: pick(raw, 'GRAMMAGE RÉFÉRENCE') || null,
      supplementAr,
      identicalPrice: parseBoolExcel(pick(raw, 'PRIX IDENTIQUE OUI/NON') || 'non'),
      priceGroup: pick(raw, 'GROUPE PRIX') || null,
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
    },
  };
}

export const THICK_PAPER_EXCEL_COLUMNS = [
  'ID', 'TYPE SUPPORT', 'GRAMMAGE MIN', 'GRAMMAGE MAX', 'FORMULE', 'PRIX RÉFÉRENCE',
  'SUPPLÉMENT AR', 'MATIÈRE VIERGE REQUISE', 'NB COUCHES VIERGES', 'FINITION REQUISE', 'ACTIF', 'DÉTAIL',
] as const;

export function parseThickPaperExcelRow(raw: Record<string, unknown>, line: number) {
  const grammageMin = parseInt(pick(raw, 'GRAMMAGE MIN'), 10);
  if (!Number.isFinite(grammageMin)) return { error: `Ligne ${line} : GRAMMAGE MIN requis` as const };
  return {
    row: {
      excelId: pick(raw, 'ID') || null,
      supportType: pick(raw, 'TYPE SUPPORT') || 'papier',
      grammageMin,
      grammageMax: pick(raw, 'GRAMMAGE MAX') ? parseInt(pick(raw, 'GRAMMAGE MAX'), 10) : null,
      formula: pick(raw, 'FORMULE') || 'custom',
      referencePriceKey: pick(raw, 'PRIX RÉFÉRENCE') || null,
      supplementAr: num(pick(raw, 'SUPPLÉMENT AR')),
      blankMaterialRequired: parseBoolExcel(pick(raw, 'MATIÈRE VIERGE REQUISE') || 'non'),
      blankLayers: parseInt(pick(raw, 'NB COUCHES VIERGES'), 10) || 0,
      finishingRequired: pick(raw, 'FINITION REQUISE') || null,
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
    },
  };
}

export const BLANK_MATERIAL_EXCEL_COLUMNS = [
  'ID', 'MATIÈRE VIERGE', 'GRAMMAGE', 'FORMAT BASE', 'LARGEUR MM', 'HAUTEUR MM',
  'PRIX ACHAT', 'UNITÉ ACHAT', 'FOURNISSEUR', 'STOCK LIÉ', 'ACTIF', 'DÉTAIL',
] as const;

export function parseBlankMaterialExcelRow(raw: Record<string, unknown>, line: number) {
  const name = pick(raw, 'MATIÈRE VIERGE', 'MATIERE VIERGE', 'name');
  if (!name) return { error: `Ligne ${line} : MATIÈRE VIERGE requise` as const };
  return {
    row: {
      excelId: pick(raw, 'ID') || null,
      name,
      grammage: pick(raw, 'GRAMMAGE') || null,
      formatBase: pick(raw, 'FORMAT BASE') || 'A4',
      widthMm: pick(raw, 'LARGEUR MM') ? num(pick(raw, 'LARGEUR MM')) : null,
      heightMm: pick(raw, 'HAUTEUR MM') ? num(pick(raw, 'HAUTEUR MM')) : null,
      purchasePrice: num(pick(raw, 'PRIX ACHAT')),
      purchaseUnit: pick(raw, 'UNITÉ ACHAT') || 'feuille',
      supplier: pick(raw, 'FOURNISSEUR') || null,
      stockItemId: pick(raw, 'STOCK LIÉ') || null,
      materialKey: name.toLowerCase().replace(/\s+/g, '_').slice(0, 80),
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
    },
  };
}

export const BASE_PRINTING_EXCEL_COLUMNS = [
  'ID', 'MATIÈRE', 'FAMILLE', 'GRAMMAGE', 'TYPE SUPPORT', 'FORMAT BASE',
  'LARGEUR MM', 'HAUTEUR MM', 'RECTO AUTORISÉ', 'VERSO AUTORISÉ',
  'PRIX A4 NOIR & BLANC', 'PRIX A4 QUADRI COULEUR', 'PRIX A4 JET D’ENCRE COULEUR',
  'PRIX A4 LASER QUADRI COULEUR', 'TYPE IMPRESSION AUTORISÉ', 'TECHNOLOGIE IMPRESSION',
  'PRIX A4 RECTO', 'PRIX A4 RECTO-VERSO', 'UNITÉ PRIX', 'STATUT', 'VISIBLE POS', 'DÉTAIL',
] as const;

export function parseBasePrintingExcelRow(raw: Record<string, unknown>, line: number) {
  const materialKey = pick(raw, 'MATIÈRE', 'matiere', 'materialKey');
  if (!materialKey) return { error: `Ligne ${line} : MATIÈRE requise` as const };
  const prixNb = num(pick(raw, 'PRIX A4 NOIR & BLANC', 'PRIX A4 N&B'));
  const prixQuadri = num(pick(raw, 'PRIX A4 QUADRI COULEUR', 'PRIX A4 QUADRI'));
  const prixJet = num(pick(raw, 'PRIX A4 JET D’ENCRE COULEUR', 'PRIX A4 JET', "PRIX A4 JET D'ENCRE COULEUR"));
  const prixLaser = num(pick(raw, 'PRIX A4 LASER QUADRI COULEUR', 'PRIX A4 LASER'));
  const prixRecto = num(pick(raw, 'PRIX A4 RECTO', 'PRIX A4', 'basePrice'))
    || prixJet
    || prixQuadri
    || prixNb;
  const statusRaw = pick(raw, 'STATUT').toLowerCase();
  const publicationStatus =
    statusRaw.includes('publi') ? 'published' : statusRaw.includes('archiv') ? 'archived' : 'draft';

  return {
    row: {
      articleId: pick(raw, 'ARTICLE ID', 'articleId') || 'imp-impression',
      materialKey,
      grammage: pick(raw, 'GRAMMAGE') || '',
      formatLabel: pick(raw, 'FORMAT BASE', 'FORMAT') || 'A4',
      face: 'recto',
      colorMode: pick(raw, 'TYPE IMPRESSION AUTORISÉ') || '',
      printTechnology: pick(raw, 'TECHNOLOGIE IMPRESSION') || '',
      saleUnit: pick(raw, 'UNITÉ PRIX') || 'pcs',
      basePrice: prixRecto,
      active: parseBoolExcel(pick(raw, 'VISIBLE POS', 'ACTIF') || 'oui'),
      publicationStatus,
      details: pick(raw, 'DÉTAIL', 'FAMILLE', 'TYPE SUPPORT') || null,
      prixRectoVerso: num(pick(raw, 'PRIX A4 RECTO-VERSO')) || null,
      prixNb: prixNb || null,
      prixQuadri: prixQuadri || null,
      prixJet: prixJet || null,
      prixLaser: prixLaser || null,
    },
  };
}

export function basePrintingToExcelRow(r: {
  id: string;
  materialKey: string;
  grammage: string;
  formatLabel: string;
  face: string;
  basePrice: number;
  saleUnit: string;
  publicationStatus: string;
  active: boolean;
  colorMode?: string | null;
  printTechnology?: string | null;
}, rvPrice?: number | null, extras?: {
  prixNb?: number | null;
  prixQuadri?: number | null;
  prixJet?: number | null;
  prixLaser?: number | null;
}) {
  return {
    ID: r.id.slice(-6),
    MATIÈRE: r.materialKey,
    FAMILLE: '',
    GRAMMAGE: r.grammage,
    'TYPE SUPPORT': '',
    'FORMAT BASE': r.formatLabel || 'A4',
    'LARGEUR MM': '',
    'HAUTEUR MM': '',
    'RECTO AUTORISÉ': 'oui',
    'VERSO AUTORISÉ': r.face.includes('verso') ? 'oui' : 'non',
    'PRIX A4 NOIR & BLANC': extras?.prixNb ?? '',
    'PRIX A4 QUADRI COULEUR': extras?.prixQuadri ?? '',
    'PRIX A4 JET D’ENCRE COULEUR': extras?.prixJet ?? '',
    'PRIX A4 LASER QUADRI COULEUR': extras?.prixLaser ?? '',
    'TYPE IMPRESSION AUTORISÉ': r.colorMode ?? '',
    'TECHNOLOGIE IMPRESSION': r.printTechnology ?? '',
    'PRIX A4 RECTO': r.face === 'recto' ? r.basePrice : '',
    'PRIX A4 RECTO-VERSO': rvPrice ?? (r.face.includes('verso') ? r.basePrice : ''),
    'UNITÉ PRIX': r.saleUnit,
    STATUT: r.publicationStatus === 'published' ? 'publié' : r.publicationStatus,
    'VISIBLE POS': r.active ? 'oui' : 'non',
    DÉTAIL: '',
  };
}

export const PRINT_TECH_EXCEL_COLUMNS = [
  'ID', 'RÈGLE', 'SUPPORT CONCERNÉ', 'TYPE IMPRESSION', 'TECHNOLOGIE', 'SUPPLÉMENT AR', 'ACTIF', 'DÉTAIL',
] as const;

export function parsePrintTechExcelRow(raw: Record<string, unknown>, line: number) {
  const ruleCode = pick(raw, 'RÈGLE', 'ruleCode', 'ID');
  if (!ruleCode) return { error: `Ligne ${line} : RÈGLE requise` as const };
  return {
    row: {
      excelId: pick(raw, 'ID') || null,
      ruleCode: ruleCode.toUpperCase().replace(/\s+/g, '_'),
      supportScope: pick(raw, 'SUPPORT CONCERNÉ') || 'offset_standard',
      printType: pick(raw, 'TYPE IMPRESSION') || 'quadri',
      technology: pick(raw, 'TECHNOLOGIE') || 'laser',
      baseTechnology: 'jet',
      supplementAr: num(pick(raw, 'SUPPLÉMENT AR')),
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
    },
  };
}

export function printTechToExcelRow(r: {
  excelId?: string | null;
  ruleCode: string;
  supportScope: string;
  printType: string;
  technology: string;
  supplementAr: number;
  active: boolean;
  details?: string | null;
}) {
  return {
    ID: r.excelId ?? r.ruleCode,
    RÈGLE: r.ruleCode,
    'SUPPORT CONCERNÉ': r.supportScope,
    'TYPE IMPRESSION': r.printType,
    TECHNOLOGIE: r.technology,
    'SUPPLÉMENT AR': r.supplementAr,
    ACTIF: r.active ? 'oui' : 'non',
    DÉTAIL: r.details ?? '',
  };
}

export const SERVICE_EQUIV_EXCEL_COLUMNS = [
  'ID', 'SERVICE', 'SERVICE ÉQUIVALENT', 'RÈGLE PRIX', 'ACTIF', 'DÉTAIL',
] as const;

export function parseServiceEquivExcelRow(raw: Record<string, unknown>, line: number) {
  const serviceLabel = pick(raw, 'SERVICE', 'service');
  if (!serviceLabel) return { error: `Ligne ${line} : SERVICE requis` as const };
  const equivalentLabel = pick(raw, 'SERVICE ÉQUIVALENT') || 'Impression sans finition';
  return {
    row: {
      excelId: pick(raw, 'ID') || null,
      serviceKey: serviceLabel.toLowerCase().replace(/\s+/g, '_').slice(0, 80),
      serviceLabel,
      equivalentKey: equivalentLabel.toLowerCase().replace(/\s+/g, '_').slice(0, 80),
      equivalentLabel,
      priceRule: pick(raw, 'RÈGLE PRIX') || 'same_price',
      supplementAr: 0,
      active: parseBoolExcel(pick(raw, 'ACTIF') || 'oui'),
      details: pick(raw, 'DÉTAIL') || null,
    },
  };
}

export function serviceEquivToExcelRow(r: {
  excelId?: string | null;
  serviceLabel: string;
  equivalentLabel: string;
  priceRule: string;
  active: boolean;
  details?: string | null;
}) {
  return {
    ID: r.excelId ?? '',
    SERVICE: r.serviceLabel,
    'SERVICE ÉQUIVALENT': r.equivalentLabel,
    'RÈGLE PRIX': r.priceRule,
    ACTIF: r.active ? 'oui' : 'non',
    DÉTAIL: r.details ?? '',
  };
}
