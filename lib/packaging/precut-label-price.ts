/**
 * Moteur Étiquette prédécoupée (pkg-etiquette)
 * Standard 50×50 cm OU personnalisé m² (GF vinyle + découpe Finitions)
 */
import {
  applyMinSurfaceAndPrice,
  getVinylM2Price,
  parseDimPairMm,
  resolveDecoupeVinylM2,
  surfaceM2FromMm,
} from '@/lib/packaging/packaging-soft-shared';

export type PrecutLabelStandard = {
  typeVinyle: string;
  formatStandard: string;
  largeurCm: number;
  hauteurCm: number;
  surfaceM2: number;
  prixStandardHt: number;
};

const DEFAULT_STANDARDS: PrecutLabelStandard[] = [
  {
    typeVinyle: 'Vinyle blanc',
    formatStandard: '50×50 cm',
    largeurCm: 50,
    hauteurCm: 50,
    surfaceM2: 0.25,
    prixStandardHt: 10_000,
  },
  {
    typeVinyle: 'Vinyle transparent',
    formatStandard: '50×50 cm',
    largeurCm: 50,
    hauteurCm: 50,
    surfaceM2: 0.25,
    prixStandardHt: 12_000,
  },
];

let standards = DEFAULT_STANDARDS;

export function setPrecutLabelRuntime(list: PrecutLabelStandard[]) {
  if (list.length) standards = list;
}

export function getPrecutLabelStandards(): PrecutLabelStandard[] {
  return standards;
}

function findStandard(typeVinyle: string): PrecutLabelStandard | null {
  const t = String(typeVinyle ?? '').toLowerCase();
  return (
    standards.find((s) => {
      const sv = s.typeVinyle.toLowerCase();
      if (/transp/.test(t)) return /transp/.test(sv);
      if (/blanc|white/.test(t)) return /blanc|white/.test(sv);
      return sv === t;
    }) ?? null
  );
}

export type PrecutLabelPriceInput = {
  typeVinyle?: string;
  format?: string;
  largeur?: number;
  hauteur?: number;
  unite?: 'mm' | 'cm';
  typeDecoupe?: string;
  qty?: number;
  prixVinylM2?: number;
  prixDecoupeM2?: number;
  prixStandardHt?: number;
};

export type PrecutLabelPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  reason?: string;
  mode: 'standard' | 'custom';
  typeVinyle: string;
  formatLabel: string;
  surfaceM2: number;
  prixVinyl: number;
  prixDecoupe: number;
  prixVinylM2: number;
  prixUnitaire: number;
  qty: number;
  prixTotal: number;
  formula: string;
};

