/**
 * Catalogue Formules & moteurs — seed maquette ANS (refonte UI).
 * Source métier: ANS_Formules_Moteurs_Refonte.html
 * Persistance overrides: localStorage ans-formules-moteurs-v3
 */

export const FORMULES_MOTEURS_STORAGE_KEY = 'ans-formules-moteurs-v3' as const;

export const FORMULE_FINALE_HT =
  'ARRONDI↑ [ MAXIMUM ( Minimum ; ((Prix source + Suppléments) × Quantité) × (1 − Remise) × (1 + Majoration) ) ]' as const;

export type FmEngineProfile = 'universal' | 'pos' | 'specific';
export type FmParamStatus = 'ok' | 'warn' | 'block' | 'info' | 'violet';
export type FmRuleSeverity = 'info' | 'warn' | 'block';

export type FmEngine = {
  id: string;
  name: string;
  unit: string;
  base: string;
  construction: string;
  margin: number;
  minimum: number;
  round: number;
  profile: FmEngineProfile;
  profileLabel: string;
  active: boolean;
  color: string;
  items: string[];
  /** Alias familles ArticlePricingProfile — sync couverture DB. */
  familyAliases?: string[];
};

/** Mapping moteurs maquette ↔ familles / moteurs réels Orion. */
export const FM_ENGINE_FAMILY_ALIASES: Record<string, string[]> = {
  publications: [
    'publication',
    'brochure',
    'livre',
    'carnet',
    'calendrier',
    'bloc',
    'magazine',
    'booklet',
    'livret',
    'mémoire',
    'memoire',
    'thèse',
    'these',
  ],
  papiers: [
    'flyer',
    'carterie',
    'carte',
    'isf',
    'petit format',
    'impression',
    'papeterie',
    'invitation',
    'certificat',
    'étiquette',
    'etiquette',
    'affiche',
  ],
  'grand-format': [
    'grand format',
    'grand-format',
    'bâche',
    'bache',
    'vinyle',
    'roll',
    'mesh',
    'drapeau',
    'frosted',
    'one-way',
  ],
  plaques: [
    'plaque',
    'pvc',
    'plexi',
    'acrylic',
    'panneau',
    'rigide',
    'support rigide',
  ],
  textiles: [
    'textile',
    't-shirt',
    'tshirt',
    'polo',
    'sweat',
    'casquette',
    'bob',
    'maillot',
    'totebag',
    'marquage',
  ],
  goodies: [
    'goodies',
    'mug',
    'stylo',
    'objet',
    'gadget',
    'badge',
    'briquet',
    'parapluie',
  ],
  packaging: [
    'packaging',
    'boite',
    'boîte',
    'plv',
    'event',
    'événement',
    'evenement',
    'roll-up',
    'oriflamme',
    'hangtag',
    'doypack',
  ],
  services: [
    'photo',
    'service',
    'pose',
    'conception',
    'livraison',
    'document',
    'autocopiant',
    'photobook',
  ],
};

export type FmParameter = {
  group: string;
  section: string;
  ref: string;
  name: string;
  value: string;
  rule: string;
  condition: string;
  scope: string;
  status: FmParamStatus;
  key?: string;
};

export type FmRule = {
  code: string;
  family: string;
  rule: string;
  action: string;
  severity: FmRuleSeverity;
};

export type FmFlowStep = {
  code: string;
  label: string;
  hint: string;
};

export const FM_FLOW_STEPS: FmFlowStep[] = [
  {
    code: '10',
    label: 'Prix source',
    hint: 'Charger le prix imprimé de référence.',
  },
  {
    code: '20',
    label: 'Support',
    hint: 'Inclure la matière une seule fois.',
  },
  {
    code: '30',
    label: 'Impression',
    hint: 'Appliquer la face et la technologie.',
  },
  {
    code: '40',
    label: 'Fabrication',
    hint: 'Ajouter la production spécifique.',
  },
  {
    code: '50',
    label: 'Finitions',
    hint: 'Ajouter uniquement les choix actifs.',
  },
  {
    code: '60',
    label: 'Services',
    hint: 'Ajouter les prestations facultatives.',
  },
  {
    code: '70',
    label: 'Quantité',
    hint: 'Valider le dernier champ du parcours.',
  },
  {
    code: '80',
    label: 'Palier',
    hint: 'Appliquer la tranche correspondante.',
  },
  {
    code: '90',
    label: 'Majoration',
    hint: 'Appliquer la marge commerciale.',
  },
  {
    code: '100',
    label: 'Minimum',
    hint: 'Protéger le seuil facturable.',
  },
  {
    code: '110',
    label: 'Arrondi',
    hint: 'Finaliser le prix de vente.',
  },
];

