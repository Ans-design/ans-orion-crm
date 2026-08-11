/**
 * Cœur tarif publications : pages/feuilles, ISF intérieur,
 * couverture = nombre_couverture × PU (sans R/V), reliure ×1.
 * Admin = source des paramètres ; ISF / Finitions / Stock = sources de prix.
 */

import { computeImpressionSfPrice } from '@/lib/pricing/impression-sf-pricing';
import { isRectoVerso } from '@/lib/pricing/config-normalize';
import { evaluateBindingFromConfig } from '@/lib/print/binding-rules';
import { FINITION_BASE_PRICES } from '@/lib/finition/finition-price-catalog';
import { getPublicationRuntimeParams } from '@/lib/pricing/publication-pricing-rules';
import { isLivresMixteCouleurInt } from '@/lib/pos/livres-binding-policy';
import { lookupCatalogue2026MaterialTariff } from '@/lib/backoffice/catalogue-2026-material-lookup';

export type PublicationPriceBreakdown = {
  calculable: boolean;
  surDevis: boolean;
  missingField?: string;
  /** true si PU impression vient du fallback Admin (ISF manquant) */
  usedFallbackPrint?: boolean;
  pages: number;
  feuillesPhysiques: number;
  faceMode: 'recto' | 'recto_verso';
  prixInterieur: number;
  prixInterieurDetail?: { pagesNoir: number; pagesQuadri: number; puNoir: number; puQuadri: number };
  /** Nombre de feuilles couverture facturées (1, 2, 4…) */
  nombreCouverture: number;
  prixCouverture: number;
  prixCouvertureDetail?: Array<{ label: string; amount: number }>;
  prixReliure: number;
  reliureLabel?: string;
  prixFinitions: number;
  finitionsDetail?: Array<{ label: string; amount: number }>;
  prixUnitaireAvantRemise: number;
  qty: number;
  sousTotal: number;
  remiseRate: number;
  remiseAmount: number;
  totalHT: number;
  prixUnitaire: number;
  formula: string;
};

