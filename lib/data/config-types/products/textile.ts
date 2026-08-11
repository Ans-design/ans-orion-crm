import type { ConfigField, ConfigSection, ProductConfig } from '../types';
import {
  _matiereGrammageSection,
  _printMatieres,
  _printMatieresAliases,
  _printWeightsByType,
  _flyerMatieres,
  _flyerWeightsByType,
  _carteMatieres,
  _carteWeightsByType,
  _carteFideliteMatieres,
  _carteFideliteWeightsByType,
  _carteJeuxMatieres,
  _cartonGrammages,
  _cartonWeightsByMatiere,
  _bacheGrammages,
  _bacheWeightsByMatiere,
  _rollupBannerMatieres,
  _rollupBannerWeightsByMatiere,
  _rollupFormatsByType,
  _xbannerFormatsByType,
  _bookIntMatieres,
  _bookIntWeightsByMatiere,
  _bookCouvMatieres,
  _bookCouvWeightsByMatiere,
  _menuMatieres,
  _menuWeightsByMatiere,
  _evtAfficheWeightsByMatiere,
  _evtFormatsGrand,
  _evtFormatsPhotocall,
  _evtFormatsPhotobooth,
  _evtFormatsCarteVoeux,
  _evtFormatsPochette,
  _evtRigidMatieres,
  _evtRigidThickness,
  _textileColors,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// TEXTILE
// ═══════════════════════════════════════════════════════════════

const _textileSizeAdult = ['XS','S','M','L','XL','XXL','3XL','Taille personnalisée'];
const _textileSizeChild = ['2 ans','4 ans','6 ans','8 ans','10 ans','12 ans','14 ans','Taille personnalisée'];

const _markingTechniques = ['Flex textile','Flocage','DTF','Sérigraphie','Sublimation','Broderie','Transfert','Technique personnalisée'];
const _markingZones = ['Poitrine cœur','Poitrine centre','Dos haut','Dos centre','Dos complet','Manche gauche','Manche droite','Épaule','Bas du vêtement','Plusieurs zones','Zone personnalisée'];
const _markingFormats = ['Mini — 5×5 cm','Cœur — 8×8 cm','Petit logo — 10×10 cm','Logo moyen — 15×15 cm','A5 — 148×210 mm','A4 — 210×297 mm','A3 — 297×420 mm','Dos large — 30×40 cm','Format personnalisé'];
const _markingFormatsA6A2 = ['A6 — 105×148 mm','A5 — 148×210 mm','A4 — 210×297 mm','A3 — 297×420 mm','A2 — 420×594 mm','Format personnalisé'];
const _taillePersoDetail: ConfigField = {
  key: 'taille_perso_detail',
  label: 'Détail taille personnalisée',
  type: 'textarea',
  note: 'Précisez les mensurations si vous avez indiqué une taille personnalisée dans le tableau.',
};
const _textileSizeAdultOnly = ['XS','S','M','L','XL','XXL','3XL','Taille personnalisée'];

const _markingFormatsTrousse = ['Mini — 3×3 cm','Petit — 5×5 cm','Moyen — 8×8 cm','Grand — 12×8 cm','Format personnalisé'];

const _textileNoteFields: ConfigField[] = [
  {
    key: 'fichier_joint',
    label: 'Fichier / visuel à joindre',
    type: 'chips',
    options: ['Dépôt via BAT / commande', 'Référence en notes'],
    default: 'Dépôt via BAT / commande',
  },
  {
    key: 'remarques',
    label: 'Notes & remarques',
    type: 'textarea',
    required: false,
    note: 'Instructions spéciales, emplacement, référence fichier, remarque client ou production…',
  },
];

const _archivedTextileNotesSection: ConfigSection = {
  title: 'Notes (archivé)',
  icon: '📝',
  posHidden: true,
  archived: true,
  keepForHistory: true,
  fields: [
    { key: 'fichier_visuel', label: 'Fichier / visuel à personnaliser', type: 'textarea' },
    { key: 'note_emplacement_marquage', label: 'Précision emplacement / consigne de marquage', type: 'textarea' },
    { key: 'note_production', label: 'Note production', type: 'textarea' },
  ],
};

function _textileMarkingSection(formatOpts: string[], defaultFormat: string): ConfigSection {
  return {
    title: 'Taille du marquage',
    icon: '📐',
    fields: [
      {
        key: 'format_marquage',
        label: 'Taille',
        type: 'chips',
        options: formatOpts,
        default: defaultFormat,
        forcePriceValues: ['Format personnalisé'],
      },
      {
        key: 'longueur',
        label: 'Longueur L (mm)',
        type: 'number',
        min: 1,
        suffix: 'mm',
        showWhen: { field: 'format_marquage', values: ['Format personnalisé'] },
      },
      {
        key: 'largeur',
        label: 'Largeur l (mm)',
        type: 'number',
        min: 1,
        suffix: 'mm',
        showWhen: { field: 'format_marquage', values: ['Format personnalisé'] },
      },
    ],
  };
}

const _archivedCoupeSection: ConfigSection = {
  title: 'Coupe / genre',
  icon: '✂️',
  posHidden: true,
  archived: true,
  keepForHistory: true,
  fields: [
    { key: 'coupe', label: 'Coupe', type: 'chips', options: ['Unisexe','Homme','Femme','Enfant','Coupe droite','Coupe ajustée','Coupe oversize','Coupe personnalisée'], forcePriceValues: ['Coupe personnalisée'] },
  ],
};

const _archivedZoneSection: ConfigSection = {
  title: 'Zone de marquage',
  icon: '📍',
  posHidden: true,
  archived: true,
  keepForHistory: true,
  fields: [
    { key: 'zone_marquage', label: 'Zone', type: 'chips', options: _markingZones, forcePriceValues: ['Zone personnalisée'] },
  ],
};

type TextileBaseOpts = {
  skipModele?: boolean;
  skipTechnique?: boolean;
  formatMode?: 'default' | 'a6a2' | 'none';
  formatOnly?: boolean;
  adultOnlySizes?: boolean;
  taillePersoDetail?: boolean;
  markingFormatOptions?: string[];
  markingFormatDefault?: string;
};

function _textileBase(productLabel: string, models: string[], materials: string[], grammages: string[], extraSections?: ConfigSection[], opts: TextileBaseOpts = {}): ProductConfig {
  const sections: ConfigSection[] = [];
  if (!opts.skipModele) {
    sections.push({ title: `Modèle de ${productLabel}`, icon: '👕', fields: [
      { key: 'modele', label: 'Modèle', type: 'chips', options: models, default: models[0], forcePriceValues: models.filter(m => m.toLowerCase().includes('personnalisé')) },
    ]});
  }
  sections.push(
    { title: 'Tailles & quantités', icon: '📏', fields: [
      { key: 'tailles', label: 'Tailles & quantités', type: 'size_qty_table', sizeGroups: opts.adultOnlySizes
        ? [{ label: 'Adulte', sizes: _textileSizeAdultOnly }]
        : [
          { label: 'Adulte', sizes: _textileSizeAdult },
          { label: 'Enfant', sizes: _textileSizeChild },
        ] },
    ]},
  );
  if (opts.taillePersoDetail) {
    sections.push({ title: 'Taille personnalisée', icon: '📏', fields: [_taillePersoDetail] });
  }
  sections.push(
    { title: `Couleur du ${productLabel}`, icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
  );
  if (extraSections?.length) {
    sections.push(...extraSections);
  }
  sections.push(
    { title: 'Matière & grammage', icon: '🧵', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: materials, default: materials[0], forcePriceValues: materials.filter(m => m.toLowerCase().includes('personnalisée')), customInput: 'material' },
      { key: 'grammage', label: 'Grammage', type: 'chips', options: grammages, forcePriceValues: grammages.filter(g => g.toLowerCase().includes('personnalisé')), customInput: 'grammage' },
    ]},
  );
  if (!opts.skipTechnique) {
    sections.push({ title: 'Technique de personnalisation', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: _markingTechniques, default: _markingTechniques[0], forcePriceValues: ['Technique personnalisée'],
        compatibility: { 'Sublimation': ['Polyester','Poly-coton'], 'Broderie': ['Coton','Coton peigné','Coton bio','Coton piqué'] },
      },
    ]});
    if (opts.formatMode !== 'none') {
      const formatOpts = opts.markingFormatOptions ?? (opts.formatMode === 'a6a2' ? _markingFormatsA6A2 : _markingFormats);
      const defaultFmt = opts.markingFormatDefault ?? formatOpts[Math.min(3, formatOpts.length - 2)];
      sections.push(_textileMarkingSection(formatOpts, defaultFmt));
    }
  } else if (opts.formatOnly && opts.formatMode === 'a6a2') {
    sections.push(_textileMarkingSection(_markingFormatsA6A2, 'A4 — 210×297 mm'));
  }
  sections.push(
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité totale', type: 'number', min: 1, default: 10, presets: [5,10,25,50,100,250], note: 'Si tailles remplies, la quantité est calculée automatiquement' },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _textileNoteFields },
    _archivedTextileNotesSection,
    _archivedCoupeSection,
    _archivedZoneSection,
  );
  return {
    sections,
    qtyMin: 1, qtyDefault: 10, qtyPresets: [5,10,25,50,100,250],
    priceTiers: [{max:9,px:15000},{max:49,px:12000},{max:99,px:10000},{max:499,px:8000},{max:null,px:6500}],
  };
}