export const FM_DEFAULT_ENGINES: FmEngine[] = [
  {
    "id": "publications",
    "name": "Publications & livres",
    "unit": "Pièce",
    "base": "Prix imprimé A4 recto",
    "construction": "Impression × pages × format + reliure + finition",
    "margin": 25,
    "minimum": 1000,
    "round": 50,
    "profile": "universal",
    "active": true,
    "color": "#245fc9",
    "items": [
      "Booklet",
      "Magazine",
      "Livret",
      "Mémoire",
      "Thèse",
      "Catalogue"
    ],
    "profileLabel": "Universel"
  },
  {
    "id": "papiers",
    "name": "Impressions papier & carterie",
    "unit": "Pièce",
    "base": "Prix imprimé A4 recto",
    "construction": "Impression formatée + façonnage + finition",
    "margin": 25,
    "minimum": 500,
    "round": 50,
    "profile": "universal",
    "active": true,
    "color": "#d51f36",
    "items": [
      "Flyer",
      "Carte de visite",
      "Invitation",
      "Certificat",
      "Affiche petit format",
      "Étiquette"
    ],
    "profileLabel": "Universel"
  },
  {
    "id": "grand-format",
    "name": "Grand format souple",
    "unit": "m²",
    "base": "Prix imprimé A0 ≈ 1 m²",
    "construction": "Support imprimé × surface + découpe + œillets + pose",
    "margin": 30,
    "minimum": 5000,
    "round": 100,
    "profile": "pos",
    "active": true,
    "color": "#bf6a08",
    "items": [
      "Bâche",
      "Mesh",
      "Dos bleu",
      "One-Way Vision",
      "Frosted",
      "Vinyle",
      "Tissu drapeau"
    ],
    "profileLabel": "POS actif"
  },
  {
    "id": "plaques",
    "name": "Plaques & supports rigides",
    "unit": "m²",
    "base": "Prix imprimé par m²",
    "construction": "Plaque imprimée ou plaque + vinyle + découpe + pose",
    "margin": 30,
    "minimum": 5000,
    "round": 100,
    "profile": "pos",
    "active": true,
    "color": "#087f5b",
    "items": [
      "PVC 3/5/6 mm",
      "Plexiglas 3/5 mm",
      "Acrylic 1/3/5 mm",
      "Panneau rigide"
    ],
    "profileLabel": "POS actif"
  },
  {
    "id": "textiles",
    "name": "Textiles",
    "unit": "Pièce",
    "base": "Produit vierge par taille",
    "construction": "Textile + marquage + emplacement + finition",
    "margin": 25,
    "minimum": 1000,
    "round": 100,
    "profile": "pos",
    "active": true,
    "color": "#6941c6",
    "items": [
      "T-shirt",
      "Polo",
      "Sweat",
      "Gilet",
      "Casquette",
      "Bob",
      "Maillot",
      "Totebag",
      "Trousse"
    ],
    "profileLabel": "POS actif"
  },
  {
    "id": "goodies",
    "name": "Goodies & objets",
    "unit": "Pièce / lot",
    "base": "Article vierge",
    "construction": "Objet + personnalisation + emballage",
    "margin": 25,
    "minimum": 1000,
    "round": 100,
    "profile": "pos",
    "active": true,
    "color": "#a85e08",
    "items": [
      "Mug",
      "Gourde",
      "Stylo",
      "Porte-clé",
      "Pin’s",
      "Badge",
      "Briquet",
      "USB",
      "Parapluie",
      "Tapis souris"
    ],
    "profileLabel": "POS actif"
  },
  {
    "id": "packaging",
    "name": "Packaging, PLV & événementiel",
    "unit": "Pièce",
    "base": "Matière ou structure",
    "construction": "Matière + impression + façonnage + assemblage",
    "margin": 30,
    "minimum": 2000,
    "round": 100,
    "profile": "specific",
    "active": true,
    "color": "#b5479f",
    "items": [
      "Hangtag",
      "Boîte",
      "Doypack",
      "Sac papier",
      "Roll-up",
      "X-Banner",
      "Oriflamme",
      "Bracelet",
      "Billet"
    ],
    "profileLabel": "Spécifique"
  },
  {
    "id": "services",
    "name": "Photo, documents & services",
    "unit": "Pièce / forfait",
    "base": "Tarif du service",
    "construction": "Service + consommables + finition + déplacement",
    "margin": 25,
    "minimum": 1000,
    "round": 100,
    "profile": "specific",
    "active": true,
    "color": "#475467",
    "items": [
      "Tirage photo",
      "Cadre photo",
      "Photobook",
      "Carnet autocopiant",
      "Pose",
      "Conception",
      "Livraison"
    ],
    "profileLabel": "Spécifique"
  }
];

