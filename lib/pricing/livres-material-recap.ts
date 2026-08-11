import { PACKAGING_CHUTE_MM } from '@/lib/packaging/material-recap';
import {
  getBindingDetailFromConfig,
  getPhysicalSheetsFromConfig,
  parsePagesFromConfig,
  printModeFromConfig,
} from '@/lib/data/binding-catalog';
import { parsePaperGrammageG } from '@/lib/pos/thick-paper-grammage-policy';
import {
  isLivresMixteCouleurInt,
  livresSaddleStitchPagesHint,
  parseLivresFormatDimensionsMm,
  validateLivresConfig,
} from '@/lib/pos/livres-binding-policy';
import { isLivresPricingArticle, computeLivresPrice } from '@/lib/pricing/livres-pricing';
import { resolveNombreCouverture } from '@/lib/pricing/publication-core';
import { estimateSpineThicknessMm, normalizePaperWeightLabel } from '@/lib/print/binding-rules';

export type LivresMaterialRecap = {
  kind: 'livres';
  articleLabel: string;
  typeLabel: string;
  formatLabel: string;
  dimensionsLabel: string;
  pageCount: number;
  sheetCount: number;
  printModeLabel: string;
  couleurInterieur: string;
  pagesNoir: number | null;
  pagesQuadri: number | null;
  matiereInterieure: string;
  grammageInterieur: string;
  matiereCouverture: string;
  grammageCouverture: string;
  /** Feuilles couverture facturées (1, 2, 4…) */
  nombreCouverture: number;
  interiorSurfaceM2: number;
  coverSurfaceM2: number;
  totalGrossSurfaceM2: number;
  blockThicknessMm: number;
  totalThicknessMm: number;
  bindingLabel: string;
  bindingReference: string;
  prixMatiereInterieure: number | null;
  prixImpressionNoir: number | null;
  prixImpressionQuadri: number | null;
  prixCouverture: number | null;
  prixFinition: number | null;
  prixReliure: number | null;
  prixUnitaire: number | null;
  prixCalculable: boolean;
  margeRule: string;
  alert: string | null;
  incomplete?: boolean;
};