const TX_TSHIRT: ProductConfig = _textileBase('T-shirt',
  [],
  ['Coton','Coton peigné','Coton bio','Polyester','Poly-coton','Textile sport / dry-fit','Jersey','Matière premium','Matière personnalisée'],
  ['140g','150g','160g','180g','200g','220g','Grammage personnalisé'],
  [],
  { skipModele: true, formatMode: 'a6a2', taillePersoDetail: true },
);

const TX_POLO: ProductConfig = _textileBase('Polo',
  [],
  ['Coton','Coton piqué','Coton peigné','Coton bio','Polyester','Poly-coton','Textile sport / dry-fit','Matière premium','Matière personnalisée'],
  ['180g','200g','220g','240g','Grammage personnalisé'],
  [
    { title: 'Couleur des manches', icon: '🎨', fields: [
      { key: 'couleur_manches', label: 'Couleur manches', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Couleur du col', icon: '🎨', fields: [
      { key: 'couleur_col', label: 'Couleur col', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
  ],
  { skipModele: true, formatMode: 'a6a2', taillePersoDetail: true },
);

const TX_SWEAT: ProductConfig = _textileBase('Sweat',
  [],
  ['Coton','Coton bio','Polyester','Poly-coton','Molleton','Polaire','Matière personnalisée'],
  ['240g','280g','300g','320g','350g','Grammage personnalisé'],
  [],
  {
    skipModele: true,
    formatMode: 'a6a2',
    taillePersoDetail: true,
  },
);

const TX_GILET: ProductConfig = _textileBase('Gilet',
  [],
  ['Polyester','Polaire','Softshell','Coton','Poly-coton','Tissu technique','Matière personnalisée'],
  ['180g','220g','260g','300g','Grammage personnalisé'],
  [],
  {
    skipModele: true,
    skipTechnique: true,
    formatOnly: true,
    formatMode: 'a6a2',
    taillePersoDetail: true,
  },
);

const TX_COMBINAISON: ProductConfig = _textileBase('Combinaison',
  [],
  ['Coton','Poly-coton','Polyester','Tissu technique','Anti-statique','Ignifuge','Matière personnalisée'],
  ['200g','240g','280g','300g','Grammage personnalisé'],
  [],
  {
    skipModele: true,
    skipTechnique: true,
    formatOnly: true,
    formatMode: 'a6a2',
    taillePersoDetail: true,
    adultOnlySizes: true,
  },
);

const TX_SURVETEMENT: ProductConfig = {
  qtyMin: 1, qtyDefault: 10, qtyPresets: [5,10,25,50,100],
  priceTiers: [{max:9,px:15000},{max:49,px:12000},{max:99,px:10000},{max:499,px:8000},{max:null,px:6500}],
  sections: [
    { title: 'Type / composition', icon: '🏃', fields: [
      { key: 'type_composition', label: 'Type / composition', type: 'chips', options: [
        'Survêtement complet (veste + pantalon assorti)',
        'Survêtement complet (veste + jogging)',
        'Survêtement complet (veste + bermuda)',
        'Veste seule',
        'Pantalon seul',
        'Jogging seul',
        'Composition personnalisée',
      ], default: 'Survêtement complet (veste + pantalon assorti)', forcePriceValues: ['Composition personnalisée'] },
    ]},
    { title: 'Matière', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Polyester','Poly-coton','Coton','Molleton','Tissu sport / dry-fit','Matière personnalisée'], default: 'Polyester', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur textile', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur principale', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Couleur secondaire', icon: '🎨', fields: [
      { key: 'couleur_secondaire', label: 'Couleur secondaire', type: 'color_palette', palette: [
        { id: 'aucune', label: 'Aucune', hex: '#EEEEEE' },
        ..._textileColors.filter(c => c.id !== 'custom'),
        { id: 'custom', label: 'Personnalisée', hex: '#CCCCCC', badge: 'prix forcé' },
      ]},
    ]},
    { title: 'Tailles & quantités', icon: '📏', fields: [
      { key: 'tailles', label: 'Tailles & quantités', type: 'size_qty_table', sizeGroups: [
        { label: 'Adulte', sizes: _textileSizeAdult },
        { label: 'Enfant', sizes: _textileSizeChild },
      ]},
    ]},
    { title: 'Taille personnalisée', icon: '📏', fields: [_taillePersoDetail] },
    { title: 'Technique de marquage', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: _markingTechniques, default: _markingTechniques[0], forcePriceValues: ['Technique personnalisée'] },
    ]},
    _textileMarkingSection(_markingFormatsA6A2, 'A4 — 210×297 mm'),
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité totale', type: 'number', min: 1, default: 10, presets: [5,10,25,50,100] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _textileNoteFields },
    _archivedTextileNotesSection,
    _archivedZoneSection,
  ]
};

const TX_CASQUETTE: ProductConfig = {
  qtyMin: 5, qtyDefault: 25, qtyPresets: [5,10,25,50,100,250],
  priceTiers: [{max:9,px:8000},{max:49,px:6000},{max:99,px:5000},{max:499,px:4000},{max:null,px:3500}],
  sections: [
    { title: 'Matière', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Coton','Polyester','Poly-coton','Coton brossé','Nylon','Laine','Toile','Matière personnalisée'], default: 'Coton', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur de la casquette', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Couleur de la visière', icon: '🎨', fields: [
      { key: 'couleur_visiere', label: 'Couleur visière', type: 'color_palette', palette: [
        { id: 'identique', label: 'Identique au corps', hex: '#DDDDDD' },
        ..._textileColors.filter(c => c.id !== 'custom'),
        { id: 'custom', label: 'Personnalisée', hex: '#CCCCCC', badge: 'prix forcé' },
      ]},
    ]},
    { title: 'Technique de personnalisation', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: _markingTechniques, default: _markingTechniques[0], forcePriceValues: ['Technique personnalisée'] },
    ]},
    _textileMarkingSection(_markingFormatsA6A2, 'A6 — 105×148 mm'),
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 5, default: 25, presets: [5,10,25,50,100,250] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _textileNoteFields },
    _archivedTextileNotesSection,
    _archivedZoneSection,
  ]
};