export const FM_PARAMETERS: FmParameter[] = [
  {
    "group": "source",
    "section": "A. PRIORITÉ DES SOURCES DE PRIX",
    "ref": "01",
    "name": "Prix manuel « Autres »",
    "value": "Valeur saisie",
    "rule": "Écrase tout calcul automatique du module.",
    "condition": "Si « Autres » est actif",
    "scope": "Tous sauf Face",
    "status": "block"
  },
  {
    "group": "source",
    "section": "A. PRIORITÉ DES SOURCES DE PRIX",
    "ref": "02",
    "name": "Grille ou formule dynamique",
    "value": "Tarif calculé",
    "rule": "Utilise format, face, quantité, matière et règles métier.",
    "condition": "Si grille applicable",
    "scope": "Selon moteur",
    "status": "info"
  },
  {
    "group": "source",
    "section": "A. PRIORITÉ DES SOURCES DE PRIX",
    "ref": "03",
    "name": "Prix de base",
    "value": "Tarif de repli",
    "rule": "Utilisé seulement si aucune formule dynamique ne s’applique.",
    "condition": "Dernier recours",
    "scope": "Selon article",
    "status": "ok"
  },
  {
    "group": "sequence",
    "section": "B. VALIDATION AVANT CALCUL",
    "ref": "P-01",
    "name": "Parcours technique complet",
    "value": "Type → format → matière → face → options → quantité",
    "rule": "Bloquer le calcul tant que les champs obligatoires ne sont pas validés.",
    "condition": "Quantité toujours en dernier",
    "scope": "Tous les moteurs",
    "status": "block"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "10",
    "name": "Prix source",
    "value": "Manuel > dynamique > base",
    "rule": "Charger une seule valeur de référence selon la priorité.",
    "condition": "Toujours",
    "scope": "Tous",
    "status": "ok"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "20",
    "name": "Support / matière",
    "value": "Inclus ou ajouté une seule fois",
    "rule": "Ne pas refacturer le support s’il est déjà compris dans le prix imprimé.",
    "condition": "Selon base du moteur",
    "scope": "Papier, bâche, plaque, textile, objet",
    "status": "warn"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "30",
    "name": "Impression / personnalisation",
    "value": "Recto ou formule RV",
    "rule": "Appliquer la face, les couleurs, la technologie et l’emplacement.",
    "condition": "Si imprimé ou marqué",
    "scope": "Produits imprimés",
    "status": "ok"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "40",
    "name": "Fabrication",
    "value": "Pages + découpe + assemblage",
    "rule": "Ajouter uniquement les opérations nécessaires à la production.",
    "condition": "Selon article",
    "scope": "Publications, packaging, PLV",
    "status": "ok"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "50",
    "name": "Finitions",
    "value": "Reliure + pelliculage + œillets + couture",
    "rule": "Additionner les finitions sélectionnées.",
    "condition": "Si sélectionnées",
    "scope": "Selon compatibilité",
    "status": "ok"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "60",
    "name": "Services",
    "value": "Pose + conception + livraison",
    "rule": "Ajouter les services et déplacements facturables.",
    "condition": "Facultatif",
    "scope": "Selon article",
    "status": "info"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "70",
    "name": "Quantité",
    "value": "Dernier champ du parcours",
    "rule": "Multiplier le prix technique unitaire avant la remise.",
    "condition": "Toujours ≥ 1",
    "scope": "Tous",
    "status": "block"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "80",
    "name": "Palier quantité",
    "value": "Profil universel, POS ou spécifique",
    "rule": "Appliquer la remise correspondant à la quantité.",
    "condition": "Après multiplication",
    "scope": "Selon moteur",
    "status": "violet"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "90",
    "name": "Majoration commerciale",
    "value": "Total remisé × (1 + taux)",
    "rule": "Appliquer un taux de majoration, distinct d’un taux de marque.",
    "condition": "Toujours",
    "scope": "Taux du moteur",
    "status": "warn"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "100",
    "name": "Minimum facturable",
    "value": "MAX (minimum ; total)",
    "rule": "Remplacer le total s’il est inférieur au seuil.",
    "condition": "Si minimum > 0",
    "scope": "Seuil du moteur",
    "status": "block"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "110",
    "name": "Arrondi commercial",
    "value": "Multiple supérieur",
    "rule": "Arrondir vers le haut au pas configuré.",
    "condition": "Dernière opération HT",
    "scope": "Pas du moteur",
    "status": "ok"
  },
  {
    "group": "sequence",
    "section": "C. CONSTRUCTION UNIQUE DU PRIX",
    "ref": "120",
    "name": "TVA / taxe documentaire",
    "value": "20 %",
    "rule": "Calculer le TTC séparément sans modifier la base HT du moteur.",
    "condition": "Si applicable au document",
    "scope": "Devis / facture",
    "status": "info",
    "key": "tax"
  },
  {
    "group": "rectoverso",
    "section": "D. FORMULE RECTO-VERSO",
    "ref": "RV-01",
    "name": "Coût support",
    "value": "Prix achat × (1 + déchet)",
    "rule": "Le coût support contient uniquement la matière physique.",
    "condition": "Depuis le stock",
    "scope": "Support imprimé",
    "status": "info"
  },
  {
    "group": "rectoverso",
    "section": "D. FORMULE RECTO-VERSO",
    "ref": "RV-02",
    "name": "Marge de déchet",
    "value": "5 %",
    "rule": "Utiliser la valeur du stock ; 5 % seulement en valeur de repli.",
    "condition": "Si stock non configuré",
    "scope": "Support physique",
    "status": "warn",
    "key": "waste"
  },
  {
    "group": "rectoverso",
    "section": "D. FORMULE RECTO-VERSO",
    "ref": "RV-03",
    "name": "Prix recto-verso",
    "value": "Recto + MAX(0 ; Recto − support)",
    "rule": "Déduire la matière déjà comprise au recto ; ne jamais appliquer ×2 par défaut.",
    "condition": "Si face = RV",
    "scope": "Supports compatibles",
    "status": "block"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-A6",
    "name": "A6 / 10×15",
    "value": "0.25",
    "rule": "Prix A4 ÷ 4.",
    "condition": "Petit format",
    "scope": "Papier",
    "status": "info",
    "key": "format-a6"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-DL",
    "name": "DL",
    "value": "0.333",
    "rule": "Prix A4 ÷ 3.",
    "condition": "Petit format",
    "scope": "Papier",
    "status": "info",
    "key": "format-dl"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-A5",
    "name": "A5",
    "value": "0.50",
    "rule": "Prix A4 ÷ 2.",
    "condition": "Petit format",
    "scope": "Papier",
    "status": "info",
    "key": "format-a5"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-B5",
    "name": "B5",
    "value": "1.00",
    "rule": "Équivalence commerciale A4 configurée dans la base.",
    "condition": "Règle ANS",
    "scope": "Papier",
    "status": "warn",
    "key": "format-b5"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-A4",
    "name": "A4",
    "value": "1.00",
    "rule": "Format de référence du petit format.",
    "condition": "Base",
    "scope": "Papier",
    "status": "ok",
    "key": "format-a4"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-A3",
    "name": "A3",
    "value": "2.00",
    "rule": "Prix A4 × 2.",
    "condition": "Si matière compatible",
    "scope": "Papier",
    "status": "info",
    "key": "format-a3"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-A2",
    "name": "A2",
    "value": "4.00",
    "rule": "Prix A4 × 4.",
    "condition": "Grand format",
    "scope": "Papier / support",
    "status": "info",
    "key": "format-a2"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-A1",
    "name": "A1",
    "value": "8.00",
    "rule": "Prix A4 × 8.",
    "condition": "Grand format",
    "scope": "Papier / support",
    "status": "info",
    "key": "format-a1"
  },
  {
    "group": "format",
    "section": "E. FACTEURS DE FORMAT — BASE A4",
    "ref": "F-A0",
    "name": "A0 / 1 m²",
    "value": "16.00",
    "rule": "Prix A4 × 16 ; A0 est la référence 1 m².",
    "condition": "Grand format / plaques",
    "scope": "Support au m²",
    "status": "ok",
    "key": "format-a0"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-01",
    "name": "Type de produit",
    "value": "Famille / sous-catégorie",
    "rule": "Sélectionne le moteur et les règles compatibles.",
    "condition": "Premier choix",
    "scope": "Tous",
    "status": "info"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-02",
    "name": "Format / dimensions",
    "value": "Standard ou sur mesure",
    "rule": "Appliquer un facteur ou calculer longueur × largeur.",
    "condition": "Selon produit",
    "scope": "Tous",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-03",
    "name": "Papier / support",
    "value": "Matière sélectionnée",
    "rule": "Charger le tarif imprimé ou le coût support.",
    "condition": "Selon disponibilité",
    "scope": "Imprimés",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-04",
    "name": "Grammage / épaisseur",
    "value": "g/m² ou mm",
    "rule": "Filtrer les compatibilités et choisir le tarif correspondant.",
    "condition": "Selon matière",
    "scope": "Papier / plaques",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-05",
    "name": "Face",
    "value": "Recto / recto-verso",
    "rule": "Déclencher la formule RV sans doubler la matière.",
    "condition": "Si compatible",
    "scope": "Imprimés",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-06",
    "name": "Couleur",
    "value": "CMJN / noir / niveau",
    "rule": "Appliquer la grille d’impression correspondante.",
    "condition": "Selon technologie",
    "scope": "Impression",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-07",
    "name": "Technologie",
    "value": "Laser, jet, offset, sublimation…",
    "rule": "Limiter les matières et tarifs compatibles.",
    "condition": "Selon production",
    "scope": "Impression / marquage",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-08",
    "name": "Pages",
    "value": "Nombre et imposition",
    "rule": "Calculer feuilles, cahiers et contraintes de reliure.",
    "condition": "Publications",
    "scope": "Livres / carnets",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-09",
    "name": "Taille / capacité",
    "value": "Taille textile ou volume",
    "rule": "Choisir le prix vierge de la variante.",
    "condition": "Selon article",
    "scope": "Textile / goodies",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-10",
    "name": "Emplacement / zone",
    "value": "Avant, dos, manche, surface",
    "rule": "Multiplier les marquages réellement demandés.",
    "condition": "Selon personnalisation",
    "scope": "Textile / objets",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-11",
    "name": "Fabrication",
    "value": "Découpe, pliage, assemblage",
    "rule": "Ajouter les opérations sélectionnées.",
    "condition": "Selon produit",
    "scope": "Packaging / PLV",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-12",
    "name": "Finition",
    "value": "Reliure, pelliculage, œillets…",
    "rule": "Ajouter la grille ou le prix unitaire.",
    "condition": "Si sélectionnée",
    "scope": "Tous compatibles",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-13",
    "name": "Service",
    "value": "Pose, conception, livraison",
    "rule": "Ajouter le forfait ou le prix unitaire.",
    "condition": "Facultatif",
    "scope": "Tous",
    "status": "warn"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-14",
    "name": "Quantité",
    "value": "Entier ≥ 1",
    "rule": "Détermine multiplication, minimum et palier.",
    "condition": "Dernier champ",
    "scope": "Tous",
    "status": "block"
  },
  {
    "group": "variable",
    "section": "F. VARIABLES QUI INFLUENCENT LE PRIX",
    "ref": "V-15",
    "name": "Prix manuel",
    "value": "Montant « Autres »",
    "rule": "Prend la priorité et exige une valeur positive.",
    "condition": "Si « Autres » actif",
    "scope": "Tous sauf Face",
    "status": "block"
  },
  {
    "group": "tier",
    "section": "G. PALIERS — PROFIL UNIVERSEL",
    "ref": "U-00",
    "name": "Prix plein",
    "value": "1–49 / 0 %",
    "rule": "Conserver le tarif plein.",
    "condition": "Quantité 1 à 49",
    "scope": "Profil universel",
    "status": "ok",
    "key": "tier-u0"
  },
  {
    "group": "tier",
    "section": "G. PALIERS — PROFIL UNIVERSEL",
    "ref": "U-01",
    "name": "Palier 1",
    "value": "50–99 / −10 %",
    "rule": "Réduire le sous-total de 10 %.",
    "condition": "Quantité 50 à 99",
    "scope": "Profil universel",
    "status": "violet",
    "key": "tier-u1"
  },
  {
    "group": "tier",
    "section": "G. PALIERS — PROFIL UNIVERSEL",
    "ref": "U-02",
    "name": "Palier 2",
    "value": "100–499 / −18 %",
    "rule": "Réduire le sous-total de 18 %.",
    "condition": "Quantité 100 à 499",
    "scope": "Profil universel",
    "status": "violet",
    "key": "tier-u2"
  },
  {
    "group": "tier",
    "section": "G. PALIERS — PROFIL UNIVERSEL",
    "ref": "U-03",
    "name": "Palier 3",
    "value": "500–999 / −25 %",
    "rule": "Réduire le sous-total de 25 %.",
    "condition": "Quantité 500 à 999",
    "scope": "Profil universel",
    "status": "violet",
    "key": "tier-u3"
  },
  {
    "group": "tier",
    "section": "G. PALIERS — PROFIL UNIVERSEL",
    "ref": "U-04",
    "name": "Palier 4",
    "value": "1 000+ / −33 %",
    "rule": "Réduire le sous-total de 33 %.",
    "condition": "Quantité ≥ 1 000",
    "scope": "Profil universel",
    "status": "violet",
    "key": "tier-u4"
  },
  {
    "group": "tier",
    "section": "H. PALIERS — PROFIL POS ACTIF",
    "ref": "POS-00",
    "name": "Prix plein",
    "value": "1–9 / 0 %",
    "rule": "Conserver le tarif plein.",
    "condition": "Quantité 1 à 9",
    "scope": "POS actif",
    "status": "ok",
    "key": "tier-p0"
  },
  {
    "group": "tier",
    "section": "H. PALIERS — PROFIL POS ACTIF",
    "ref": "POS-01",
    "name": "Palier 1",
    "value": "10–39 / −10 %",
    "rule": "Réduire le sous-total de 10 %.",
    "condition": "Quantité 10 à 39",
    "scope": "POS actif",
    "status": "violet",
    "key": "tier-p1"
  },
  {
    "group": "tier",
    "section": "H. PALIERS — PROFIL POS ACTIF",
    "ref": "POS-02",
    "name": "Palier 2",
    "value": "40–79 / −18 %",
    "rule": "Réduire le sous-total de 18 %.",
    "condition": "Quantité 40 à 79",
    "scope": "POS actif",
    "status": "violet",
    "key": "tier-p2"
  },
  {
    "group": "tier",
    "section": "H. PALIERS — PROFIL POS ACTIF",
    "ref": "POS-03",
    "name": "Palier 3",
    "value": "80–129 / −25 %",
    "rule": "Réduire le sous-total de 25 %.",
    "condition": "Quantité 80 à 129",
    "scope": "POS actif",
    "status": "violet",
    "key": "tier-p3"
  },
  {
    "group": "tier",
    "section": "H. PALIERS — PROFIL POS ACTIF",
    "ref": "POS-04",
    "name": "Palier 4",
    "value": "130–200 / −33 %",
    "rule": "Réduire le sous-total de 33 %.",
    "condition": "Quantité 130 à 200",
    "scope": "POS actif",
    "status": "violet",
    "key": "tier-p4"
  },
  {
    "group": "control",
    "section": "I. CONTRÔLES & PERSISTANCE",
    "ref": "C-01",
    "name": "Valeur « Autres » nulle",
    "value": "Blocage devis / panier",
    "rule": "Interdire la validation si un module manuel actif vaut 0.",
    "condition": "Contrôle bloquant",
    "scope": "Tous sauf Face",
    "status": "block"
  },
  {
    "group": "control",
    "section": "I. CONTRÔLES & PERSISTANCE",
    "ref": "C-02",
    "name": "Changement de face",
    "value": "Recalcul immédiat",
    "rule": "Recalculer dès le passage Recto ↔ RV.",
    "condition": "Événement interface",
    "scope": "Supports imprimés",
    "status": "ok"
  },
  {
    "group": "control",
    "section": "I. CONTRÔLES & PERSISTANCE",
    "ref": "C-03",
    "name": "Changement de catégorie",
    "value": "Réinitialisation contextuelle",
    "rule": "Effacer les états « Autres » pour éviter les données d’une autre famille.",
    "condition": "Nouvelle famille",
    "scope": "Point de vente",
    "status": "warn"
  },
  {
    "group": "control",
    "section": "I. CONTRÔLES & PERSISTANCE",
    "ref": "C-04",
    "name": "Remarques & détails",
    "value": "0 Ar",
    "rule": "Conserver un champ libre non tarifaire.",
    "condition": "Avant quantité",
    "scope": "Tous",
    "status": "info"
  },
  {
    "group": "control",
    "section": "I. CONTRÔLES & PERSISTANCE",
    "ref": "C-05",
    "name": "Sortie commerciale",
    "value": "HT puis TTC séparé",
    "rule": "Afficher le détail technique en interne et seulement le prix commercial au client.",
    "condition": "Après calcul",
    "scope": "Devis / facture",
    "status": "ok"
  }
];

