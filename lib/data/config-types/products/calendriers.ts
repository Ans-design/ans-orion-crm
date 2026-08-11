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
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// CALENDRIERS
// ═══════════════════════════════════════════════════════════════

/** Grammages calendriers rigides (>250g) — socle chevalet, plateau PCB/PCM. */
const _calGrammagesEpais = ['300g', '350g', '400g', '600g', '700g', 'Grammage personnalisé'];
const _calFeuilletsThinGrammages = [
  '90g', '115g', '130g', '135g', '150g', '170g', '200g', '250g', '300g', 'Grammage personnalisé',
];
const _calGrammagesMarquepage = ['230g', '250g', '300g', '350g', 'Grammage personnalisé'];
const _calMuralGlossyGrammages = ['300g', '600g', 'Grammage personnalisé'];
const _calPlateauGlossyGrammages = ['300g', '600g', 'Grammage personnalisé'];

const _calPlateauMatieres = [
  'PCB', 'PCM', 'Glossy', 'Bristol', 'Papier recyclé épais', 'Matière personnalisée',
];
const _calPlateauWeightsByMatiere: Record<string, string[]> = {
  PCB: ['300g', '350g', '400g', '600g', '700g', 'Grammage personnalisé'],
  PCM: ['300g', '350g', '400g', '600g', '700g', 'Grammage personnalisé'],
  Glossy: _calPlateauGlossyGrammages,
  Bristol: ['300g', '350g', '400g', 'Grammage personnalisé'],
  'Papier recyclé épais': ['300g', '350g', '400g', 'Grammage personnalisé'],
  'Matière personnalisée': [..._calGrammagesEpais],
};

/** Socle chevalet / chevalet table — sans Carte ivoire */
const _calBlancMatieres = ['PCB', 'PCM', 'Glossy', 'Bristol', 'Papier recyclé épais', 'autres'];
const _calBlancWeightsByMatiere: Record<string, string[]> = {
  PCB: ['300g', '350g', '400g', '600g', 'Grammage personnalisé'],
  PCM: ['300g', '350g', '400g', '600g', 'Grammage personnalisé'],
  Glossy: ['250g', '300g', '600g', 'Grammage personnalisé'],
  Bristol: ['300g', '350g', '400g', 'Grammage personnalisé'],
  'Papier recyclé épais': ['300g', '350g', '400g', 'Grammage personnalisé'],
  autres: ['300g', '350g', '400g', '600g', 'Grammage personnalisé', 'Autres'],
};

/** Calendrier mural — feuillets fins autorisés + Offset */
const _calMuralMatieres = ['PCB', 'PCM', 'Glossy', 'Offset', 'Bristol', 'Papier recyclé épais', 'autres'];
const _calMuralWeightsByMatiere: Record<string, string[]> = {
  PCB: [...(_printWeightsByType.PCB ?? ['Grammage personnalisé'])],
  PCM: [...(_printWeightsByType.PCM ?? ['Grammage personnalisé'])],
  Glossy: _calMuralGlossyGrammages,
  Offset: [...(_printWeightsByType.Offset ?? ['80g', '90g', '100g', '120g', 'Grammage personnalisé'])],
  Bristol: ['250g', '300g', 'Grammage personnalisé'],
  'Papier recyclé épais': ['250g', '300g', '350g', 'Grammage personnalisé'],
  autres: ['Grammage personnalisé', 'Autres'],
};

const _calFeuilletsMatieres = ['PCB', 'PCM', 'Offset', 'Glossy', 'Rigide luxe', 'autres'];
const _calFeuilletsWeightsByMatiere: Record<string, string[]> = {
  PCB: _calFeuilletsThinGrammages,
  PCM: _calFeuilletsThinGrammages,
  Offset: _calFeuilletsThinGrammages,
  Glossy: ['135g', '150g', '170g', '200g', '250g', '300g', 'Grammage personnalisé'],
  'Rigide luxe': ['400g', '600g', '750g', 'Grammage personnalisé'],
  autres: [..._calFeuilletsThinGrammages.filter((g) => g !== 'Grammage personnalisé'), 'Autres'],
};
const _calTechnologieOpts = ['Numérique Laser', 'Jet d\'encre', 'Offset', 'Autres'];
const _calTechnologieByMatiere: Record<string, string[]> = {
  PCB: ['Numérique Laser', 'Offset', 'Autres'],
  PCM: ['Numérique Laser', 'Offset', 'Autres'],
  Glossy: _calTechnologieOpts,
  autres: _calTechnologieOpts,
};
const _calTechnoNote = 'PCB / PCM — Numérique Laser ou Offset uniquement. Le jet d\'encre n\'adhère pas sur ce support couché.';