const TX_BOB: ProductConfig = {
  qtyMin: 5, qtyDefault: 25, qtyPresets: [5,10,25,50,100,250],
  priceTiers: [{max:9,px:7000},{max:49,px:5500},{max:99,px:4500},{max:499,px:3500},{max:null,px:3000}],
  sections: [
    { title: 'Taille', icon: '📏', fields: [
      { key: 'taille_bob', label: 'Taille', type: 'chips', options: ['S (54-55 cm)','M (56-57 cm)','L (58-59 cm)','XL (60-61 cm)','Enfant','Taille unique','Taille personnalisée'], default: 'Taille unique', forcePriceValues: ['Taille personnalisée'] },
    ]},
    { title: 'Matière', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Coton','Polyester','Poly-coton','Nylon','Toile','Coton brossé','Matière personnalisée'], default: 'Coton', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur du bob', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur extérieure', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Couleur intérieure', icon: '🎨', fields: [
      { key: 'couleur_int', label: 'Couleur intérieure', type: 'color_palette', palette: [
        { id: 'identique', label: 'Identique extérieur', hex: '#DDDDDD' },
        ..._textileColors.filter(c => c.id !== 'custom'),
        { id: 'custom', label: 'Personnalisée', hex: '#CCCCCC', badge: 'prix forcé' },
      ]},
    ]},
    { title: 'Technique de personnalisation', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: _markingTechniques, default: _markingTechniques[0], forcePriceValues: ['Technique personnalisée'] },
    ]},
    _textileMarkingSection(_markingFormatsA6A2, 'A6 — 105×148 mm'),
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 5, default: 25, presets: [5,10,25,50,100,250] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _textileNoteFields },
    _archivedTextileNotesSection,
    _archivedZoneSection,
  ]
};