export const FM_RULES: FmRule[] = [
  {
    "code": "CFG-01",
    "family": "Général",
    "rule": "Parcours standard ; quantité toujours en dernier",
    "action": "Bloquer le calcul avant validation complète",
    "severity": "info"
  },
  {
    "code": "CFG-02",
    "family": "Général",
    "rule": "Remarques = champ libre, non tarifaire, avant quantité",
    "action": "Ne jamais renommer un bloc métier",
    "severity": "info"
  },
  {
    "code": "CFG-03",
    "family": "Général",
    "rule": "Admin Prix = source ; POS = configuration + aperçu",
    "action": "Séparer maintenance et vente",
    "severity": "info"
  },
  {
    "code": "CFG-04",
    "family": "Général",
    "rule": "Aperçu synchronisé avec les caractéristiques visibles",
    "action": "Éviter lignes fantômes / données manquantes",
    "severity": "info"
  },
  {
    "code": "LIV-01",
    "family": "Livres",
    "rule": "Piqûre à cheval : pages multiples de 4",
    "action": "Bloquer les autres nombres de pages",
    "severity": "block"
  },
  {
    "code": "LIV-02",
    "family": "Livres",
    "rule": "Dos carré collé : minimum 20 pages",
    "action": "Bloquer sous 20 pages",
    "severity": "block"
  },
  {
    "code": "LIV-03",
    "family": "Livres",
    "rule": "Dos carré collé : maximum 160 pages",
    "action": "Orienter vers spirale au-delà",
    "severity": "block"
  },
  {
    "code": "LIV-04",
    "family": "Livres",
    "rule": "Spirale métallique : maximum 16 mm",
    "action": "Choisir plastique au-delà",
    "severity": "block"
  },
  {
    "code": "PAP-01",
    "family": "Papiers",
    "rule": "PVC translucide : A4 recto uniquement",
    "action": "Bloquer A3 et recto-verso",
    "severity": "block"
  },
  {
    "code": "PAP-02",
    "family": "Papiers",
    "rule": "Sublimation : A4 recto uniquement",
    "action": "Bloquer A3 et recto-verso",
    "severity": "block"
  },
  {
    "code": "PAP-03",
    "family": "Papiers",
    "rule": "Toile fine 270 g : A3 et R/V impossibles",
    "action": "Bloquer les combinaisons",
    "severity": "block"
  },
  {
    "code": "PAP-04",
    "family": "Papiers",
    "rule": "PCB / PCM : numérique laser uniquement",
    "action": "Bloquer jet d’encre et offset",
    "severity": "block"
  },
  {
    "code": "PAP-05",
    "family": "Papiers",
    "rule": "PVC opaque R/V = recto opaque + recto translucide",
    "action": "Utiliser la formule dédiée",
    "severity": "info"
  },
  {
    "code": "PAP-06",
    "family": "Papiers",
    "rule": "R/V = Recto + (Recto − coût matière)",
    "action": "Supprimer le ×2 par défaut",
    "severity": "info"
  },
  {
    "code": "PAP-07",
    "family": "Tous",
    "rule": "Glossy interdit au-dessus de A3",
    "action": "Bloquer A3+, SRA3, A2, A1, A0…",
    "severity": "block"
  },
  {
    "code": "CAR-01",
    "family": "Carterie",
    "rule": "Minimum 50 exemplaires",
    "action": "Bloquer la commande en dessous",
    "severity": "block"
  },
  {
    "code": "CAR-02",
    "family": "Carterie",
    "rule": "PVC translucide : R/V impossible",
    "action": "Bloquer recto-verso",
    "severity": "block"
  },
  {
    "code": "CAR-03",
    "family": "Carterie",
    "rule": "PCB / PCM : numérique laser uniquement",
    "action": "Bloquer les autres technologies",
    "severity": "block"
  },
  {
    "code": "CAR-04",
    "family": "Carterie",
    "rule": "Coins arrondis : +50 Ar / pièce",
    "action": "Ajouter le supplément",
    "severity": "warn"
  },
  {
    "code": "CAR-05",
    "family": "Carterie",
    "rule": "Grammage strictement supérieur à 250 g",
    "action": "Bloquer ≤ 250 g",
    "severity": "block"
  },
  {
    "code": "CAR-06",
    "family": "Fidélité",
    "rule": "PVC exclu pour la zone d’écriture",
    "action": "Bloquer PVC opaque et translucide",
    "severity": "block"
  },
  {
    "code": "CAR-07",
    "family": "Jeux de cartes",
    "rule": "Packaging obligatoire : simple ou luxe",
    "action": "Demander une sélection",
    "severity": "warn"
  },
  {
    "code": "FLY-01",
    "family": "Flyers",
    "rule": "A4 disponible uniquement en recto-verso",
    "action": "Bloquer le recto seul",
    "severity": "block"
  },
  {
    "code": "FLY-02",
    "family": "Flyers",
    "rule": "A3 = prix A4 × 2",
    "action": "Appliquer le facteur 2",
    "severity": "info"
  },
  {
    "code": "FLY-03",
    "family": "Flyers",
    "rule": "A4 : minimum 20 exemplaires",
    "action": "Alerter sous 20",
    "severity": "warn"
  },
  {
    "code": "FLY-04",
    "family": "Flyers",
    "rule": "A6 : minimum 20 exemplaires",
    "action": "Alerter sous 20",
    "severity": "warn"
  },
  {
    "code": "FLY-05",
    "family": "Flyers",
    "rule": "DL : minimum 15 exemplaires",
    "action": "Alerter sous 15",
    "severity": "warn"
  },
  {
    "code": "FLY-06",
    "family": "Flyers",
    "rule": "A5 : minimum 10 exemplaires",
    "action": "Alerter sous 10",
    "severity": "warn"
  },
  {
    "code": "FLY-07",
    "family": "Flyers",
    "rule": "B5 : minimum 5 exemplaires",
    "action": "Alerter sous 5",
    "severity": "warn"
  },
  {
    "code": "FLY-08",
    "family": "Flyers",
    "rule": "90×90 mm : minimum 30 exemplaires",
    "action": "Alerter sous 30",
    "severity": "warn"
  },
  {
    "code": "FLY-09",
    "family": "Flyers",
    "rule": "PCB / PCM : numérique laser uniquement",
    "action": "Bloquer les autres technologies",
    "severity": "block"
  },
  {
    "code": "GOD-01",
    "family": "Goodies",
    "rule": "Stylo : minimum 30 exemplaires",
    "action": "Alerter sous 30",
    "severity": "warn"
  },
  {
    "code": "GOD-02",
    "family": "Goodies",
    "rule": "Pin’s / badge : minimum 30 exemplaires",
    "action": "Alerter sous 30",
    "severity": "warn"
  },
  {
    "code": "GOD-03",
    "family": "Goodies",
    "rule": "Casquette / bob / trousse avec support : minimum 4",
    "action": "Alerter sous 4",
    "severity": "warn"
  },
  {
    "code": "GOD-04",
    "family": "Goodies",
    "rule": "Casquette / bob / trousse sans support : minimum 5",
    "action": "Alerter sous 5",
    "severity": "warn"
  },
  {
    "code": "GF-01",
    "family": "Grand format",
    "rule": "PVC translucide : R/V impossible",
    "action": "Bloquer recto-verso",
    "severity": "block"
  },
  {
    "code": "GF-02",
    "family": "Grand format",
    "rule": "Format personnalisé = longueur × largeur × prix A0",
    "action": "Calculer en m²",
    "severity": "info"
  },
  {
    "code": "PEL-01",
    "family": "Finitions",
    "rule": "Pelliculage : 6 paliers ; A3 = A4 × 2",
    "action": "Appliquer la grille dédiée",
    "severity": "warn"
  },
  {
    "code": "CAL-01",
    "family": "Calendriers",
    "rule": "PCB / PCM : laser uniquement",
    "action": "Bloquer les autres technologies",
    "severity": "warn"
  },
  {
    "code": "DOC-01",
    "family": "Documents",
    "rule": "Carnet autocopiant : multiple de 25 feuilles",
    "action": "Arrondir au multiple supérieur",
    "severity": "warn"
  },
  {
    "code": "EVE-01",
    "family": "Événementiel",
    "rule": "PCB / PCM : laser uniquement",
    "action": "Bloquer les autres technologies",
    "severity": "block"
  },
  {
    "code": "EVE-02",
    "family": "Événementiel",
    "rule": "Photocall / photobooth = tarifs grand format",
    "action": "Utiliser PVC rigide ou bâche",
    "severity": "info"
  },
  {
    "code": "PROT-01",
    "family": "Tous",
    "rule": "Prix manuel « Autres » prioritaire",
    "action": "Désactiver la formule du module",
    "severity": "block"
  },
  {
    "code": "PROT-02",
    "family": "Tous",
    "rule": "Module « Autres » actif avec prix 0",
    "action": "Bloquer devis et panier",
    "severity": "block"
  },
  {
    "code": "PROT-03",
    "family": "Tous",
    "rule": "Coût support lu dans les stocks ; déchet 5 % par défaut",
    "action": "Calculer le recto-verso",
    "severity": "info"
  },
  {
    "code": "PROT-04",
    "family": "Tous",
    "rule": "Total HT = impression + Σ(Autres × quantité)",
    "action": "Additionner tous les modules manuels",
    "severity": "info"
  }
];

