/**
 * Repères de coûts moyens Madagascar (indicatif marché 2025–2026).
 * Ne remplace PAS les prix Backoffice / grilles PRIX 2026 — colonne d’aide à la décision.
 *
 * Sources croisées : grilles ANS ORION (PRIX 2026), catalogue ANS Design Print
 * (à partir de ~200 Ar CV), pratiques imprimeries Antananarivo (offset/numérique).
 */

export type MadagascarCostBenchmark = {
  /** Clé famille normalisée */
  familyKey: string;
  label: string;
  /** Coût matière / production indicatif unitaire (Ar HT) */
  costMinAr: number;
  costMaxAr: number;
  /** Prix de vente public courant « à partir de » (Ar) */
  saleFromAr: number;
  unit: string;
  note: string;
};

const BENCHMARKS: MadagascarCostBenchmark[] = [
  {
    familyKey: 'carterie',
    label: 'Carterie (CV, cartes)',
    costMinAr: 80,
    costMaxAr: 350,
    saleFromAr: 200,
    unit: 'pièce',
    note: 'PCB/PVC/luxe — coût papier+calage ; vente publique dès ~200 Ar',
  },
  {
    familyKey: 'flyers',
    label: 'Flyers & dépliants',
    costMinAr: 40,
    costMaxAr: 250,
    saleFromAr: 100,
    unit: 'pièce',
    note: 'A6→A3, offset/numérique — coût unitaire dégressif selon tirage',
  },
  {
    familyKey: 'documents',
    label: 'Documents administratifs',
    costMinAr: 50,
    costMaxAr: 400,
    saleFromAr: 150,
    unit: 'pièce',
    note: 'Papier offset / NCR — factures, bons, en-têtes',
  },
  {
    familyKey: 'calendriers',
    label: 'Calendriers & marque-pages',
    costMinAr: 800,
    costMaxAr: 4_500,
    saleFromAr: 2_000,
    unit: 'pièce',
    note: 'Spirale / carton — saisonnalité Q4',
  },
  {
    familyKey: 'goodies',
    label: 'Goodies & objets pub',
    costMinAr: 500,
    costMaxAr: 8_000,
    saleFromAr: 1_500,
    unit: 'pièce',
    note: 'Import + marquage local — marge sur marquage',
  },
  {
    familyKey: 'textile',
    label: 'Textile & marquage',
    costMinAr: 3_000,
    costMaxAr: 25_000,
    saleFromAr: 8_000,
    unit: 'pièce',
    note: 'T-shirt blanc local + sérigraphie/DTF',
  },
  {
    familyKey: 'plv',
    label: 'PLV / grand format',
    costMinAr: 15_000,
    costMaxAr: 180_000,
    saleFromAr: 35_000,
    unit: 'pièce',
    note: 'Roll-up, bâche, kakemono — m² + structure',
  },
  {
    familyKey: 'grand_format',
    label: 'Grand format',
    costMinAr: 8_000,
    costMaxAr: 120_000,
    saleFromAr: 20_000,
    unit: 'm² / pièce',
    note: 'Vinyle, bâche, stickers — coût au m² dominant',
  },
  {
    familyKey: 'packaging',
    label: 'Packaging & boîtes',
    costMinAr: 400,
    costMaxAr: 12_000,
    saleFromAr: 1_200,
    unit: 'pièce',
    note: 'Doypack / gobelets / étuis — vierge + perso',
  },
  {
    familyKey: 'livres',
    label: 'Livres & booklets',
    costMinAr: 2_000,
    costMaxAr: 35_000,
    saleFromAr: 5_000,
    unit: 'exemplaire',
    note: 'Façonnage + papier intérieur — selon pagination',
  },
  {
    familyKey: 'photo',
    label: 'Photo & tirages',
    costMinAr: 200,
    costMaxAr: 8_000,
    saleFromAr: 500,
    unit: 'tirage',
    note: 'Papier photo / album — selon format',
  },
  {
    familyKey: 'evenementiel',
    label: 'Événementiel',
    costMinAr: 1_000,
    costMaxAr: 50_000,
    saleFromAr: 3_000,
    unit: 'pièce',
    note: 'Badges, invitations, signalétique temporaire',
  },
  {
    familyKey: 'finitions',
    label: 'Finitions',
    costMinAr: 50,
    costMaxAr: 5_000,
    saleFromAr: 200,
    unit: 'op. / pièce',
    note: 'Pelliculage, découpe, rainage — coût process',
  },
  {
    familyKey: 'conception',
    label: 'Conception graphique',
    costMinAr: 50_000,
    costMaxAr: 450_000,
    saleFromAr: 80_000,
    unit: 'prestation',
    note: 'Créa locale — flyer ~80–120 kAr, CV design ~50 kAr',
  },
  {
    familyKey: 'bloc_note',
    label: 'Bloc-notes',
    costMinAr: 1_500,
    costMaxAr: 8_000,
    saleFromAr: 3_500,
    unit: 'pièce',
    note: 'Couverture + intérieurs collés/spirale',
  },
];