/** Nombre de feuilles couverture — défaut 1, jamais dérivé du R/V. */
export function resolveNombreCouverture(config: Record<string, unknown>): number {
  const raw = Number(
    config.nombre_couverture ?? config.pages_couverture ?? config.nb_couverture ?? 0,
  );
  if (Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  return 1;
}

/** Supplément couverture rigide — uniquement carton/900g explicites (pas PVC ni « Invitation luxe »). */
function isRigidCoverSupplement(
  typeCouv: string,
  matiereCouv: string,
  grammageCouv: string,
): boolean {
  const type = typeCouv.toLowerCase();
  const mat = matiereCouv.toLowerCase();
  const gram = grammageCouv.toLowerCase();
  // PVC a son propre tarif ISF (ex. translucide 4500) — ne jamais empiler le supplément
  if (/\bpvc\b/.test(mat) || /\bpvc\b/.test(type)) return false;
  if (/couverture\s*rigide|carton\s*rigide/.test(type)) return true;
  if (/carton\s*rigide/.test(mat)) return true;
  // 900g / cover luxe : le tarif pcb900 couvre déjà le premium → pas de double comptage
  if (/\b900\s*g\b|\b900g\b/.test(gram) || /cover\s*luxe|900/.test(mat)) return false;
  if (/\b750\s*g\b|\b750g\b/.test(gram) && /couverture|rigide/.test(type)) return true;
  return false;
}

/** PAGE = face ; FEUILLE = support physique. */
export function physicalSheetsFromPages(pages: number, faceRaw: unknown): number {
  const pagesN = Math.max(0, Math.floor(Number(pages) || 0));
  if (pagesN <= 0) return 0;
  if (isRectoVerso(faceRaw)) return Math.ceil(pagesN / 2);
  return pagesN;
}

export function isSaddleStitchPagesCompatible(pages: number): boolean {
  return pages > 0 && pages % 4 === 0;
}

function parsePages(config: Record<string, unknown>): number {
  const keys = ['pages', 'nombre_pages', 'nb_pages', 'page_count'];
  for (const k of keys) {
    const raw = config[k];
    if (raw === '' || raw == null) continue;
    if (typeof raw === 'number' && raw > 0) return Math.floor(raw);
    const m = String(raw).match(/(\d+)/);
    if (m) return Math.max(1, parseInt(m[1]!, 10));
  }
  // Bloc-note : nombre_feuilles = feuilles physiques → pages selon face
  const feuilles = config.nombre_feuilles ?? config.feuillets;
  if (feuilles != null && String(feuilles).trim() !== '') {
    let n: number | null = null;
    if (/autres|personnalis/i.test(String(feuilles))) {
      const c = Number(config.nombre_feuilles_custom ?? config.feuillets_custom);
      n = Number.isFinite(c) && c > 0 ? Math.floor(c) : null;
    } else {
      const m = String(feuilles).match(/(\d+)/);
      n = m ? parseInt(m[1]!, 10) : null;
    }
    if (n != null && n > 0) {
      // Si on a déjà face R/V, feuillets = feuilles → pages = feuilles×2 en R/V pour affichage prix par face
      // Pour bloc-note tarif: on facture par feuille physique en mode feuillets
      return n;
    }
  }
  return 0;
}

function formatToIsfLabel(formatRaw: string): string {
  const s = String(formatRaw ?? '').trim();
  if (!s) return 'A4 — 210×297 mm';
  if (/A4/i.test(s) && !/—/.test(s)) return 'A4 — 210×297 mm';
  if (/A5/i.test(s) && !/—/.test(s)) return 'A5 — 148×210 mm';
  if (/A6/i.test(s) && !/—/.test(s)) return 'A6 — 105×148 mm';
  if (/B5/i.test(s) && !/—/.test(s)) return 'B5 — 176×250 mm';
  if (/DL/i.test(s) && !/—/.test(s)) return 'DL — 100×210 mm';
  return s;
}

function impressionTypeFromCouleur(couleur: string): string {
  const c = couleur.toLowerCase();
  if (c.includes('noir') || c.includes('n&b') || c.includes('n et b')) return 'N&B';
  if (c.includes('gris')) return 'Niveaux de gris';
  return 'Quadri';
}

/** Prix ISF unitaire d’une face (recto) pour format/matière/grammage/couleur. */
export function resolveIsfPageUnitPrice(input: {
  format: string;
  matiere: string;
  grammage: string;
  couleur: string;
  qty: number;
  override?: number | null;
}): { prix: number; formula?: string; ok: boolean } {
  if (input.override != null && input.override > 0) {
    return { prix: Math.round(input.override), formula: `override:${input.override}`, ok: true };
  }
  const type = impressionTypeFromCouleur(input.couleur);
  const isf = computeImpressionSfPrice(
    {
      format: formatToIsfLabel(input.format),
      matiere: input.matiere,
      grammage: input.grammage,
      face: 'Recto',
      type,
    },
    Math.max(1, input.qty),
  );
  if (isf.calculable && !isf.surDevis && isf.prixUnitaire > 0) {
    return { prix: isf.prixUnitaire, formula: isf.formula, ok: true };
  }

  // Repli Catalogue 2026 Matières (Admin / Excel audit) — même SoT que Matières backoffice
  const label = `${input.matiere} ${input.grammage}`.trim();
  const cat =
    lookupCatalogue2026MaterialTariff({ label, name: label })
    ?? lookupCatalogue2026MaterialTariff({ name: `${input.matiere} ${input.grammage}` })
    ?? lookupCatalogue2026MaterialTariff({ name: input.matiere });
  if (cat?.printPrice != null && cat.printPrice > 0) {
    return {
      prix: Math.round(cat.printPrice),
      formula: `catalogue2026:${cat.excelRowId ?? label}`,
      ok: true,
    };
  }

  return { prix: 0, formula: isf.formula, ok: false };
}

function optionOn(raw: unknown): boolean {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || /^(sans|non|no|0|false|off|aucun)/i.test(s)) return false;
  return /oui|yes|mat|brillant|avec|soft|1|true/i.test(s) || (s.length > 2 && !/bord\s*carr/.test(s));
}

