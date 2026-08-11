/**
 * Prix Calendriers — chevalet / mural via ISF feuillets + support + reliure ;
 * plateau / autres : surface legacy si pas de feuillets.
 */

import { getProductConfig } from '@/lib/data/config-types';
import type { ProductConfig } from '@/lib/data/config-types';
import { resolveCalendarMaterialRecap } from '@/lib/calendar/material-recap';
import { isCalendarArticleId } from '@/lib/calendar/calendar-material-policy';
import type { CalendarMaterialRecap } from '@/lib/calendar/calendar-calculation';
import {
  computePublicationPrice,
  publicationPriceSummaryNote,
  type PublicationPriceBreakdown,
} from '@/lib/pricing/publication-core';
import { getPublicationRuntimeParams } from '@/lib/pricing/publication-pricing-rules';

export type CalendarPriceResult = {
  calculable: boolean;
  surDevis: boolean;
  prixUnitaire: number;
  grossSurfaceM2?: number;
  recap?: CalendarMaterialRecap;
  formula?: string;
  publication?: PublicationPriceBreakdown;
  missingField?: string;
};

export function isCalendarPricingArticle(articleId: string): boolean {
  return isCalendarArticleId(articleId);
}

function isChevaletOrMural(articleId: string): boolean {
  return (
    articleId === 'cal-chevalet'
    || articleId === 'cal-chevalet-table'
    || articleId === 'cal-mural'
  );
}

function parseFeuillets(config: Record<string, unknown>): number | null {
  for (const k of ['feuillets', 'nombre_feuillets', 'pages', 'nombre_pages', 'nombre_feuilles']) {
    const raw = config[k];
    if (raw == null || raw === '') continue;
    if (typeof raw === 'number' && raw > 0) return Math.floor(raw);
    const m = String(raw).match(/(\d+)/);
    if (m) return Math.max(1, parseInt(m[1]!, 10));
  }
  return null;
}

export function computeCalendarPrice(
  articleId: string,
  config: Record<string, unknown>,
  productConfig?: ProductConfig | null,
  qtyOverride?: number,
): CalendarPriceResult {
  if (!isCalendarPricingArticle(articleId)) {
    return { calculable: false, surDevis: false, prixUnitaire: 0 };
  }

  // Chevalet / mural : moteur publication (ISF × feuillets + support + spirale)
  if (isChevaletOrMural(articleId)) {
    const feuillets = parseFeuillets(config) ?? 13;
    const qty = qtyOverride ?? Number(config.qty ?? config.quantite ?? 1);
    const params = getPublicationRuntimeParams();

    const pub = computePublicationPrice({
      config: {
        ...config,
        format: config.format ?? 'A5 — 148×210 mm',
        nombre_feuilles: feuillets,
        matiere_int: config.matiere ?? config.matiere_feuillets ?? 'PCM',
        grammage_int: config.grammage ?? config.grammage_feuillets ?? '300g',
        couleur_int: config.couleur ?? config.couleur_impression ?? 'Quadri',
        face_interieur: config.face_interieur ?? config.face_int ?? config.face ?? 'Recto',
        type_couverture: config.support_chevalet ?? config.support ?? 'Support chevalet',
        matiere_couv: config.matiere_support ?? 'PCB',
        grammage_couv: config.grammage_support ?? '600g',
        type_reliure: config.reliure ?? config.type_reliure ?? 'Spirale plastique',
        reliure: config.reliure ?? config.type_reliure ?? 'Spirale plastique',
      },
      qty: Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1,
      countAsPhysicalSheets: true,
      overrides: {
        // Support chevalet : supplément Admin si pas d’ISF couverture
        couvertureBase:
          Number(config.prix_support_chevalet) > 0
            ? Number(config.prix_support_chevalet)
            : params.coverRigidSupplementAr > 0
              ? Math.round(params.coverRigidSupplementAr * 0.4)
              : undefined,
      },
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
    };
  }

  // Legacy surface (plateau hors event, marque-page, sous-main…)
  const recap = resolveCalendarMaterialRecap(articleId, config);
  if (!recap) {
    return { calculable: false, surDevis: false, prixUnitaire: 0 };
  }

  if (recap.alert) {
    return { calculable: false, surDevis: true, prixUnitaire: 0, recap };
  }

  const cfg = productConfig ?? getProductConfig(articleId);
  const prixM2 = cfg?.prixM2;
  if (!prixM2 || prixM2 <= 0) {
    return { calculable: false, surDevis: false, prixUnitaire: 0, recap, missingField: 'prix_m2' };
  }

  const prixUnitaire = Math.round(prixM2 * recap.grossSurfaceM2);
  return {
    calculable: prixUnitaire > 0,
    surDevis: false,
    prixUnitaire,
    grossSurfaceM2: recap.grossSurfaceM2,
    recap,
    formula: `prixM2 (${prixM2}) × surface_brute (${recap.grossSurfaceM2} m²)`,
  };
}

export function calendarPriceSummaryNote(r: CalendarPriceResult): string {
  if (r.publication) return publicationPriceSummaryNote(r.publication);
  if (r.formula) return r.formula;
  if (r.missingField) return `Prix en attente — ${r.missingField}`;
  return 'Prix en attente';
}