export function calculatePrecutLabelPrice(input: PrecutLabelPriceInput): PrecutLabelPriceResult {
  const qty = Math.max(1, Math.round(Number(input.qty) || 1));
  const typeVinyle = String(input.typeVinyle ?? 'Vinyle blanc').trim();
  const format = String(input.format ?? '50×50 cm').trim();
  const isCustom = /personnalis/i.test(format);

  const empty = (reason: string, partial?: Partial<PrecutLabelPriceResult>): PrecutLabelPriceResult => ({
    calculable: false,
    surDevis: true,
    reason,
    mode: isCustom ? 'custom' : 'standard',
    typeVinyle,
    formatLabel: format,
    surfaceM2: 0,
    prixVinyl: 0,
    prixDecoupe: 0,
    prixVinylM2: 0,
    prixUnitaire: 0,
    qty,
    prixTotal: 0,
    formula: '',
    ...partial,
  });

  if (!isCustom) {
    const std = findStandard(typeVinyle);
    const pu =
      input.prixStandardHt != null && input.prixStandardHt > 0
        ? Math.round(input.prixStandardHt)
        : Math.round(std?.prixStandardHt ?? 0);
    if (!(pu > 0)) return empty('Étiquette standard sans prix Admin');
    return {
      calculable: true,
      surDevis: false,
      mode: 'standard',
      typeVinyle,
      formatLabel: std?.formatStandard ?? '50×50 cm',
      surfaceM2: std?.surfaceM2 ?? 0.25,
      prixVinyl: pu,
      prixDecoupe: 0,
      prixVinylM2: 0,
      prixUnitaire: pu,
      qty,
      prixTotal: pu * qty,
      formula: `standard ${typeVinyle} ${pu} Ar`,
    };
  }

  const unit = input.unite ?? 'cm';
  let w = Number(input.largeur) || 0;
  let h = Number(input.hauteur) || 0;
  if (!(w > 0 && h > 0)) {
    const p = parseDimPairMm(format);
    if (p) {
      // parseDimPair returns mm
      w = unit === 'mm' ? p.w : p.w / 10;
      h = unit === 'mm' ? p.h : p.h / 10;
    }
  }
  if (!(w > 0 && h > 0)) return empty('Format personnalisé sans dimensions');

  const wMm = unit === 'mm' ? w : w * 10;
  const hMm = unit === 'mm' ? h : h * 10;
  const surfaceM2 = surfaceM2FromMm(wMm, hMm);
  const prixVinylM2 = getVinylM2Price(typeVinyle, input.prixVinylM2);
  const vinyl = applyMinSurfaceAndPrice(surfaceM2, prixVinylM2);
  const sansDecoupe = /sans/i.test(String(input.typeDecoupe ?? ''));
  let prixDecoupe = 0;
  if (!sansDecoupe) {
    const dM2 = resolveDecoupeVinylM2(input.prixDecoupeM2);
    prixDecoupe = applyMinSurfaceAndPrice(surfaceM2, dM2).amount;
  }
  const prixUnitaire = vinyl.amount + prixDecoupe;
  return {
    calculable: prixUnitaire > 0,
    surDevis: !(prixUnitaire > 0),
    mode: 'custom',
    typeVinyle,
    formatLabel: `${w}${unit}×${h}${unit}`,
    surfaceM2,
    prixVinyl: vinyl.amount,
    prixDecoupe,
    prixVinylM2,
    prixUnitaire,
    qty,
    prixTotal: prixUnitaire * qty,
    formula: `m² ${surfaceM2.toFixed(4)} × vinyle ${prixVinylM2} + découpe ${prixDecoupe}`,
  };
}

export function calculatePrecutLabelPriceFromConfig(
  config: Record<string, unknown>,
  qtyFallback = 1,
): PrecutLabelPriceResult {
  const qty = Math.max(1, Math.round(Number(config.qty ?? qtyFallback) || qtyFallback));
  const formatRaw = String(config.format ?? '50×50 cm');
  const formatNorm = /^50\s*[×x]\s*50\s*mm$/i.test(formatRaw.trim()) ? '50×50 cm' : formatRaw;
  const isCustom = /personnalis/i.test(formatNorm);
  const L = Number(config.longueur) || 0;
  const l = Number(config.largeur) || 0;

  return calculatePrecutLabelPrice({
    typeVinyle: String(config.type_etiquette ?? config.matiere ?? 'Vinyle blanc'),
    format: formatNorm,
    largeur: isCustom ? L : undefined,
    hauteur: isCustom ? l : undefined,
    unite: 'mm',
    typeDecoupe: String(config.type_decoupe ?? config.decoupe ?? 'Découpe autocollant'),
    qty,
  });
}

export function isPrecutLabelPricingArticle(articleId: string): boolean {
  return articleId === 'pkg-etiquette';
}

export function precutLabelPriceSummaryNote(r: PrecutLabelPriceResult): string {
  if (!r.calculable) return r.reason ? `Étiquette — ${r.reason}` : 'Étiquette — prix en attente';
  if (r.mode === 'standard') return `Standard ${r.formatLabel} · ${r.typeVinyle} · ${r.prixUnitaire} Ar`;
  return `Perso ${r.formatLabel} · ${r.surfaceM2.toFixed(4)} m² · vinyle ${r.prixVinyl} + découpe ${r.prixDecoupe}`;
}