export type ComputePublicationInput = {
  config: Record<string, unknown>;
  qty?: number;
  /** Mode feuillets : pages = feuilles (bloc-note / calendrier) */
  countAsPhysicalSheets?: boolean;
  /** Overrides tests / Admin */
  overrides?: {
    puNoir?: number;
    puQuadri?: number;
    couvertureBase?: number;
    pelliculageCouv?: number;
    reliure?: number;
  };
};

/**
 * Formule :
 * intérieur (ISF × pages) + couverture + reliure(×1) + finitions − remise
 */
export function computePublicationPrice(input: ComputePublicationInput): PublicationPriceBreakdown {
  const config = input.config;
  const params = getPublicationRuntimeParams();
  const qty = Math.max(1, Math.floor(Number(input.qty ?? config.qty ?? config.quantite) || 1));

  const format = String(config.format ?? '').trim();
  if (!format || /personnalis|autres/i.test(format)) {
    return emptyPub(qty, /personnalis|autres/i.test(format), true, 'format');
  }

  let pages = parsePages(config);
  if (pages <= 0) {
    return emptyPub(qty, false, true, 'pages');
  }

  const faceRaw =
    config.face_interieur ?? config.face_int ?? config.face ?? config.print_mode ?? 'Recto';
  const faceMode: 'recto' | 'recto_verso' = isRectoVerso(faceRaw) ? 'recto_verso' : 'recto';

  // Bloc-note / calendrier : nombre_feuilles = feuilles physiques
  let feuillesPhysiques: number;
  if (input.countAsPhysicalSheets) {
    feuillesPhysiques = pages;
    // Pour facturation par face : R/V → 2 faces / feuille
    pages = faceMode === 'recto_verso' ? feuillesPhysiques * 2 : feuillesPhysiques;
  } else {
    feuillesPhysiques = physicalSheetsFromPages(pages, faceRaw);
  }

  const matiereInt = String(
    config.matiere_int ?? config.famille_papier ?? config.matiere_interieur ?? config.matiere ?? '',
  ).trim();
  const grammageInt = String(
    config.grammage_int ?? config.grammage_interieur ?? config.grammage ?? '',
  ).trim();
  const couleurInt = String(
    config.couleur_int ?? config.couleur_impression ?? config.couleur ?? 'Noir',
  ).trim();

  if (!matiereInt) return emptyPub(qty, false, true, 'matiere_interieur', { pages, feuillesPhysiques, faceMode });
  if (!grammageInt || /personnalis/i.test(grammageInt)) {
    return emptyPub(qty, /personnalis/i.test(grammageInt), true, 'grammage_interieur', {
      pages,
      feuillesPhysiques,
      faceMode,
    });
  }

  // Split mixte N&B / quadri — UNIQUEMENT si couleur_int = Mixte.
  // POS seed toujours pages_noir / pages_quadri ('' ou 0) via buildEmptyPosConfig :
  // ne JAMAIS déduire le mixte de la seule présence de ces clés (sinon intérieur = 0 Ar).
  let pagesNoir = 0;
  let pagesQuadri = 0;
  const mixte = isLivresMixteCouleurInt(config) || /mixte/i.test(couleurInt);
  if (mixte) {
    pagesNoir = Math.max(0, Math.floor(Number(config.pages_noir) || 0));
    pagesQuadri = Math.max(0, Math.floor(Number(config.pages_quadri) || 0));
    if (pagesNoir + pagesQuadri <= 0) {
      return emptyPub(qty, false, true, 'pages_mixte', { pages, feuillesPhysiques, faceMode });
    }
    if (pagesNoir + pagesQuadri !== pages) {
      pages = pagesNoir + pagesQuadri;
    }
  } else if (/noir|n&b/i.test(couleurInt)) {
    pagesNoir = pages;
  } else {
    pagesQuadri = pages;
  }

  const isfQty = Math.max(1, qty * feuillesPhysiques);

  const noirRes = pagesNoir > 0
    ? resolveIsfPageUnitPrice({
        format,
        matiere: matiereInt,
        grammage: grammageInt,
        couleur: 'Noir',
        qty: isfQty,
        override: input.overrides?.puNoir ?? null,
      })
    : { prix: 0, ok: true as boolean };
  const quadriRes = pagesQuadri > 0
    ? resolveIsfPageUnitPrice({
        format,
        matiere: matiereInt,
        grammage: grammageInt,
        couleur: 'Quadri',
        qty: isfQty,
        override: input.overrides?.puQuadri ?? null,
      })
    : { prix: 0, ok: true as boolean };

  // Fallback Admin si ISF KO — uniquement si autorisé (sinon prix en attente)
  let usedFallbackPrint = false;
  let puNoir = 0;
  let puQuadri = 0;
  if (pagesNoir > 0) {
    if (noirRes.ok && noirRes.prix > 0) {
      puNoir = noirRes.prix;
    } else if (params.allowFallbackPrint && (input.overrides?.puNoir ?? params.fallbackPuNoirA4) > 0) {
      puNoir = input.overrides?.puNoir ?? params.fallbackPuNoirA4;
      usedFallbackPrint = true;
    }
  }
  if (pagesQuadri > 0) {
    if (quadriRes.ok && quadriRes.prix > 0) {
      puQuadri = quadriRes.prix;
    } else if (params.allowFallbackPrint && (input.overrides?.puQuadri ?? params.fallbackPuQuadriA4) > 0) {
      puQuadri = input.overrides?.puQuadri ?? params.fallbackPuQuadriA4;
      usedFallbackPrint = true;
    }
  }
  // Overrides tests explicites
  if (input.overrides?.puNoir != null && input.overrides.puNoir > 0 && pagesNoir > 0) {
    puNoir = input.overrides.puNoir;
  }
  if (input.overrides?.puQuadri != null && input.overrides.puQuadri > 0 && pagesQuadri > 0) {
    puQuadri = input.overrides.puQuadri;
  }

  if ((pagesNoir > 0 && puNoir <= 0) || (pagesQuadri > 0 && puQuadri <= 0)) {
    return emptyPub(qty, true, true, 'impression_interieur', { pages, feuillesPhysiques, faceMode });
  }

  const prixInterieur = Math.round(pagesNoir * puNoir + pagesQuadri * puQuadri);

  // Couverture
  const coverParts: Array<{ label: string; amount: number }> = [];
  const typeCouv = String(
    config.type_couverture ?? config.type_support_couverture ?? config.matiere_couv ?? '',
  ).trim();
  const matiereCouv = String(
    config.matiere_couv ?? config.matiere_couverture ?? typeCouv ?? '',
  ).trim();
  const grammageCouv = String(config.grammage_couv ?? config.grammage_couverture ?? '').trim();
  const hasCover =
    (Boolean(matiereCouv || typeCouv) && !/sans/i.test(typeCouv))
    || (input.overrides?.couvertureBase != null && input.overrides.couvertureBase > 0);

  let prixCouverture = 0;
  const nombreCouverture = hasCover ? resolveNombreCouverture(config) : 0;
  if (hasCover) {
    const baseOverride = input.overrides?.couvertureBase;
    if (baseOverride != null && baseOverride > 0) {
      coverParts.push({ label: 'Couverture base', amount: baseOverride });
    } else {
      // Couverture = nombre de feuilles × PU recto matière (pas de tarif R/V).
      const g = grammageCouv || params.defaultCoverGrammage;
      const m = matiereCouv || 'PCB';
      const couleurCouv = String(
        config.couleur_couv ?? config.couleur_couverture ?? 'Quadri',
      ).trim() || 'Quadri';
      if (m && !/personnalis/i.test(m)) {
        const gramLabel = g.includes('g') || g.includes('G') ? g : `${g}`;
        const matLabel = m.replace(/300g simple|750g luxe/i, 'PCB');
        const isfCouvPage = resolveIsfPageUnitPrice({
          format,
          matiere: matLabel,
          grammage: gramLabel,
          couleur: couleurCouv,
          qty: Math.max(1, qty * nombreCouverture),
        });
        if (isfCouvPage.ok && isfCouvPage.prix > 0) {
          const amount = Math.round(nombreCouverture * isfCouvPage.prix);
          coverParts.push({
            label: `Impression couverture (${nombreCouverture}×)`,
            amount,
          });
        } else {
          const fb = params.fallbackCoverPrintAr;
          if (fb > 0) {
            coverParts.push({
              label: `Impression couverture Admin (${nombreCouverture}×)`,
              amount: Math.round(nombreCouverture * fb),
            });
          }
        }
      }
      // Supplément couverture rigide (carton) — jamais PVC (tarif ISF dédié)
      if (
        isRigidCoverSupplement(typeCouv, matiereCouv, grammageCouv)
        && params.coverRigidSupplementAr > 0
      ) {
        coverParts.push({
          label: `Supplément couverture rigide (${nombreCouverture}×)`,
          amount: Math.round(nombreCouverture * params.coverRigidSupplementAr),
        });
      }
    }

    // Pelliculage optionnel — sauté si la matière est déjà « pelliculé » (prix inclus)
    const pell = config.finition_pelliculage ?? config.pelliculage_couv ?? config.pelliculage;
    const matiereAlreadyPellicule = /pellicul/i.test(matiereCouv);
    if (
      !matiereAlreadyPellicule
      && (optionOn(pell) || /mat|brillant|soft/i.test(String(pell ?? '')))
    ) {
      const pellUnit =
        input.overrides?.pelliculageCouv
        ?? params.pelliculageCouvertureA4
        ?? FINITION_BASE_PRICES.pelliculageA4Recto;
      coverParts.push({
        label: `Pelliculage couverture (${nombreCouverture}×)`,
        amount: Math.round(nombreCouverture * pellUnit),
      });
    }

    prixCouverture = coverParts.reduce((s, p) => s + p.amount, 0);
  }

  // Reliure — une fois / exemplaire
  let prixReliure = input.overrides?.reliure ?? 0;
  let reliureLabel: string | undefined;
  if (input.overrides?.reliure == null) {
    const binding = evaluateBindingFromConfig({
      ...config,
      pages,
      face: faceRaw,
      nombre_feuilles: feuillesPhysiques,
    });
    const relLabel = String(config.type_reliure ?? config.reliure ?? '');
    if (binding) {
      if (!binding.compatible || !binding.valid) {
        // Bloc collé n'est pas toujours dans le moteur spirale/DCC
        if (/bloc\s*coll/i.test(relLabel) && params.blocColleAr > 0) {
          prixReliure = params.blocColleAr;
          reliureLabel = 'Bloc collé';
        } else {
          return emptyPub(qty, true, true, 'reliure', {
            pages,
            feuillesPhysiques,
            faceMode,
            prixInterieur,
            prixCouverture,
          });
        }
      } else {
        prixReliure = binding.priceAr ?? 0;
        reliureLabel = binding.referenceLabel ?? binding.bindingType;
        if (prixReliure <= 0 && /bloc\s*coll/i.test(relLabel) && params.blocColleAr > 0) {
          prixReliure = params.blocColleAr;
          reliureLabel = 'Bloc collé';
        }
      }
    } else if (/bloc\s*coll/i.test(relLabel) && params.blocColleAr > 0) {
      prixReliure = params.blocColleAr;
      reliureLabel = 'Bloc collé';
    }
  } else {
    reliureLabel = 'override';
  }

  // Finitions exemplaire (hors couverture déjà comptée)
  const finitionsDetail: Array<{ label: string; amount: number }> = [];
  if (optionOn(config.coins) || /arrondi/i.test(String(config.coins ?? ''))) {
    finitionsDetail.push({
      label: 'Coins arrondis',
      amount: params.coinsParExemplaire || FINITION_BASE_PRICES.coinsArrondisPerSheet,
    });
  }
  const prixFinitions = finitionsDetail.reduce((s, f) => s + f.amount, 0);

  const prixUnitaireAvantRemise =
    prixInterieur + prixCouverture + prixReliure + prixFinitions;
  const sousTotal = prixUnitaireAvantRemise * qty;
  const remiseRate = params.utilisePalier ? publicationVolumeRemiseRate(qty) : 0;
  const remiseAmount = Math.round(sousTotal * remiseRate);
  const totalHT = sousTotal - remiseAmount;
  const prixUnitaire = qty > 0 ? Math.round(totalHT / qty) : prixUnitaireAvantRemise;

  return {
    calculable: prixUnitaireAvantRemise > 0,
    surDevis: false,
    usedFallbackPrint,
    pages,
    feuillesPhysiques,
    faceMode,
    prixInterieur,
    prixInterieurDetail: { pagesNoir, pagesQuadri, puNoir, puQuadri },
    nombreCouverture,
    prixCouverture,
    prixCouvertureDetail: coverParts,
    prixReliure,
    reliureLabel,
    prixFinitions,
    finitionsDetail,
    prixUnitaireAvantRemise,
    qty,
    sousTotal,
    remiseRate,
    remiseAmount,
    totalHT,
    prixUnitaire,
    formula: `pub:int=${prixInterieur}+couv=${prixCouverture}+rel=${prixReliure}+fin=${prixFinitions}${usedFallbackPrint ? '|fallback' : ''}`,
  };
}