/** Formats marque-page — triés par surface croissante */
const _calMpFormatsMarquepage = [
  '50 × 150 mm', '55 × 170 mm', '60 × 180 mm', '70 × 200 mm',
  'A7 — 74×105 mm', 'DL — 99×210 mm', 'Format personnalisé',
];
const _calMpFormatsPoche = [
  '8.5 × 5.5 cm (CB)', '10 × 7 cm', '10 × 15 cm (A6)', 'DL — 99×210 mm', 'Format personnalisé',
];
const _calMpFormatsAll = [
  ..._calMpFormatsMarquepage.filter((f) => f !== 'Format personnalisé'),
  ..._calMpFormatsPoche.filter((f) => f !== 'Format personnalisé'),
  'Format personnalisé', 'Type personnalisé',
];
const _calMpMatieres = [
  'PCB', 'PCM', 'Glossy', 'Bristol', 'Papier recyclé épais',
  'Papier spécial invitation', 'Matière personnalisée',
];
const _calMpGrammages = [..._calGrammagesMarquepage.slice(0, -1), 'Autres'];
const _calMpWeightsByMatiere: Record<string, string[]> = {
  PCB: [..._calGrammagesMarquepage],
  PCM: [..._calGrammagesMarquepage],
  Glossy: ['230g', '250g', '300g', '350g', 'Grammage personnalisé'],
  Bristol: [..._calGrammagesMarquepage],
  'Papier recyclé épais': [..._calGrammagesMarquepage],
  'Papier spécial invitation': [..._calGrammagesMarquepage],
  'Matière personnalisée': _calMpGrammages,
};
const _calMpTechnoByMatiere: Record<string, string[]> = {
  PCB: ['Numérique Laser', 'Offset', 'Autres'],
  PCM: ['Numérique Laser', 'Offset', 'Autres'],
  Glossy: _calTechnologieOpts,
  Bristol: _calTechnologieOpts,
  'Papier recyclé épais': _calTechnologieOpts,
  'Papier spécial invitation': _calTechnologieOpts,
  'Matière personnalisée': _calTechnologieOpts,
};

const _calPlateauFormats = [
  'A4 — 210×297 mm', 'A4+ — 216×303 mm', 'A3 — 297×420 mm',
  'A3+ — 320×450 mm', 'A2 — 420×594 mm', 'Format personnalisé',
];