export const FM_EDITABLE_PARAM_KEYS = new Set(
  FM_PARAMETERS.filter((p) => p.key).map((p) => p.key as string),
);

export function fmProfileLabel(profile: FmEngineProfile): string {
  if (profile === 'universal') return 'Universel';
  if (profile === 'pos') return 'POS actif';
  return 'Spécifique';
}

export function fmEngineAliases(engine: Pick<FmEngine, 'id' | 'items' | 'familyAliases'>): string[] {
  const fromMap = FM_ENGINE_FAMILY_ALIASES[engine.id] ?? [];
  const fromEngine = engine.familyAliases ?? [];
  const fromItems = (engine.items ?? []).map((i) => i.toLowerCase());
  return [...new Set([engine.id, ...fromMap, ...fromEngine, ...fromItems].map((a) => a.toLowerCase()))];
}

export type FmEngineCoverage = {
  profiles: number;
  published: number;
  draft: number;
  families: string[];
};

export function coverageForFmEngine(
  engine: Pick<FmEngine, 'id' | 'items' | 'familyAliases'>,
  families: Array<{ family: string; profiles: number; published: number; draft: number }>,
): FmEngineCoverage {
  const aliases = fmEngineAliases(engine);
  const matches = families.filter((f) => {
    const name = f.family.toLowerCase();
    return aliases.some((alias) => name.includes(alias) || alias.includes(name));
  });
  return {
    profiles: matches.reduce((acc, f) => acc + f.profiles, 0),
    published: matches.reduce((acc, f) => acc + f.published, 0),
    draft: matches.reduce((acc, f) => acc + f.draft, 0),
    families: matches.map((f) => f.family),
  };
}

