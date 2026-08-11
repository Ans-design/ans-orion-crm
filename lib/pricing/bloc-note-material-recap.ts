import { PACKAGING_CHUTE_MM } from '@/lib/packaging/material-recap';
import { getBindingDetailFromConfig } from '@/lib/data/binding-catalog';
import { parsePaperGrammageG } from '@/lib/pos/thick-paper-grammage-policy';
import { isRectoVerso } from '@/lib/pricing/config-normalize';
import {
  computeBlocNotePrice,
  isBlocNoteArticleId,
  parseBlocNoteSheetCount,
} from '@/lib/pricing/bloc-note-pricing';

export type BlocNoteMaterialRecap = {
  kind: 'bloc_note';
  articleId: string;
  produitLabel: string;
  formatLabel: string;
  dimensionsLabel: string;
  typeSupportTarif: string;
  matiereCouverture: string;
  grammageCouverture: string;
  hasPvcTranslucide: boolean;
  matiereInterieure: string;
  grammageInterieur: string;
  sheetCount: number;
  pageCount: number;
  impressionInterieur: string;
  impressionCouverture: string;
  finitionPelliculage: string;
  coverSurfaceM2: number;
  interiorSurfaceM2: number;
  totalGrossSurfaceM2: number;
  stockSummary: string;
  blockThicknessMm: number;
  bindingLabel: string;
  bindingDetail?: string;
  prixUnitaire: number | null;
  prixCalculable: boolean;
  margeRule: string;
  /** true si format ou feuilles pas encore renseignés */
  incomplete?: boolean;
};

const FORMAT_MM: Record<string, [number, number, string]> = {
  A4: [210, 297, '210×297 mm'],
  B5: [176, 250, '176×250 mm'],
  A5: [148, 210, '148×210 mm'],
  A6: [105, 148, '105×148 mm'],
};