const TX_MAILLOT: ProductConfig = {
  qtyMin: 1, qtyDefault: 15, qtyPresets: [1,5,11,15,25,50],
  priceTiers: [{max:9,px:15000},{max:49,px:12000},{max:99,px:10000},{max:499,px:8000},{max:null,px:6500}],
  sections: [
    { title: 'Sport / usage', icon: '🏆', fields: [
      { key: 'sport', label: 'Sport', type: 'chips', options: ['Football','Basketball','Rugby','Cyclisme','Running','Handball','Volley','Multisport','Autre sport'], default: 'Football' },
    ]},
    { title: 'Produit inclus', icon: '📦', fields: [
      { key: 'composition', label: 'Inclus', type: 'chips', options: ['Maillot seul','Maillot + short','Maillot + short + chaussettes','Tenue complète personnalisée'], default: 'Maillot seul', forcePriceValues: ['Tenue complète personnalisée'] },
    ]},
    { title: 'Matière & grammage', icon: '🧵', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Polyester','Dry-fit','Poly-coton','Mesh / aéré','Matière personnalisée'], default: 'Polyester', forcePriceValues: ['Matière personnalisée'], customInput: 'material' },
      { key: 'grammage', label: 'Grammage', type: 'chips', options: ['130g','140g','150g','160g','Grammage personnalisé'], forcePriceValues: ['Grammage personnalisé'], customInput: 'grammage' },
    ]},
    { title: 'Couleur du maillot', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur principale', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Tailles & quantités', icon: '📏', fields: [
      { key: 'tailles', label: 'Tailles & quantités', type: 'size_qty_table', sizeGroups: [
        { label: 'Adulte', sizes: _textileSizeAdult },
        { label: 'Enfant', sizes: _textileSizeChild },
      ]},
    ]},
    { title: 'Taille personnalisée', icon: '📏', fields: [_taillePersoDetail] },
    { title: 'Personnalisation joueur', icon: '🔢', fields: [
      { key: 'perso_joueur', label: 'Personnalisation', type: 'chips_multi', options: ['Nom au dos','Numéro au dos','Nom + numéro','Logo équipe','Logo sponsor','Personnalisation personnalisée'], forcePriceValues: ['Personnalisation personnalisée'] },
    ]},
    { title: 'Technique de personnalisation', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sublimation complète','Flex textile','Flocage','DTF','Sérigraphie','Transfert','Technique personnalisée'], default: 'Sublimation complète', forcePriceValues: ['Technique personnalisée'] },
    ]},
    _textileMarkingSection(_markingFormatsA6A2, 'A4 — 210×297 mm'),
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité totale', type: 'number', min: 1, default: 15, presets: [1,5,11,15,25,50] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _textileNoteFields },
    _archivedTextileNotesSection,
    _archivedZoneSection,
  ]
};