export function publicationVolumeRemiseRate(qty: number): number {
  const params = getPublicationRuntimeParams();
  if (!params.utilisePalier) return 0;
  // Source unique = paliers ISF Admin (DiscountTier), pas une grille parallèle
  try {
    const { impressionSfVolumeRemiseRate } = require('@/lib/pricing/impression-sf-pricing') as {
      impressionSfVolumeRemiseRate: (q: number) => number;
    };
    return impressionSfVolumeRemiseRate(qty);
  } catch {
    for (const t of params.volumeTiers) {
      if (qty >= t.minQty) return t.rate;
    }
    return 0;
  }
}

function emptyPub(
  qty: number,
  surDevis: boolean,
  incomplete: boolean,
  missingField?: string,
  partial?: Partial<PublicationPriceBreakdown>,
): PublicationPriceBreakdown {
  return {
    calculable: false,
    surDevis,
    missingField: incomplete ? missingField : undefined,
    pages: 0,
    feuillesPhysiques: 0,
    faceMode: 'recto',
    prixInterieur: 0,
    nombreCouverture: 0,
    prixCouverture: 0,
    prixReliure: 0,
    prixFinitions: 0,
    prixUnitaireAvantRemise: 0,
    qty,
    sousTotal: 0,
    remiseRate: 0,
    remiseAmount: 0,
    totalHT: 0,
    prixUnitaire: 0,
    formula: incomplete ? `missing:${missingField}` : 'sur_devis',
    ...partial,
  };
}