function normalizeFamily(category: string, name: string): string {
  const hay = `${category} ${name}`.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  if (/carterie|carte.?visite|cv\b|cartes? /.test(hay)) return 'carterie';
  if (/flyer|depliant|dépliant|leaflet/.test(hay)) return 'flyers';
  if (/calendrier|marque.?page/.test(hay)) return 'calendriers';
  if (/goodie|stylo|usb|porte.?cle|mug|badge/.test(hay)) return 'goodies';
  if (/textile|t-?shirt|polo|casquette|broderie|flocage/.test(hay)) return 'textile';
  if (/roll.?up|kakemono|bache|bâche|plv|stand/.test(hay)) return 'plv';
  if (/grand.?format|vinyle|autocollant|sticker/.test(hay)) return 'grand_format';
  if (/doypack|gobelet|packaging|boite|boîte|etui|étui/.test(hay)) return 'packaging';
  if (/livre|booklet|brochure|catalogue|reliure/.test(hay)) return 'livres';
  if (/photo|tirage|album/.test(hay)) return 'photo';
  if (/evenement|événement|invitation|faire.?part/.test(hay)) return 'evenementiel';
  if (/finition|pellicul|decoupe|découpe|rainage|vernis/.test(hay)) return 'finitions';
  if (/conception|graphisme|design|creation|création/.test(hay)) return 'conception';
  if (/bloc.?note|carnet/.test(hay)) return 'bloc_note';
  if (/document|admin|facture|bon.?de|en.?tete|en-tête|ncr/.test(hay)) return 'documents';
  if (/petit.?format|standard/.test(hay)) return 'documents';
  return category.replace(/\s+/g, '_').toLowerCase() || 'autre';
}

export function resolveMadagascarCostBenchmark(
  category: string,
  name: string,
): MadagascarCostBenchmark | null {
  const key = normalizeFamily(category, name);
  return BENCHMARKS.find((b) => b.familyKey === key) ?? null;
}

/** Coût unitaire retenu pour export : prix vierge DB sinon milieu de fourchette marché. */
export function resolveIndicativeUnitCostAr(opts: {
  blankUnitPrice?: number | null;
  category: string;
  name: string;
}): {
  costAr: number | null;
  costMinAr: number | null;
  costMaxAr: number | null;
  source: string;
  note: string;
} {
  const bench = resolveMadagascarCostBenchmark(opts.category, opts.name);
  const blank =
    opts.blankUnitPrice != null && Number(opts.blankUnitPrice) > 0
      ? Math.round(Number(opts.blankUnitPrice))
      : null;

  if (blank != null) {
    return {
      costAr: blank,
      costMinAr: bench?.costMinAr ?? blank,
      costMaxAr: bench?.costMaxAr ?? blank,
      source: 'Prix vierge fiche (Backoffice)',
      note: bench?.note ?? 'Coût issu du prix article vierge enregistré',
    };
  }

  if (!bench) {
    return {
      costAr: null,
      costMinAr: null,
      costMaxAr: null,
      source: '',
      note: 'Pas de repère coût — renseigner le prix vierge en Backoffice',
    };
  }

  const mid = Math.round((bench.costMinAr + bench.costMaxAr) / 2);
  return {
    costAr: mid,
    costMinAr: bench.costMinAr,
    costMaxAr: bench.costMaxAr,
    source: 'Repère marché MG 2025–2026 (indicatif)',
    note: bench.note,
  };
}

export function listMadagascarCostBenchmarks(): MadagascarCostBenchmark[] {
  return [...BENCHMARKS];
}
