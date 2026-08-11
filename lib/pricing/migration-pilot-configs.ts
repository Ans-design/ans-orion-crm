import { findCatalogueItem } from '@/lib/data/catalogue-meta';
import { getProductConfig } from '@/lib/data/config-types';
import type { ConfigField } from '@/lib/data/config-types/types';

/** Configs représentatives pour comparer legacy vs moteur draft (hors qty seule). */
const PILOT_CONFIG_OVERRIDES: Record<string, Record<string, unknown>> = {
  'pkg-hangtag': {
    format: '50 × 90 mm',
    matiere: 'PCB',
    grammage: '300g',
    face: 'Recto',
    qty: 100,
  },
  'pkg-boite': {
    format: 'Format personnalisé',
    longueur: 200,
    largeur: 150,
    profondeur: 80,
    matiere: 'PCB',
    grammage: '350g',
    face: 'Recto',
    qty: 100,
  },
  'gf-bache': {
    type_bache: 'Bâche PVC standard',
    grammage: '440g',
    laize: '1m60',
    // largeur_m accepté (alias longueur_m) — dimensions client 2 × 1 m
    largeur_m: 2,
    hauteur_m: 1,
    face: 'Recto seul',
    qty: 1,
  },
  'tx-tshirt': {
    technique: 'Sérigraphie',
    matiere: 'Coton',
    coloris: 'Blanc',
    tailles: { M: 10, L: 10 },
    qty: 20,
  },
  'imp-impression': {
    matiere: 'Standard / Offset',
    grammage: '80g',
    type: 'Impression numérique N&B',
    format: 'A4',
    face: 'Recto',
    qty: 100,
  },
  'plv-rollup': {
    format: '85 × 200 cm',
    matiere: 'Bâche',
    face: 'Recto',
    qty: 1,
  },
  'bk-livres': {
    type: 'Booklet',
    format: 'A5 — 148×210 mm',
    pages: 48,
    couleur_int: 'Quadrichromie (couleur)',
    face_interieur: 'Recto-verso',
    matiere_int: 'PCM',
    grammage_int: '80g',
    matiere_couv: 'PCB',
    grammage_couv: '300g',
    reliure: 'Spirale plastique',
    qty: 50,
  },
  'cal-plateau': {
    format: 'A4 — 210×297 mm',
    feuillets: '12',
    matiere: 'PCB',
    grammage: '350g',
    face: 'Recto seul',
    qty: 100,
  },
  'fly-a4': {
    format: 'A4 — 210×297 mm',
    volets: '1 volet (feuille plate)',
    matiere: 'PCB',
    grammage: '300g',
    face: 'Recto-verso',
    qty: 500,
  },
  'fly-std': {
    format: 'A5 — 148×210 mm',
    volets: '1 volet (feuille plate)',
    matiere: 'PCB',
    grammage: '170g',
    face: 'Recto-verso',
    qty: 500,
  },
  'cv-std': {
    format: '85 × 55 mm',
    matiere: 'PCB',
    grammage: '300g',
    face: 'Recto-verso',
    qty: 100,
  },
  'cv-fidelite': {
    format: '85×55 mm',
    matiere: 'PCB',
    grammage: '300g',
    face: 'Recto',
    qty: 500,
  },
  'cv-jeux': {
    type: 'Jeu 52 cartes',
    format: 'Poker — 63×88 mm',
    matiere: 'PCB',
    grammage: '300g',
    face: 'Recto-verso',
    qty: 100,
  },
  'fin-reliure': {
    type: 'Spirale plastique',
    diametre: '10 mm / 3/8"',
    nb_pages: 32,
    face: 'Recto-Verso',
    grammage: '80g',
    qty: 100,
  },
  'evt-photobooth': {
    format: '200×200 cm',
    matiere: 'PVC',
    decoupe: 'Découpe simple',
    // Tarif m² GF typique — requis tant que le moteur event délègue sans profil
    prix_m2: 25_000,
    qty: 1,
  },
};

function firstUsableOption(options: string[] | undefined): string | undefined {
  if (!options?.length) return undefined;
  return options.find((o) => o && !/personnalis|autres?|autre matière/i.test(o)) ?? options[0];
}

function applyOptionsFilterDefaults(
  config: Record<string, unknown>,
  fields: ConfigField[],
): void {
  for (const field of fields) {
    if (config[field.key] != null && config[field.key] !== '') continue;
    const filter = field.optionsFilter;
    if (filter?.field && filter.optionsByValue) {
      const parent = String(config[filter.field] ?? '');
      const opts = filter.optionsByValue[parent] ?? Object.values(filter.optionsByValue)[0];
      const pick = firstUsableOption(opts);
      if (pick) config[field.key] = pick;
      continue;
    }
    if (field.options?.length) {
      const pick = firstUsableOption(field.options);
      // Types finition / chips sans default → premier choix utilisable
      if (pick && (field.required || field.key === 'type' || field.key === 'dim')) {
        config[field.key] = pick;
      }
    }
  }
}

export function resolveMigrationPilotConfig(articleId: string): Record<string, unknown> {
  const override = PILOT_CONFIG_OVERRIDES[articleId];
  if (override) return { ...override };

  const article = findCatalogueItem(articleId);
  const productConfig = getProductConfig(articleId, article?.configType);
  const config: Record<string, unknown> = { qty: productConfig?.qtyDefault ?? 100 };

  if (!productConfig) return config;

  for (const section of productConfig.sections) {
    for (const field of section.fields) {
      if (field.default !== undefined && field.default !== '' && field.default !== null) {
        config[field.key] = field.default;
      }
    }
  }

  // Grammages / options dépendantes (optionsFilter) — souvent sans default statique
  for (const section of productConfig.sections) {
    applyOptionsFilterDefaults(config, section.fields);
  }

  return config;
}