export function publicationPriceSummaryNote(b: PublicationPriceBreakdown): string {
  if (!b.calculable) {
    if (b.missingField === 'reliure') {
      return 'Prix en attente — reliure incompatible / référence absente';
    }
    if (b.missingField === 'impression_interieur') {
      return 'Prix en attente — tarif Impression sans finition manquant (matière/grammage/format)';
    }
    if (b.missingField) return `Prix en attente — champ manquant : ${b.missingField}`;
    return 'Prix en attente';
  }
  return [
    `Intérieur : ${b.prixInterieur.toLocaleString('fr-FR')} Ar (${b.pages} p. / ${b.feuillesPhysiques} f.)`,
    `Couverture : ${b.prixCouverture.toLocaleString('fr-FR')} Ar${b.nombreCouverture > 0 ? ` (${b.nombreCouverture}×)` : ''}`,
    `Reliure : ${b.prixReliure.toLocaleString('fr-FR')} Ar${b.reliureLabel ? ` (${b.reliureLabel})` : ''}`,
    b.prixFinitions > 0 ? `Finitions : ${b.prixFinitions.toLocaleString('fr-FR')} Ar` : null,
    b.usedFallbackPrint ? '⚠ Fallback Admin (ISF incomplet)' : null,
  ]
    .filter(Boolean)
    .join(' · ');
}