function parseQty(config: Record<string, unknown>): number {
  const n = Number(config.qty ?? config.quantite ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function grossUnitM2(widthMm: number, heightMm: number): number {
  const brutW = widthMm + PACKAGING_CHUTE_MM;
  const brutH = heightMm + PACKAGING_CHUTE_MM;
  return parseFloat(((brutW * brutH) / 1_000_000).toFixed(6));
}

function estimateCoverThicknessMm(grammageG: number): number {
  if (grammageG >= 600) return 0.6;
  if (grammageG >= 350) return 0.45;
  if (grammageG >= 250) return 0.35;
  return 0.28;
}

export function calculateLivresMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
): LivresMaterialRecap | null {
  if (!isLivresPricingArticle(articleId)) return null;

  const format = String(config.format ?? '');
  const dims = parseLivresFormatDimensionsMm(format, config);
  const pageCount = parsePagesFromConfig(config);

  if (!dims || pageCount == null || pageCount <= 0) {
    return {
      kind: 'livres',
      articleLabel: 'Livre / publication',
      typeLabel: String(config.type ?? '—'),
      formatLabel: format || '—',
      dimensionsLabel: dims ? `${dims.short}×${dims.long} mm` : '—',
      pageCount: pageCount ?? 0,
      sheetCount: 0,
      printModeLabel: '—',
      couleurInterieur: String(config.couleur_int ?? '—'),
      pagesNoir: null,
      pagesQuadri: null,
      matiereInterieure: String(config.matiere_int ?? '—'),
      grammageInterieur: String(config.grammage_int ?? '—'),
      matiereCouverture: String(config.matiere_couv ?? '—'),
      grammageCouverture: String(config.grammage_couv ?? '—'),
      nombreCouverture: resolveNombreCouverture(config),
      interiorSurfaceM2: 0,
      coverSurfaceM2: 0,
      totalGrossSurfaceM2: 0,
      blockThicknessMm: 0,
      totalThicknessMm: 0,
      bindingLabel: String(config.reliure ?? '—'),
      bindingReference: '—',
      prixMatiereInterieure: null,
      prixImpressionNoir: null,
      prixImpressionQuadri: null,
      prixCouverture: null,
      prixFinition: null,
      prixReliure: null,
      prixUnitaire: null,
      prixCalculable: false,
      margeRule: 'Marge commerciale × remise volume',
      alert: 'Complétez format et nombre de pages pour le calcul matière détaillé.',
      incomplete: true,
    };
  }

  const widthMm = dims.short;
  const heightMm = dims.long;
  const unitGross = grossUnitM2(widthMm, heightMm);
  const physicalSheets = getPhysicalSheetsFromConfig(config) ?? pageCount;
  const printMode = printModeFromConfig(config);
  const printModeLabel = printMode === 'recto_verso' ? 'Recto-verso' : 'Recto';

  const grammageIntG = parsePaperGrammageG(String(config.grammage_int ?? '')) ?? 80;
  const grammageCouvG = parsePaperGrammageG(String(config.grammage_couv ?? '')) ?? 250;
  const paperWeightLabel = normalizePaperWeightLabel(config.grammage_int ?? '80g');

  const qty = parseQty(config);
  const interiorSurfaceM2 = parseFloat((unitGross * physicalSheets).toFixed(6));
  const nombreCouverture = resolveNombreCouverture(config);
  const coverSurfaceM2 = parseFloat((unitGross * nombreCouverture).toFixed(6));
  const totalGrossSurfaceM2 = parseFloat(((interiorSurfaceM2 + coverSurfaceM2) * qty).toFixed(6));

  const blockThicknessMm = estimateSpineThicknessMm({
    physicalSheets,
    paperWeight: paperWeightLabel,
  });
  const coverThicknessMm = estimateCoverThicknessMm(grammageCouvG);
  const totalThicknessMm = Math.round((blockThicknessMm + coverThicknessMm * 2) * 10) / 10;

  const bindingLabel = String(config.reliure ?? '').trim();
  const bindingDetail = bindingLabel ? getBindingDetailFromConfig(bindingLabel, config) : null;

  const pricing = computeLivresPrice(articleId, config, qty);
  const mixte = isLivresMixteCouleurInt(config);

  const saddleHint = livresSaddleStitchPagesHint(config);
  const validationAlert = validateLivresConfig(config);
  const alert = validationAlert ?? saddleHint;

  return {
    kind: 'livres',
    articleLabel: 'Livre / publication',
    typeLabel: String(config.type ?? '—'),
    formatLabel: format || '—',
    dimensionsLabel: `${widthMm}×${heightMm} mm`,
    pageCount,
    sheetCount: physicalSheets,
    printModeLabel,
    couleurInterieur: String(config.couleur_int ?? '—'),
    pagesNoir: mixte ? Number(config.pages_noir ?? 0) : null,
    pagesQuadri: mixte ? Number(config.pages_quadri ?? 0) : null,
    matiereInterieure: String(config.matiere_int ?? '—'),
    grammageInterieur: String(config.grammage_int ?? '—'),
    matiereCouverture: String(config.matiere_couv ?? '—'),
    grammageCouverture: String(config.grammage_couv ?? '—'),
    nombreCouverture,
    interiorSurfaceM2,
    coverSurfaceM2,
    totalGrossSurfaceM2,
    blockThicknessMm,
    totalThicknessMm,
    bindingLabel: bindingLabel || '—',
    bindingReference: bindingDetail?.summary ?? '—',
    prixMatiereInterieure: pricing.breakdown?.prixMatiereInterieure ?? null,
    prixImpressionNoir: pricing.breakdown?.prixImpressionNoir ?? null,
    prixImpressionQuadri: pricing.breakdown?.prixImpressionQuadri ?? null,
    prixCouverture: pricing.breakdown?.prixCouverture ?? null,
    prixFinition: pricing.breakdown?.prixFinition ?? null,
    prixReliure: pricing.breakdown?.prixReliure ?? null,
    prixUnitaire: pricing.calculable ? pricing.prixUnitaire : null,
    prixCalculable: pricing.calculable,
    margeRule: 'Marge commerciale × remise volume',
    alert,
  };
}