const CAL_PLATEAUX: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500,1000],
  prixM2: 18000,
  sections: [
    { title: 'Format', icon: '📐', layout: 'grid-3', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _calPlateauFormats, default: 'A3 — 297×420 mm' },
      { key: 'longueur', label: 'Longueur L (mm)', type: 'number', min: 100, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'largeur', label: 'Largeur l (mm)', type: 'number', min: 100, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    {
      title: 'Matière & grammage',
      icon: '📃',
      layout: 'grid-2',
      fields: [
        { key: 'matiere', label: 'Matière', type: 'chips', options: _calPlateauMatieres, default: 'PCB', forcePriceValues: ['Matière personnalisée'] },
        {
          key: 'grammage',
          label: 'Grammage',
          type: 'chips',
          options: [],
          customInput: 'grammage',
          optionsFilter: { field: 'matiere', optionsByValue: _calPlateauWeightsByMatiere },
          forcePriceValues: ['Grammage personnalisé'],
        },
      ],
    },
    { title: 'Impression', icon: '🖨️', layout: 'grid-2', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto seul', 'Recto-verso'], default: 'Recto seul' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const CAL_MARQUEPAGE: ProductConfig = {
  qtyMin: 50, qtyDefault: 250, qtyPresets: [50, 100, 250, 500, 1000],
  prixM2: 22000,
  sections: [
    {
      title: 'Type',
      icon: '🔖',
      fields: [{
        key: 'type',
        label: 'Type',
        type: 'chips',
        options: ['Marque-page calendrier', 'Calendrier de poche', 'Type personnalisé'],
        forcePriceValues: ['Type personnalisé'],
      }],
    },
    {
      title: 'Format',
      icon: '📐',
      fields: [{
        key: 'format',
        label: 'Format',
        type: 'chips',
        options: [],
        forcePriceValues: ['Type personnalisé'],
        optionsFilter: {
          field: 'type',
          optionsByValue: {
            'Marque-page calendrier': _calMpFormatsMarquepage,
            'Calendrier de poche': _calMpFormatsPoche,
            'Type personnalisé': _calMpFormatsAll,
          },
        },
        note: 'Min 50 ex — formats triés par surface — Offset interdit',
      },
      {
        key: 'longueur',
        label: 'Longueur L (mm)',
        type: 'number',
        min: 30,
        suffix: 'mm',
        showWhen: { field: 'format', values: ['Format personnalisé'] },
      },
      {
        key: 'largeur',
        label: 'Largeur l (mm)',
        type: 'number',
        min: 30,
        suffix: 'mm',
        showWhen: { field: 'format', values: ['Format personnalisé'] },
      }],
    },
    {
      title: 'Support papier — Matière & Grammage',
      icon: '📃',
      layout: 'grid-2',
      fields: [
        {
          key: 'matiere',
          label: 'Matière',
          type: 'chips',
          options: _calMpMatieres,
          forcePriceValues: ['Matière personnalisée'],
          note: 'PCB = PCM = Glossy : même prix par grammage — Offset interdit',
        },
        {
          key: 'grammage',
          label: 'Grammage',
          type: 'chips',
          options: [],
          forcePriceValues: ['Autres'],
          customInput: 'grammage',
          optionsFilter: { field: 'matiere', optionsByValue: _calMpWeightsByMatiere },
        },
      ],
    },
    {
      title: 'Face (Impression)',
      icon: '🖨️',
      fields: [{
        key: 'face',
        label: 'Face',
        type: 'chips',
        options: ['Recto seul', 'Recto-verso'],
      }],
    },
    {
      title: 'Impression / Technologie',
      icon: '⚙️',
      fields: [{
        key: 'technologie',
        label: 'Technologie',
        type: 'chips',
        options: _calTechnologieOpts,
        forcePriceValues: ['Autres'],
        optionsFilter: { field: 'matiere', optionsByValue: _calMpTechnoByMatiere },
        note: _calTechnoNote,
      }],
    },
    {
      title: 'Quantité',
      icon: '📦',
      fields: [{
        key: 'qty',
        label: 'Quantité',
        type: 'number',
        min: 50,
        default: 250,
        presets: [50, 100, 250, 500, 1000],
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarque / détails', type: 'textarea' }],
    },
  ],
};

const CAL_CHEVALET: ProductConfig = {
  qtyMin: 50, qtyDefault: 100, qtyPresets: [50, 100, 250, 500],
  prixM2: 20000,
  sections: [
    {
      title: 'Configuration',
      icon: '📆',
      layout: 'grid-3',
      fields: [
        {
          key: 'feuillets',
          label: 'Nombre de feuillets',
          type: 'chips',
          options: ['6', '12', '13', '24', '52'],
          default: '12',
        },
        {
          key: 'format',
          label: 'Format',
          type: 'chips',
          options: ['A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm', 'A4+ — 216×303 mm', 'DL — 99×210 mm', 'Format personnalisé'],
          default: 'A5 — 148×210 mm',
        },
        {
          key: 'longueur',
          label: 'Longueur L (mm)',
          type: 'number',
          min: 50,
          suffix: 'mm',
          showWhen: { field: 'format', values: ['Format personnalisé'] },
        },
        {
          key: 'largeur',
          label: 'Largeur l (mm)',
          type: 'number',
          min: 50,
          suffix: 'mm',
          showWhen: { field: 'format', values: ['Format personnalisé'] },
        },
        {
          key: 'orientation',
          label: 'Orientation',
          type: 'chips',
          options: ['Paysage', 'Portrait'],
        },
      ],
    },
    {
      title: 'Socle — Matière & grammage',
      icon: '📃',
      layout: 'grid-2',
      fields: [
        {
          key: 'matiere',
          label: 'Matière socle',
          type: 'chips',
          options: _calBlancMatieres.filter((m) => m !== 'autres'),
          default: 'PCB',
          forcePriceValues: ['autres'],
        },
        {
          key: 'grammage',
          label: 'Grammage socle',
          type: 'chips',
          options: [],
          forcePriceValues: ['Autres'],
          customInput: 'grammage',
          optionsFilter: { field: 'matiere', optionsByValue: _calBlancWeightsByMatiere },
        },
      ],
    },
    {
      title: 'Feuillets — Matière & grammage',
      icon: '📄',
      layout: 'grid-2',
      fields: [
        {
          key: 'matiere_feuillets',
          label: 'Matière feuillets',
          type: 'chips',
          options: _calFeuilletsMatieres.filter((m) => m !== 'autres'),
          default: 'Offset',
          forcePriceValues: ['autres'],
        },
        {
          key: 'grammage_feuillets',
          label: 'Grammage feuillets',
          type: 'chips',
          options: [],
          default: '135g',
          forcePriceValues: ['Autres'],
          customInput: 'grammage',
          optionsFilter: { field: 'matiere_feuillets', optionsByValue: _calFeuilletsWeightsByMatiere },
        },
      ],
    },
    {
      title: 'Impression',
      icon: '🖨️',
      layout: 'grid-2',
      fields: [
        {
          key: 'face',
          label: 'Face',
          type: 'chips',
          options: ['Recto seul', 'Recto-Verso'],
        },
        {
          key: 'technologie',
          label: 'Technologie',
          type: 'chips',
          options: _calTechnologieOpts,
          forcePriceValues: ['Autres'],
          optionsFilter: { field: 'matiere', optionsByValue: _calTechnologieByMatiere },
          note: _calTechnoNote,
        },
      ],
    },
    {
      title: 'Reliure',
      icon: '🏗️',
      fields: [
        {
          key: 'reliure',
          label: 'Reliure',
          type: 'chips',
          options: ['Spirale métallique', 'Spirale plastique', 'Collé', 'Reliure personnalisée'],
          default: 'Spirale plastique',
          forcePriceValues: ['Reliure personnalisée'],
        },
      ],
    },
    {
      title: 'Quantité',
      icon: '📦',
      fields: [{
        key: 'qty',
        label: 'Quantité',
        type: 'number',
        min: 50,
        default: 100,
        presets: [50, 100, 250, 500],
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarque / détails', type: 'textarea' }],
    },
  ],
};

const CAL_SOUSMAIN: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25, 50, 100, 250, 500],
  prixM2: 17500,
  sections: [
    { title: 'Type de sous-main', icon: '📅', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: [
        'Sous-main bureau 52 feuillets', 'Sous-main bureau 12 feuillets',
        'Sous-main publicitaire', 'Sous-main personnalisé',
      ], default: 'Sous-main bureau 52 feuillets', forcePriceValues: ['Sous-main personnalisé'] },
    ]},
    { title: 'Format', icon: '📐', layout: 'grid-3', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: [
        'A4 — 210×297 mm', 'A4+ — 216×303 mm', 'A3 — 297×420 mm', 'Format personnalisé',
      ], default: 'A4 — 210×297 mm' },
      { key: 'longueur', label: 'Longueur L (mm)', type: 'number', min: 100, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'largeur', label: 'Largeur l (mm)', type: 'number', min: 100, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    {
      title: 'Support — Matière & grammage',
      icon: '📃',
      layout: 'grid-2',
      fields: [
        { key: 'matiere', label: 'Matière support', type: 'chips', options: _calPlateauMatieres, default: 'PCB' },
        { key: 'grammage', label: 'Grammage support', type: 'chips', options: [], optionsFilter: { field: 'matiere', optionsByValue: _calPlateauWeightsByMatiere } },
      ],
    },
    { title: 'Nombre de feuillets', icon: '📊', fields: [
      { key: 'feuillets', label: 'Feuillets', type: 'chips', options: ['12', '24', '52'], default: '52' },
    ]},
    {
      title: 'Feuillets — Matière & grammage',
      icon: '📄',
      layout: 'grid-2',
      fields: [
        { key: 'matiere_feuillets', label: 'Matière feuillets', type: 'chips', options: ['Offset', 'PCB', 'PCM'], default: 'Offset' },
        { key: 'grammage_feuillets', label: 'Grammage feuillets', type: 'chips', options: _calFeuilletsThinGrammages, default: '135g' },
      ],
    },
    { title: 'Impression', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto seul', 'Recto-verso'], default: 'Recto seul' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25, 50, 100, 250, 500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

/** Chevalet de table simple — sans type / socle / reliure */
const _calChevaletTableGrammages = [
  '250g', '300g', '350g', '600g', '900g', 'Autres',
];
const _calChevaletTableWeightsByMatiere: Record<string, string[]> = {
  PCB: _calChevaletTableGrammages.filter((g) => g !== 'Autres'),
  PCM: _calChevaletTableGrammages.filter((g) => g !== 'Autres'),
  Glossy: ['250g', '300g', '600g', 'Autres'],
  Bristol: ['250g', '300g', '350g', 'Autres'],
  'Papier recyclé épais': ['250g', '300g', '350g', 'Autres'],
  autres: _calChevaletTableGrammages,
};

const CAL_CHEVALET_TABLE: ProductConfig = {
  qtyMin: 50, qtyDefault: 100, qtyPresets: [50, 100, 250, 500],
  prixM2: 22000,
  sections: [
    {
      title: 'Forme',
      icon: '🔷',
      fields: [{
        key: 'forme',
        label: 'Forme',
        type: 'chips',
        options: ['Chevalet plat', 'Cube', 'Pyramide', 'Cylindre', 'Prisme', 'Toblerone'],
        default: 'Chevalet plat',
        note: 'Formes 3D réservées au chevalet de table — pas au calendrier bureau',
      }],
    },
    {
      title: 'Format & orientation',
      icon: '📐',
      layout: 'grid-2',
      showWhen: { field: 'forme', values: ['Chevalet plat'] },
      fields: [
        {
          key: 'format',
          label: 'Format',
          type: 'chips',
          options: [
            'A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm',
            'A4+ — 216×303 mm', 'A3 — 297×420 mm', 'DL — 99×210 mm', 'Format personnalisé',
          ],
          default: 'A5 — 148×210 mm',
        },
        {
          key: 'longueur',
          label: 'Longueur L (mm)',
          type: 'number',
          min: 50,
          suffix: 'mm',
          showWhen: { field: 'format', values: ['Format personnalisé'] },
        },
        {
          key: 'largeur',
          label: 'Largeur l (mm)',
          type: 'number',
          min: 50,
          suffix: 'mm',
          showWhen: { field: 'format', values: ['Format personnalisé'] },
        },
        {
          key: 'orientation',
          label: 'Orientation',
          type: 'chips',
          options: ['Paysage', 'Portrait'],
        },
      ],
    },
    {
      title: 'Dimensions 3D (mm)',
      icon: '📐',
      layout: 'grid-3',
      showWhen: { field: 'forme', values: ['Cube', 'Pyramide', 'Cylindre', 'Prisme', 'Toblerone'] },
      fields: [
        { key: 'longueur', label: 'Longueur L', type: 'number', min: 20, suffix: 'mm' },
        { key: 'largeur', label: 'Largeur l', type: 'number', min: 20, suffix: 'mm' },
        { key: 'hauteur', label: 'Hauteur H', type: 'number', min: 20, suffix: 'mm' },
      ],
    },
    {
      title: 'Matériaux — Type de papier',
      icon: '📃',
      layout: 'grid-2',
      fields: [
        {
          key: 'matiere',
          label: 'Matière',
          type: 'chips',
          options: _calBlancMatieres,
          forcePriceValues: ['autres'],
        },
        {
          key: 'grammage',
          label: 'Grammage',
          type: 'chips',
          options: [],
          forcePriceValues: ['Autres'],
          customInput: 'grammage',
          optionsFilter: { field: 'matiere', optionsByValue: _calChevaletTableWeightsByMatiere },
        },
      ],
    },
    {
      title: 'Impression',
      icon: '🖨️',
      layout: 'grid-2',
      fields: [
        {
          key: 'face',
          label: 'Face',
          type: 'chips',
          options: ['Recto seul', 'Recto-Verso'],
        },
        {
          key: 'technologie',
          label: 'Technologie',
          type: 'chips',
          options: _calTechnologieOpts,
          forcePriceValues: ['Autres'],
          optionsFilter: { field: 'matiere', optionsByValue: _calTechnologieByMatiere },
          note: _calTechnoNote,
        },
      ],
    },
    {
      title: 'Quantité',
      icon: '📦',
      fields: [{
        key: 'qty',
        label: 'Quantité',
        type: 'number',
        min: 50,
        default: 100,
        presets: [50, 100, 250, 500],
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarque / détails', type: 'textarea' }],
    },
  ],
};

const CAL_MURAL: ProductConfig = {
  qtyMin: 50, qtyDefault: 100, qtyPresets: [50, 100, 250, 500, 1000],
  prixM2: 19000,
  posBanner: 'Calendrier mural avec crochet',
  sections: [
    {
      title: 'Format',
      icon: '📐',
      layout: 'grid-3',
      fields: [{
        key: 'format',
        label: 'Format',
        type: 'chips',
        options: [
          'A4 — 210×297 mm', 'A4+ — 216×303 mm', 'A3 — 297×420 mm',
          'A3+ — 320×450 mm', 'A2 — 420×594 mm', 'Format personnalisé',
        ],
        default: 'A3 — 297×420 mm',
        note: 'Min 50 ex — formats triés A4 → A2 — A3+ remplace SRA3',
      },
      {
        key: 'longueur',
        label: 'Longueur L (mm)',
        type: 'number',
        min: 100,
        suffix: 'mm',
        showWhen: { field: 'format', values: ['Format personnalisé'] },
      },
      {
        key: 'largeur',
        label: 'Largeur l (mm)',
        type: 'number',
        min: 100,
        suffix: 'mm',
        showWhen: { field: 'format', values: ['Format personnalisé'] },
      }],
    },
    {
      title: 'Nombre de feuillets',
      icon: '📊',
      fields: [
        {
          key: 'feuillets',
          label: 'Feuillets',
          type: 'chips',
          options: ['6', '7', '12', '13', '24', '52', 'Autres'],
          default: '12',
        },
        {
          key: 'feuillets_custom',
          label: 'Nombre de feuillets personnalisé',
          type: 'number',
          min: 1,
          max: 366,
          showWhen: { field: 'feuillets', values: ['Autres'] },
        },
      ],
    },
    {
      title: 'Matière / Grammage',
      icon: '📃',
      layout: 'grid-2',
      fields: [
        {
          key: 'matiere',
          label: 'Matière',
          type: 'chips',
          options: _calMuralMatieres.filter((m) => m !== 'autres'),
          default: 'PCB',
          forcePriceValues: ['autres'],
        },
        {
          key: 'grammage',
          label: 'Grammage',
          type: 'chips',
          options: [],
          forcePriceValues: ['Autres'],
          customInput: 'grammage',
          optionsFilter: { field: 'matiere', optionsByValue: _calMuralWeightsByMatiere },
        },
      ],
    },
    {
      title: 'Impression & finition',
      icon: '🖨️',
      layout: 'grid-3',
      fields: [
        {
          key: 'face',
          label: 'Face',
          type: 'chips',
          options: ['Recto seul', 'Recto-Verso'],
        },
        {
          key: 'technologie',
          label: 'Technologie',
          type: 'chips',
          options: _calTechnologieOpts,
          forcePriceValues: ['Autres'],
          optionsFilter: { field: 'matiere', optionsByValue: _calTechnologieByMatiere },
          note: _calTechnoNote,
        },
        {
          key: 'finition',
          label: 'Finition',
          type: 'chips',
          options: ['Sans finition', 'Pelliculage Mat', 'Pelliculage Brillant', 'Coins arrondis'],
        },
      ],
    },
    {
      title: 'Reliure',
      icon: '🔗',
      fields: [
        { key: 'reliure', label: 'Reliure / spirale', type: 'chips', options: ['Spirale métallique', 'Spirale plastique', 'Sans reliure'], default: 'Spirale plastique' },
      ],
    },
    {
      title: 'Quantité',
      icon: '📦',
      fields: [{
        key: 'qty',
        label: 'Quantité',
        type: 'number',
        min: 50,
        default: 100,
        presets: [50, 100, 250, 500, 1000],
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarque / détails', type: 'textarea' }],
    },
  ],
};



export {
  CAL_PLATEAUX,
  CAL_MARQUEPAGE,
  CAL_CHEVALET,
  CAL_SOUSMAIN,
  CAL_CHEVALET_TABLE,
  CAL_MURAL,
};
