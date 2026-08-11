/**
 * Impression sans finition — matières & grammages.
 * Source de vérité : PRIX 2026_impression sans finition_ANS ORION.xlsx (feuille « impression sans finition »).
 * PCB, PCM et Glossy restent des entrées distinctes.
 */

export type ImpressionSfMaterial = {
  id: string;
  label: string;
  /** Formats max : A4 = Bristol, Texturé, Toile fin, PVC ≤ A4 ; Glossy interdit > A3 */
  maxFormat?: 'A4' | 'A3';
  noGrammage?: boolean;
};

const G = (items: string[]) => [...items, 'Grammage personnalisé'];

/** Libellés canoniques = Excel Admin (PRIX 2026 ISF). */
export const IMPRESSION_SF_MATERIALS: ImpressionSfMaterial[] = [
  { id: 'standard', label: 'Standard / Offset' },
  { id: 'journal', label: 'Papier journal' },
  { id: 'pcb', label: 'PCB' },
  { id: 'pcm', label: 'PCM' },
  { id: 'glossy', label: 'Glossy', maxFormat: 'A3' },
  { id: 'bristol', label: 'Bristol', maxFormat: 'A4' },
  { id: 'texture', label: 'Texturé', maxFormat: 'A4' },
  { id: 'toile_fin', label: 'Toile fin', maxFormat: 'A4' },
  { id: 'invitation', label: 'Spécial invitation' },
  { id: 'contre_colle', label: 'Papier contre-collé' },
  { id: 'autocollant', label: 'Papier autocollant', noGrammage: true },
  { id: 'collant_glossy', label: 'Papier collant glossy', noGrammage: true },
  { id: 'adestor', label: 'Papier adhestor', noGrammage: true },
  { id: 'satine_mat', label: 'Papier satiné mat' },
  { id: 'mat', label: 'Papier mat' },
  { id: 'pellicule', label: 'Papier pelliculé' },
  { id: 'pvc_transl', label: 'PVC translucide', maxFormat: 'A4', noGrammage: true },
  { id: 'pvc_opaque', label: 'PVC opaque', maxFormat: 'A4', noGrammage: true },
  { id: 'sublimation', label: 'Papier sublimation', noGrammage: true },
  // Opérationnel POS (hors feuille Excel) — ne pas supprimer
  { id: 'autres', label: 'Matière personnalisée' },
];

export const IMPRESSION_SF_MATIERE_LABELS = IMPRESSION_SF_MATERIALS.map((m) => m.label);

/** Alias Excel / legacy → id matière (sans casser paniers / configs existants). */
const MATERIAL_LABEL_ALIASES: Record<string, string> = {
  'standard / offset': 'standard',
  'standard/offset': 'standard',
  offset: 'standard',
  'papier contre-colle': 'contre_colle',
  'papier contre colle': 'contre_colle',
  'autocollant adestor': 'adestor',
  'papier adhestor': 'adestor',
  adhestor: 'adestor',
  adestor: 'adestor',
  // Cartes PVC — le suffixe ' 1 mm' vient du catalogue carte-cover-material-catalog.ts
  'pvc opaque 1 mm': 'pvc_opaque',
  'pvc opaque': 'pvc_opaque',
  'pvc translucide 1 mm': 'pvc_transl',
  'pvc translucide': 'pvc_transl',
  // Pelliculé = PCB + pelliculage inclus (grille dédiée, ≠ PCB nu)
  'papier pellicule mat': 'pellicule',
  'papier pellicule brillant': 'pellicule',
  'papier pellicule': 'pellicule',
  pellicule: 'pellicule',
  // Bristol / Texturé → PCB (même tarification impression)
  bristol: 'pcb',
  'papier texture avec motif': 'texture',
  'papier texture': 'texture',
  texture: 'texture',
  texturé: 'texture',
  // Kraft → grille PCB/PCM selon grammage (support courant couverture)
  kraft: 'pcb',
  // Toile fin → grille dédiée
  'toile fin': 'toile_fin',
  // Invitation
  'invitation luxe': 'invitation',
  'special invitation': 'invitation',
  'spécial invitation': 'invitation',
  // Carton / cover
  'carton rigide': 'contre_colle',
};

/** Grammages par libellé matière — feuille Excel « impression sans finition ». */
export const IMPRESSION_SF_WEIGHTS_BY_MATIERE: Record<string, string[]> = {
  'Standard / Offset': G(['70g', '80g', '90g']),
  'Papier journal': G(['45g', '52g', '55g']),
  PCB: G(['90g', '115g', '130g', '135g', '150g', '170g', '250g', '300g', '350g', '600g', '700g', '900g']),
  PCM: G(['90g', '115g', '130g', '135g', '150g', '170g', '250g', '300g', '350g', '600g', '700g', '900g']),
  Glossy: G(['120g', '160g', '180g', '250g', '300g', '600g', '900g']),
  Bristol: G(['300g', '350g']),
  Texturé: G(['250g']),
  'Toile fin': G(['270g']),
  'Spécial invitation': G(['300g', '325g']),
  'Papier contre-collé': G(['600g', '700g']),
  'Papier autocollant': ['Grammage personnalisé'],
  'Papier collant glossy': ['Grammage personnalisé'],
  'Papier adhestor': ['Grammage personnalisé'],
  'Papier satiné mat': G(['130g', '150g', '170g', '200g', '250g', '300g']),
  'Papier mat': G(['80g', '90g', '115g', '130g', '150g', '170g', '250g', '300g']),
  'Papier pelliculé': G(['320g', '370g']),
  'PVC translucide': ['Grammage personnalisé'],
  'PVC opaque': ['Grammage personnalisé'],
  'Papier sublimation': ['Grammage personnalisé'],
  'Matière personnalisée': ['Grammage personnalisé'],
};

/** SRA3 conservé en alias technique — l’UI POS affiche A3+. */
export const IMPRESSION_SF_FORMAT_SRA3_ALIAS = 'SRA3';

export const IMPRESSION_SF_FORMATS = [
  'A6',
  'A5',
  'B5',
  'DL',
  'B6',
  'A4',
  'A3',
  'A3+',
  'Format personnalisé',
] as const;

function normalizeMaterialLookupKey(label: string): string {
  let s = String(label ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

  if (/^standard\s*\/?\s*offset$/.test(s) || s === 'offset') return 'standard / offset';
  if (/contre\s*-?\s*colle/.test(s)) return 'papier contre-colle';
  if (/autocollant\s+adestor|papier\s+adhestor|\badhestor\b|\badestor\b/.test(s)) {
    return 'papier adhestor';
  }
  return s;
}

export function impressionSfMaterialByLabel(label: string): ImpressionSfMaterial | undefined {
  const raw = String(label ?? '').trim();
  if (!raw) return undefined;
  const direct = IMPRESSION_SF_MATERIALS.find((m) => m.label === raw);
  if (direct) return direct;
  const key = normalizeMaterialLookupKey(raw);
  const aliasId = MATERIAL_LABEL_ALIASES[key];
  if (aliasId) return IMPRESSION_SF_MATERIALS.find((m) => m.id === aliasId);
  return IMPRESSION_SF_MATERIALS.find((m) => normalizeMaterialLookupKey(m.label) === key);
}
