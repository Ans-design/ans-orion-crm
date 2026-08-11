export type VariablePriceImpactKind = 'pricing' | 'descriptive';

export type VariablePriceImpactRuleMatch = {
  articleIds?: string[];
  articleIdPrefixes?: string[];
  categories?: string[];
  configTypes?: string[];
  articleNameIncludes?: string[];
};

export type VariablePriceImpactRule = {
  id: string;
  kind: VariablePriceImpactKind;
  fieldKeys: string[];
  reason: string;
  match?: VariablePriceImpactRuleMatch;
};

export const LEGACY_PERFORATION_FIELDS = ['nb_perforations'] as const;

export const VARIABLE_PRICE_IMPACT_RULES: VariablePriceImpactRule[] = [
  {
    id: 'global-descriptive-text',
    kind: 'descriptive',
    fieldKeys: ['remarques', 'note', 'notes', 'details', 'detail', 'precisions'],
    reason: 'Champ libre descriptif',
  },
  {
    id: 'impression-sf-type',
    kind: 'pricing',
    fieldKeys: ['type'],
    reason: 'Impression SF : type de support tarifaire',
    match: { articleIds: ['imp-sf'], configTypes: ['impression_sf'] },
  },
  {
    id: 'global-orientation',
    kind: 'descriptive',
    fieldKeys: ['orientation'],
    reason: 'Orientation affichée mais non tarifaire',
  },
  {
    id: 'global-aspect-support',
    kind: 'descriptive',
    fieldKeys: ['aspect', 'aspect_oeillets', 'couleur_support', 'couleur_dos'],
    reason: 'Variable descriptive support / finition',
  },
  {
    id: 'packaging-doypack-descriptive',
    kind: 'descriptive',
    fieldKeys: ['matiere', 'couleur_doypack'],
    reason: 'Doypack : matière et couleur restent visibles sans modifier le prix',
    match: { articleIds: ['pkg-doypack'] },
  },
  {
    id: 'bloc-note-produit',
    kind: 'descriptive',
    fieldKeys: ['produit'],
    reason: 'Bloc-note / agenda : produit descriptif',
    match: { articleIdPrefixes: ['bn-'] },
  },
  {
    id: 'livres-type',
    kind: 'descriptive',
    fieldKeys: ['type'],
    reason: 'Livres / publications : type descriptif',
    match: { articleIds: ['bk-livres'], categories: ['livres'] },
  },
  {
    id: 'plv-chevalet-type',
    kind: 'descriptive',
    fieldKeys: ['type'],
    reason: 'Chevalet PLV : type visible sans impact prix',
    match: { articleIdPrefixes: ['plv-chevalet'] },
  },
  {
    id: 'plv-oriflamme-type',
    kind: 'descriptive',
    fieldKeys: ['type'],
    reason: 'Oriflamme : type de voile non tarifaire',
    match: { articleIds: ['plv-oriflamme'] },
  },
  {
    id: 'goodies-color',
    kind: 'descriptive',
    fieldKeys: ['couleur'],
    reason: 'Règle absolue goodies : la couleur n’impacte jamais le prix',
    match: { categories: ['goodies'] },
  },
  {
    id: 'goodies-assiette-type',
    kind: 'descriptive',
    fieldKeys: ['type'],
    reason: 'Assiette : type descriptif',
    match: { articleNameIncludes: ['Assiette'] },
  },
  {
    id: 'photo-cadre',
    kind: 'descriptive',
    fieldKeys: ['type', 'couleur'],
    reason: 'Cadre photo : finition descriptive',
    match: { articleIds: ['ph-cadre'], articleNameIncludes: ['Cadre photo'] },
  },
  {
    id: 'event-bracelet-type',
    kind: 'descriptive',
    fieldKeys: ['type'],
    reason: 'Bracelet événementiel : type descriptif',
    match: { articleIds: ['evt-bracelet'], articleNameIncludes: ['Bracelet'] },
  },
  {
    id: 'document-facturier-type',
    kind: 'descriptive',
    fieldKeys: ['type', 'couleurs_souches', 'reliure', 'perforation'],
    reason: 'Facturier / autocopiant : type et couleurs souches descriptifs ; façonnage forcé dans le moteur',
    match: { articleIds: ['doc-facturier', 'doc-carnet', 'doc-recu'], categories: ['document'] },
  },
  {
    id: 'fin-pelliculage',
    kind: 'descriptive',
    fieldKeys: ['type', 'sous_type'],
    reason: 'Pelliculage : rendu affiché sans impact sur le tarif',
    match: { articleIds: ['fin-pelliculage'] },
  },
  {
    id: 'fin-vernis',
    kind: 'descriptive',
    fieldKeys: ['type'],
    reason: 'Vernis : type descriptif',
    match: { articleIds: ['fin-vernis'] },
  },
  {
    id: 'fin-dorure',
    kind: 'descriptive',
    fieldKeys: ['type', 'procede'],
    reason: 'Dorure : teinte et procédé descriptifs',
    match: { articleIds: ['fin-dorure'] },
  },
  {
    id: 'fin-coins-selection',
    kind: 'descriptive',
    fieldKeys: ['cornerRounding'],
    reason: 'Coins arrondis : sélection de coins descriptive',
    match: { articleIds: ['fin-coins'] },
  },
  {
    id: 'grand-format-acrylic-type',
    kind: 'descriptive',
    fieldKeys: ['type'],
    reason: 'Acrylique : type descriptif',
    match: { articleIds: ['gf-acrylic'], articleNameIncludes: ['Acrylic'] },
  },
];
