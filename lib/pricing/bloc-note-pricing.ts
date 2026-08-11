/**
 * Prix Bloc-notes & Agendas = ISF intérieur + couverture + reliure/collage − remise.
 */

import {
  computePublicationPrice,
  publicationPriceSummaryNote,
  type PublicationPriceBreakdown,
} from '@/lib/pricing/publication-core';
import { publicationVolumeRemiseRate } from '@/lib/pricing/publication-core';
import { getPublicationRuntimeParams } from '@/lib/pricing/publication-pricing-rules';

export type BlocNotePriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  formula?: string;
  matchedKey?: string;
  publication?: PublicationPriceBreakdown;
  missingField?: string;
};

/** Nombre de feuilles physiques depuis la config POS bloc-note. */
export function parseBlocNoteSheetCount(config: Record<string, unknown>): number | null {
  const label = String(config.nombre_feuilles ?? '');
  if (/autres/i.test(label)) {
    const custom = Number(config.nombre_feuilles_custom);
    return Number.isFinite(custom) && custom > 0 ? Math.floor(custom) : null;
  }
  const m = label.match(/(\d+)/);
  return m ? Math.max(1, parseInt(m[1], 10)) : null;
}

export function isBlocNoteArticleId(articleId: string): boolean {
  return articleId.startsWith('bn-') || articleId === 'bloc-note';
}

export function blocNoteVolumeRemiseRate(qty: number): number {
  if (!getPublicationRuntimeParams().utilisePalier) return 0;
  return publicationVolumeRemiseRate(qty);
}

export function computeBlocNotePrice(
  config: Record<string, unknown>,
  qtyOverride?: number,
): BlocNotePriceResult {
  const format = String(config.format ?? '').trim();
  if (!format || format === 'Autres') {
    return { calculable: false, surDevis: true, prixUnitaire: 0, formula: 'format_autres', missingField: 'format' };
  }

  const feuillets = parseBlocNoteSheetCount(config);
  if (feuillets == null) {
    return {
      calculable: false,
      surDevis: true,
      prixUnitaire: 0,
      formula: 'incomplete',
      missingField: 'pages',
    };
  }

  const typeSupport = String(config.type_support_couverture ?? '');
  const matiereCouv =
    /750g|luxe/i.test(typeSupport)
      ? 'PCB'
      : /300g/i.test(typeSupport)
        ? 'PCB'
        : String(config.matiere_couverture ?? 'PCB');
  const grammageCouv =
    /750g/i.test(typeSupport)
      ? '700g'
      : /300g/i.test(typeSupport)
        ? '300g'
        : String(config.grammage_couverture ?? '300g');

  const qty = qtyOverride ?? Number(config.qty ?? config.quantite ?? 1);
  const pub = computePublicationPrice({
    config: {
      ...config,
      format,
      nombre_feuilles: feuillets,
      matiere_int: config.famille_papier ?? config.matiere_interieur ?? 'Offset',
      grammage_int: config.grammage_interieur ?? '80g',
      couleur_int: config.couleur_impression ?? 'Noir',
      face_interieur: config.face_interieur ?? config.face ?? 'Recto',
      type_couverture: typeSupport || '300g simple',
      matiere_couv: matiereCouv,
      grammage_couv: grammageCouv,
      finition_pelliculage: config.finition_pelliculage,
      type_reliure: config.type_reliure ?? config.reliure ?? 'Bloc collé',
      reliure: config.type_reliure ?? config.reliure ?? 'Bloc collé',
    },
    qty: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
    countAsPhysicalSheets: true,
  });

  if (!pub.calculable) {
    return {
      calculable: false,
      surDevis: pub.surDevis,
      prixUnitaire: 0,
      publication: pub,
      missingField: pub.missingField,
      formula: pub.formula,
    };
  }

  return {
    calculable: true,
    surDevis: false,
    prixUnitaire: pub.prixUnitaireAvantRemise,
    publication: pub,
    formula: pub.formula,
    matchedKey: `pub|${format}|${feuillets}f`,
  };
}

export function blocNotePriceSummaryNote(r: BlocNotePriceResult): string {
  if (r.publication) return publicationPriceSummaryNote(r.publication);
  if (r.missingField) return `Prix en attente — ${r.missingField}`;
  return 'Prix en attente';
}