const TX_TOTEBAG: ProductConfig = {
  qtyMin: 5, qtyDefault: 50, qtyPresets: [10,25,50,100,250,500],
  priceTiers: [{max:9,px:5000},{max:49,px:4000},{max:99,px:3500},{max:499,px:3000},{max:null,px:2500}],
  sections: [
    { title: 'Format / dimensions', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Petit — 25×30 cm','Standard — 36×40 cm','Large — 40×45 cm','Sac course — 38×42 cm','Format personnalisé'], default: 'Standard — 36×40 cm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Matière & grammage', icon: '🧵', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Coton','Coton bio','Coton canvas','Polyester','Non-tissé','Jute','Toile épaisse','Soga','Matière personnalisée'], default: 'Coton', forcePriceValues: ['Matière personnalisée'], customInput: 'material' },
      { key: 'grammage', label: 'Grammage', type: 'chips', options: ['110g (léger)','140g (standard)','180g (épais)','220g (premium)','Grammage personnalisé'], forcePriceValues: ['Grammage personnalisé'], customInput: 'grammage' },
    ]},
    { title: 'Couleur du tote bag', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique de personnalisation', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: _markingTechniques, default: _markingTechniques[0], forcePriceValues: ['Technique personnalisée'],
        compatibility: { 'Sublimation': ['Polyester','Non-tissé'], 'Broderie': ['Coton','Coton canvas','Coton bio','Toile épaisse'] },
      },
    ]},
    _textileMarkingSection(_markingFormats, 'Logo moyen — 15×15 cm'),
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 5, default: 50, presets: [10,25,50,100,250,500] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _textileNoteFields },
    _archivedTextileNotesSection,
    { title: 'Modèle de tote bag', icon: '👜', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'modele', label: 'Modèle', type: 'chips', options: ['Tote bag standard','Tote bag avec soufflet','Tote bag large','Tote bag petit format','Tote bag premium','Tote bag personnalisé'], forcePriceValues: ['Tote bag personnalisé'] },
    ]},
    { title: 'Anses / poignées', icon: '🔗', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'anses', label: 'Type d\'anses', type: 'chips', options: ['Anses courtes','Anses longues (épaule)','Anses renforcées','Anses contrastées','Anses personnalisées'], forcePriceValues: ['Anses personnalisées'] },
    ]},
    { title: 'Soufflet / fond', icon: '📦', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'soufflet', label: 'Soufflet', type: 'chips', options: ['Sans soufflet (plat)','Avec soufflet latéral','Avec fond rigide','Soufflet personnalisé'], forcePriceValues: ['Soufflet personnalisé'] },
    ]},
    { title: 'Fermeture', icon: '🔒', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'fermeture', label: 'Fermeture', type: 'chips', options: ['Sans fermeture (ouvert)','Bouton pression','Zip','Velcro','Fermeture personnalisée'], forcePriceValues: ['Fermeture personnalisée'] },
    ]},
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Face avant centre','Face avant haut','Face arrière','Deux faces','Poche','Plusieurs zones','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const TX_TROUSSE: ProductConfig = {
  qtyMin: 10, qtyDefault: 50, qtyPresets: [10,25,50,100,250,500],
  priceTiers: [{max:9,px:6000},{max:49,px:5000},{max:99,px:4000},{max:499,px:3500},{max:null,px:3000}],
  sections: [
    { title: 'Format / dimensions', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Petit — 15×8 cm','Standard — 20×10 cm','Large — 25×12 cm','Format personnalisé'], default: 'Standard — 20×10 cm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Matière', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Coton','Coton canvas','Polyester','Simili cuir','Néoprène','Jute','Matière personnalisée'], default: 'Coton canvas', forcePriceValues: ['Matière personnalisée'], customInput: 'material',
        compatibility: { 'Sublimation': ['Polyester'], 'Broderie': ['Coton','Coton canvas'] },
      },
    ]},
    { title: 'Couleur de la trousse', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _textileColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Doublure intérieure', icon: '🧷', fields: [
      { key: 'doublure', label: 'Doublure', type: 'chips', options: ['Sans doublure','Doublure tissu','Doublure imperméable','Doublure personnalisée'], default: 'Sans doublure', forcePriceValues: ['Doublure personnalisée'] },
    ]},
    { title: 'Technique de personnalisation', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: _markingTechniques, default: _markingTechniques[0], forcePriceValues: ['Technique personnalisée'],
        compatibility: { 'Sublimation': ['Polyester'], 'Broderie': ['Coton','Coton canvas'] },
      },
    ]},
    _textileMarkingSection(_markingFormatsTrousse, 'Moyen — 8×8 cm'),
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 10, default: 50, presets: [10,25,50,100,250,500] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _textileNoteFields },
    _archivedTextileNotesSection,
    { title: 'Modèle de trousse', icon: '✏️', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'modele', label: 'Modèle', type: 'chips', options: ['Trousse plate','Trousse rectangulaire','Trousse ronde / cylindrique','Trousse large','Trousse enfant','Trousse premium','Trousse personnalisée'], forcePriceValues: ['Trousse personnalisée'] },
    ]},
    { title: 'Fermeture', icon: '🔒', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'fermeture', label: 'Fermeture', type: 'chips', options: ['Zip métal','Zip plastique','Bouton pression','Velcro','Rabat','Fermeture personnalisée'], forcePriceValues: ['Fermeture personnalisée'] },
    ]},
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Face avant centre','Face avant haut','Face arrière','Zip / languette','Plusieurs zones','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const TX_LAMBAHOANY: ProductConfig = {
  qtyMin: 10, qtyDefault: 100, qtyPresets: [10,25,50,100,250,500,1000],
  priceTiers: [{max:9,px:15000},{max:49,px:12000},{max:99,px:10000},{max:499,px:8000},{max:null,px:6500}],
  sections: [
    { title: 'Format / dimensions', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Standard — 110×160 cm','Grand — 120×180 cm','Petit — 100×140 cm','Format personnalisé'], default: 'Standard — 110×160 cm', forcePriceValues: ['Format personnalisé'] },
      { key: 'largeur', label: 'Largeur (cm)', type: 'number', min: 10, max: 500, suffix: 'cm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'hauteur', label: 'Hauteur (cm)', type: 'number', min: 10, max: 500, suffix: 'cm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    { title: 'Matière textile', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Coton standard','Coton peigné','Poly-coton','Polyester','Matière personnalisée'], default: 'Coton standard', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Technique impression', icon: '🖨️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Impression textile','Sublimation','Technique personnalisée'], default: 'Impression textile', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Finition', icon: '✨', fields: [
      { key: 'finition', label: 'Finition', type: 'chips', options: ['Sans finition','Ourlet','Œillets','Finition personnalisée'], default: 'Sans finition', forcePriceValues: ['Finition personnalisée'] },
    ]},
    { title: 'Grammage textile', icon: '⚖️', fields: [
      { key: 'grammage', label: 'Grammage', type: 'chips', options: ['100g','120g','140g','160g','Grammage personnalisé'], default: '120g', forcePriceValues: ['Grammage personnalisé'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 10, default: 100, presets: [10,25,50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};



export {
  TX_TSHIRT,
  TX_POLO,
  TX_SWEAT,
  TX_GILET,
  TX_COMBINAISON,
  TX_SURVETEMENT,
  TX_CASQUETTE,
  TX_BOB,
  TX_MAILLOT,
  TX_TOTEBAG,
  TX_TROUSSE,
  TX_LAMBAHOANY,
};