/** Fusion localStorage + seed catalogue (conserve customs, réinjecte aliases seed). */
export function mergeStoredEngines(saved?: FmEngine[] | null): FmEngine[] {
  if (!saved?.length) {
    return FM_DEFAULT_ENGINES.map((e) => ({
      ...e,
      familyAliases: FM_ENGINE_FAMILY_ALIASES[e.id] ?? e.familyAliases,
      items: [...e.items],
    }));
  }
  const byId = new Map(saved.map((e) => [e.id, e]));
  const merged = FM_DEFAULT_ENGINES.map((def) => {
    const s = byId.get(def.id);
    const aliases = FM_ENGINE_FAMILY_ALIASES[def.id] ?? def.familyAliases;
    if (!s) {
      return { ...def, familyAliases: aliases, items: [...def.items] };
    }
    return {
      ...def,
      ...s,
      profileLabel: s.profileLabel || fmProfileLabel(s.profile),
      familyAliases: aliases,
      items: s.items?.length ? s.items : [...def.items],
      color: s.color || def.color,
    };
  });
  for (const s of saved) {
    if (!FM_DEFAULT_ENGINES.some((d) => d.id === s.id)) {
      merged.push({
        ...s,
        profileLabel: s.profileLabel || fmProfileLabel(s.profile),
        familyAliases: [...(s.familyAliases ?? [])],
        items: [...(s.items ?? [])],
      });
    }
  }
  return merged;
}

export function matchFmEngineByFamily(
  family: string | null | undefined,
  engines: FmEngine[] = FM_DEFAULT_ENGINES,
): FmEngine | null {
  if (!family) return null;
  const name = family.toLowerCase();
  return (
    engines.find((e) => fmEngineAliases(e).some((alias) => name.includes(alias) || alias.includes(name)))
    ?? null
  );
}

/**
 * Sections uniques des paramètres Formules (ordre d’apparition).
 * Utilisé par l’UI Formules & moteurs et les tests de catalogue.
 */
export function fmParamSections(params: FmParameter[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of params) {
    if (!seen.has(p.section)) {
      seen.add(p.section);
      out.push(p.section);
    }
  }
  return out;
}

export function fmRuleFamilies(list: FmRule[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of list) {
    if (!seen.has(r.family)) {
      seen.add(r.family);
      out.push(r.family);
    }
  }
  return out;
}
