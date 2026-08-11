/**
 * Prix Livres / Booklets / Magazines / Menus livret.
 * = ISF × pages + couverture + reliure (1×) + finitions − remise.
 */

import { isLivresArticleId } from '@/lib/pos/livres-binding-policy';
import {
  computePublicationPrice,
  publicationPriceSummaryNote,
  physicalSheetsFromPages,
  isSaddleStitchPagesCompatible,
  type PublicationPriceBreakdown,
} from '@/lib/pricing/publication-core';
import { publicationVolumeRemiseRate } from '@/lib/pricing/publication-core';
import { getPublicationRuntimeParams } from '@/lib/pricing/publication-pricing-rules';

export type LivresPriceBreakdown = {
  prixMatiereInterieure: number;
  prixImpressionNoir: number;
  prixImpressionQuadri: number;
  prixCouverture: number;
  prixFinition: number;
  prixReliure: number;
  pages?: number;
  feuillesPhysiques?: number;
};

export type LivresPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  breakdown?: LivresPriceBreakdown;
  publication?: PublicationPriceBreakdown;
  formula?: string;
  missingField?: string;
};

export function isLivresPricingArticle(articleId: string): boolean {
  return isLivresArticleId(articleId);
}

export function computeLivresPrice(
  articleId: string,
  config: Record<string, unknown>,
  qtyOverride?: number,
): LivresPriceResult {
  if (!isLivresPricingArticle(articleId)) {
    return { calculable: false, surDevis: false, prixUnitaire: 0 };
  }

  const qty = qtyOverride ?? Number(config.qty ?? config.quantite ?? 1);
  const pub = computePublicationPrice({
    config: {
      ...config,
      matiere_int: config.matiere_int ?? config.matiere,
      grammage_int: config.grammage_int ?? config.grammage,
      couleur_int: config.couleur_int ?? config.couleur ?? 'Noir',
      // Chip POS = face_interieur — ne pas l’écraser avec face_int / face
      face_interieur:
        config.face_interieur ?? config.face_int ?? config.face ?? 'Recto',
      matiere_couv: config.matiere_couv ?? config.matiere_couverture,
      grammage_couv: config.grammage_couv ?? config.grammage_couverture,
      reliure: config.reliure ?? config.type_reliure,
      type_reliure: config.type_reliure ?? config.reliure,
    },
    qty: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
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

  const d = pub.prixInterieurDetail;
  return {
    calculable: true,
    surDevis: false,
    prixUnitaire: pub.prixUnitaireAvantRemise,
    publication: pub,
    breakdown: {
      prixMatiereInterieure: 0,
      prixImpressionNoir: d ? Math.round(d.pagesNoir * d.puNoir) : pub.prixInterieur,
      prixImpressionQuadri: d ? Math.round(d.pagesQuadri * d.puQuadri) : 0,
      prixCouverture: pub.prixCouverture,
      prixFinition: pub.prixFinitions,
      prixReliure: pub.prixReliure,
      pages: pub.pages,
      feuillesPhysiques: pub.feuillesPhysiques,
    },
    formula: pub.formula,
  };
}

export function livresPriceSummaryNote(r: LivresPriceResult): string {
  if (r.publication) return publicationPriceSummaryNote(r.publication);
  if (r.missingField) return `Prix en attente — ${r.missingField}`;
  return 'Prix en attente';
}

export function livresVolumeRemiseRate(qty: number): number {
  if (!getPublicationRuntimeParams().utilisePalier) return 0;
  return publicationVolumeRemiseRate(qty);
}

export { physicalSheetsFromPages, isSaddleStitchPagesCompatible };