function parseQty(config: Record<string, unknown>): number {
  const n = Number(config.qty ?? config.quantite ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function resolveFormat(config: Record<string, unknown>): {
  widthMm: number;
  heightMm: number;
  label: string;
} | null {
  const raw = String(config.format ?? '').trim();
  const key = raw.match(/\b(A4|B5|A5|A6)\b/i)?.[1]?.toUpperCase();
  if (key && FORMAT_MM[key]) {
    const [w, h, dim] = FORMAT_MM[key];
    return { widthMm: w, heightMm: h, label: `${key} — ${dim}` };
  }
  const long = Number(config.longueur ?? config.largeur_format);
  const larg = Number(config.largeur ?? config.hauteur_format);
  if (Number.isFinite(long) && Number.isFinite(larg) && long > 0 && larg > 0) {
    return {
      widthMm: long,
      heightMm: larg,
      label: raw || 'Format personnalisé',
    };
  }
  return null;
}

function grossUnitM2(widthMm: number, heightMm: number): number {
  const brutW = widthMm + 100;
  const brutH = heightMm + 100;
  return parseFloat(((brutW * brutH) / 1_000_000).toFixed(6));
}

function estimateThicknessMm(sheetCount: number, grammageG: number): number {
  const caliper = grammageG * 0.0012;
  return Math.round(sheetCount * caliper * 10) / 10;
}

export function calculateBlocNoteMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
): BlocNoteMaterialRecap | null {
  if (!isBlocNoteArticleId(articleId)) return null;

  const fmt = resolveFormat(config);
  const sheetCount = parseBlocNoteSheetCount(config);
  const qty = parseQty(config);

  if (!fmt || sheetCount == null) {
    const matiereCouverture = String(config.matiere_couverture ?? '').trim();
    const hasPvcTranslucide = /pvc\s*translucide/i.test(matiereCouverture);
    const bindingLabel = String(config.type_reliure ?? '').trim();
    return {
      kind: 'bloc_note',
      articleId,
      produitLabel: String(config.produit ?? 'Bloc-note').trim() || 'Bloc-note',
      formatLabel: fmt?.label ?? '—',
      dimensionsLabel: fmt ? `${fmt.widthMm}×${fmt.heightMm} mm` : '—',
      typeSupportTarif: String(config.type_support_couverture ?? '—'),
      matiereCouverture: matiereCouverture || '—',
      grammageCouverture: String(config.grammage_couverture ?? '—'),
      hasPvcTranslucide,
      matiereInterieure: String(config.famille_papier ?? '—'),
      grammageInterieur: String(config.grammage_interieur ?? '—'),
      sheetCount: sheetCount ?? 0,
      pageCount: 0,
      impressionInterieur: [
        String(config.couleur_impression ?? '').trim(),
        String(config.technologie_interieur ?? '').trim(),
        String(config.face_interieur ?? '').trim(),
      ].filter(Boolean).join(' · ') || '—',
      impressionCouverture: String(config.technologie_couverture ?? '—'),
      finitionPelliculage: String(config.finition_pelliculage ?? '—'),
      coverSurfaceM2: 0,
      interiorSurfaceM2: 0,
      totalGrossSurfaceM2: 0,
      stockSummary: '—',
      blockThicknessMm: 0,
      bindingLabel: bindingLabel || '—',
      prixUnitaire: null,
      prixCalculable: false,
      margeRule: `Surface brute +100 mm — chute +${PACKAGING_CHUTE_MM} mm/côté (intérieur)`,
      incomplete: true,
    };
  }

  const unitGross = grossUnitM2(fmt.widthMm, fmt.heightMm);
  const coverSurfaceM2 = unitGross;
  const interiorSurfaceM2 = parseFloat((unitGross * sheetCount).toFixed(6));
  const totalGrossSurfaceM2 = parseFloat(((coverSurfaceM2 + interiorSurfaceM2) * qty).toFixed(6));

  const matiereCouverture = String(config.matiere_couverture ?? '').trim();
  const hasPvcTranslucide = /pvc\s*translucide/i.test(matiereCouverture);
  const grammageIntG = parsePaperGrammageG(String(config.grammage_interieur ?? '')) ?? 80;
  const rv = isRectoVerso(config.face_interieur);
  const pageCount = rv ? sheetCount * 2 : sheetCount;

  const bindingLabel = String(config.type_reliure ?? '').trim();
  const bindingEval = bindingLabel
    ? getBindingDetailFromConfig(bindingLabel, config)
    : null;

  const pricing = computeBlocNotePrice(config);
  const stockParts = [
    '1 couverture',
    hasPvcTranslucide ? 'PVC translucide' : null,
    `${sheetCount} feuille(s) intérieur`,
    bindingLabel ? `reliure : ${bindingLabel}` : null,
  ].filter(Boolean);

  return {
    kind: 'bloc_note',
    articleId,
    produitLabel: String(config.produit ?? 'Bloc-note').trim() || 'Bloc-note',
    formatLabel: fmt.label,
    dimensionsLabel: `${fmt.widthMm}×${fmt.heightMm} mm`,
    typeSupportTarif: String(config.type_support_couverture ?? '—'),
    matiereCouverture: matiereCouverture || '—',
    grammageCouverture: String(config.grammage_couverture ?? '—'),
    hasPvcTranslucide,
    matiereInterieure: String(config.famille_papier ?? '—'),
    grammageInterieur: String(config.grammage_interieur ?? '—'),
    sheetCount,
    pageCount,
    impressionInterieur: [
      String(config.couleur_impression ?? '').trim(),
      String(config.technologie_interieur ?? '').trim(),
      String(config.face_interieur ?? '').trim(),
    ].filter(Boolean).join(' · ') || '—',
    impressionCouverture: String(config.technologie_couverture ?? '—'),
    finitionPelliculage: String(config.finition_pelliculage ?? '—'),
    coverSurfaceM2,
    interiorSurfaceM2,
    totalGrossSurfaceM2,
    stockSummary: stockParts.join(' + '),
    blockThicknessMm: estimateThicknessMm(sheetCount, grammageIntG),
    bindingLabel: bindingLabel || '—',
    bindingDetail: bindingEval?.summary,
    prixUnitaire: pricing.calculable ? pricing.prixUnitaire : null,
    prixCalculable: pricing.calculable,
    margeRule: `Surface brute +100 mm — chute +${PACKAGING_CHUTE_MM} mm/côté (intérieur)`,
  };
}
