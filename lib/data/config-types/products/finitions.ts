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
  FACONNAGE_RELIURE_OPTIONS,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// FINITIONS
// ═══════════════════════════════════════════════════════════════

function _finitionConfig(label: string, icon: string, types: string[], options?: ConfigSection[]): ProductConfig {
  return {
    qtyMin: 1, qtyDefault: 100, qtyPresets: [1,10,25,50,100,250,500,1000],
    sections: [
      { title: `Type de ${label.toLowerCase()}`, icon, fields: [
        { key: 'type', label: 'Type', type: 'chips', options: types, forcePriceValues: types.filter(t => t.toLowerCase().includes('personnalisé')) },
      ]},
      ...(options || []),
      { title: 'Quantité', icon: '📦', fields: [
        { key: 'qty', label: 'Quantité', type: 'number', min: 1, presets: [1,10,25,50,100,250,500,1000] },
      ]},
      { title: 'Remarque / détails', icon: '📝', fields: [
        { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
      ]},
    ]
  };
}

const FIN_PELLICULAGE = _finitionConfig('Pelliculage', '✨',
  ['Mat', 'Brillant', 'Soft touch', 'Pelliculage personnalisé'],
  [
    { title: 'Procédé', icon: '🔥', fields: [{ key: 'sous_type', label: 'Procédé', type: 'chips', options: ['Pelliculage à chaud', 'Pelliculage à froid'], forcePriceValues: [], note: 'Mat : à chaud uniquement. Brillant : à chaud ou à froid.' }] },
    { title: 'Dimension support', icon: '📐', fields: [{ key: 'dim', label: 'Format', type: 'chips', options: ['A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm', 'A3 — 297×420 mm', 'A3+ — 320×450 mm', 'Format personnalisé'], forcePriceValues: ['Format personnalisé'] }] },
    { title: 'Face', icon: '🖨️', fields: [{ key: 'face', label: 'Face', type: 'chips', options: ['Recto', 'Recto-Verso'], forcePriceValues: [] }]},
  ]
);

const FIN_VERNIS = _finitionConfig('Vernis', '💎',
  ['Mat', 'Brillant', 'Vernis personnalisé'],
  [
    { title: 'Dimension support', icon: '📐', fields: [{ key: 'dim', label: 'Format', type: 'chips', options: ['A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm', 'A3 — 297×420 mm', 'A2 — 420×594 mm', 'A1 — 594×841 mm', 'A0 — 841×1189 mm'], forcePriceValues: [] }] },
    { title: 'Face', icon: '🖨️', fields: [{ key: 'face', label: 'Face', type: 'chips', options: ['Recto', 'Recto-Verso'], forcePriceValues: [] }]},
  ]
);

const FIN_RAINAGE: ProductConfig = {
  qtyMin: 1, qtyDefault: 100, qtyPresets: [1, 10, 25, 50, 100, 250, 500, 1000],
  sections: [
    { title: 'Type', icon: '📂', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Rainage simple', 'Pliage simple', 'Double pli', 'Triple pli', 'Accordéon', 'Roulé', 'Autre'], forcePriceValues: ['Autre'] },
    ]},
    { title: 'Nombre de plis', icon: '📂', fields: [
      { key: 'plis', label: 'Plis', type: 'chips', options: ['1 pli', '2 plis', '3 plis', '4 plis'], forcePriceValues: [] },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'dim', label: 'Format', type: 'chips', options: ['A5 — 148×210 mm', 'A4 — 210×297 mm', 'A3 — 297×420 mm'], default: 'A4 — 210×297 mm', forcePriceValues: [] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, presets: [1, 10, 25, 50, 100, 250, 500, 1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

const FIN_PLASTIFICATION: ProductConfig = {
  qtyMin: 1, qtyDefault: 100, qtyPresets: [1, 10, 25, 50, 100, 250, 500, 1000],
  sections: [
    { title: 'Dimension support', icon: '📐', fields: [
      { key: 'dim', label: 'Format', type: 'chips', options: ['A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm', 'A3 — 297×420 mm', 'Format personnalisé'], forcePriceValues: ['Format personnalisé'], note: 'Application automatique sur 2 faces (Recto-Verso).' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, presets: [1, 10, 25, 50, 100, 250, 500, 1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

const FIN_COLLAGE: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1, 10, 25, 50, 100, 250, 500],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'dim', label: 'Format', type: 'chips', options: ['A5 — 148×210 mm', 'A4 — 210×297 mm', 'A3 — 297×420 mm', 'Format personnalisé'], default: 'A4 — 210×297 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Type de collage', icon: '📎', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Collage simple', 'Contre-collage', 'Autre'], default: 'Collage simple', forcePriceValues: ['Autre'], note: 'Dos carré = module Reliure (pas collage).' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, presets: [1, 10, 25, 50, 100, 250, 500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

const FIN_RELIURE = _finitionConfig('Reliure spirale', '📎',
  [...FACONNAGE_RELIURE_OPTIONS],
  [
    { title: 'Diamètre / référence', icon: '🔘', fields: [
      {
        key: 'diametre',
        label: 'Diamètre',
        type: 'chips',
        options: [
          '6 mm / 1/4"',
          '8 mm / 5/16"',
          '10 mm / 3/8"',
          '12 mm / 7/16"',
          '14 mm / 9/16"',
          '16 mm / 5/8"',
          '18 mm / 3/4"',
        ],
        note: 'Ou calcul auto selon pages + grammage. Prix selon tableau Admin Finitions.',
      },
    ]},
    { title: 'Volume du document', icon: '📄', fields: [
      {
        key: 'nb_pages',
        label: 'Nombre de pages du document',
        type: 'number',
        min: 4,
        default: 32,
        note: 'Feuilles physiques calculées selon le mode d\'impression (voir ci-dessous).',
      },
    ]},
    { title: 'Mode impression', icon: '🖨️', fields: [
      { key: 'face', label: 'Impression', type: 'chips', options: ['Recto', 'Recto-Verso'], default: 'Recto-Verso', forcePriceValues: [] },
    ]},
    { title: 'Grammage papier', icon: '📃', fields: [
      { key: 'grammage', label: 'Grammage', type: 'chips', options: ['80g', '100g', '120g', '170g', '250g', '300g', 'Grammage personnalisé'], default: '80g', forcePriceValues: ['Grammage personnalisé'], note: 'Grammage intérieur du document à relier.' },
    ]},
  ]
);

const FIN_DECOUPE = _finitionConfig('Découpe', '✂️',
  [
    'Découpe droite',
    'Découpe finition (Flex)',
    'Découpe Autocollant couleur',
    'Autocollant imprimé',
    'Découpe photobooth PVC/Plexi',
    'Découpe personnalisée',
  ],
  [
    { title: 'Unité de facturation', icon: '📏', fields: [
      { key: 'unite_facture', label: 'Unité', type: 'chips', options: ['Pièce', 'm²', 'Mètre linéaire'], default: 'Pièce', note: 'Coins arrondis = article Finitions séparé (fin-coins).' },
    ]},
    { title: 'Laize', icon: '📏', fields: [{ key: 'laize', label: 'Laize (cm)', type: 'number', min: 0, forcePriceValues: [] }] },
    { title: 'Longueur', icon: '📏', fields: [{ key: 'longueur', label: 'Longueur (cm)', type: 'number', min: 0, forcePriceValues: [] }]},
  ]
);

const FIN_PERFORATION = _finitionConfig('Perforation', '🔘',
  ['Perforation 1 trou', 'Perforation 2 trous', 'Perforation 4 trous', 'Perforation ligne pointillée', 'Perforation personnalisée']
);

const FIN_COUTURE = _finitionConfig('Couture Oriflammes', '🧵',
  ['Couture simple', 'Couture renforcée (maxi)', 'Couture personnalisée'],
  [
    { title: 'Surface', icon: '📐', fields: [
      { key: 'longueur', label: 'Longueur (m)', type: 'number', min: 0.01, forcePriceValues: [] },
      { key: 'largeur', label: 'Largeur (m)', type: 'number', min: 0.01, forcePriceValues: [] },
    ]},
  ]
);

const FIN_DORURE = _finitionConfig('Dorure', '🌟',
  ['Dorure Or', 'Argenture', 'Dorure Rouge', 'Dorure Bleu', 'Dorure Vert', 'Holographique', 'Dorure personnalisée'],
  [
    { title: 'Complexité / motif', icon: '✨', fields: [{ key: 'complexite', label: 'Complexité', type: 'chips', options: ['Standard', 'Texte', 'Logo', 'Motif de fond'], default: 'Standard', forcePriceValues: [], note: 'Base A4 : 2 000 / 3 000 / 4 000 / 5 000 Ar par face.' }] },
    { title: 'Procédé', icon: '🔥', fields: [{ key: 'procede', label: 'Procédé', type: 'chips', options: ['À chaud', 'À froid', 'UV DTF Dorure'], forcePriceValues: [] }] },
    { title: 'Format', icon: '📐', fields: [{ key: 'dim', label: 'Format', type: 'chips', options: ['A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm', 'A3 — 297×420 mm', 'A2 — 420×594 mm', 'A3+ — 320×450 mm'], forcePriceValues: [], note: 'Format du support à traiter.' }] },
    { title: 'Face d\'application', icon: '🖨️', fields: [{ key: 'face', label: 'Face', type: 'chips', options: ['Recto seul', 'Recto-Verso'], forcePriceValues: [] }] },
  ]
);

const FIN_GAUFRAGE = _finitionConfig('Gaufrage', '🏔️',
  ['Gaufrage (relief)', 'Débossage (creux)', 'Gaufrage + Dorure', 'Embossage aveugle', 'Gaufrage personnalisé'],
  [
    { title: 'Zone du motif', icon: '📍', fields: [{ key: 'zone', label: 'Zone', type: 'chips', options: ['Logo / icône', 'Texte', 'Motif fond', 'Zone libre'], forcePriceValues: [] }]},
    { title: 'Frais cliché', icon: '💰', fields: [{ key: 'cliche', label: 'Frais cliché (Ar)', type: 'number', min: 0, forcePriceValues: [] }]},
  ]
);

const FIN_COINS = _finitionConfig('Coins arrondis', '⬜',
  ['R3 mm', 'R5 mm', 'R8 mm', 'R10 mm', 'R12 mm', 'Rayon personnalisé'],
  [
    { title: 'Sélection des coins', icon: '🔲', fields: [
      { key: 'cornerRounding', label: 'Coins à arrondir', type: 'corner_rounding', required: true },
    ]},
  ]
);

const FIN_AUTOCOLLANT: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1, 10, 25, 50, 100, 250, 500, 1000],
  sections: [
    { title: 'Type de pose autocollant', icon: '🏷️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Pose petit format', 'Pose vinyle grand format', 'Pose personnalisée'], forcePriceValues: ['Pose personnalisée'] },
    ]},
    {
      title: 'Dimensions de pose',
      icon: '📐',
      showWhen: { field: 'type', values: ['Pose vinyle grand format'] },
      fields: [
        { key: 'longueur_pose', label: 'Longueur', type: 'number', min: 0.01, suffix: 'm', note: 'En mètres.' },
        { key: 'largeur_pose', label: 'Largeur / Hauteur', type: 'number', min: 0.01, suffix: 'm' },
      ],
    },
    {
      title: 'Hauteur / accessibilité de pose',
      icon: '🪜',
      showWhen: { field: 'type', values: ['Pose vinyle grand format'] },
      fields: [
        {
          key: 'hauteur_pose',
          label: 'Accessibilité',
          type: 'chips',
          options: ['Moins de 3 m — 10 000 Ar/m²', 'Plus de 3 m — 20 000 Ar/m²'],
          forcePriceValues: [],
        },
      ],
    },
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, presets: [1, 10, 25, 50, 100, 250, 500, 1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

const FIN_AUTRES: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1, 10, 25, 50, 100, 250, 500, 1000],
  sections: [
    { title: 'Description / support', icon: '✏️', fields: [
      { key: 'description', label: 'Description', type: 'textarea', forcePriceValues: [] },
    ]},
    { title: 'Prix unitaire (Ar)', icon: '💰', fields: [
      { key: 'prix_unitaire', label: 'Prix unitaire', type: 'number', min: 0, forcePriceValues: [] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1, 10, 25, 50, 100, 250, 500, 1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};



export {
  FIN_PELLICULAGE,
  FIN_VERNIS,
  FIN_RAINAGE,
  FIN_PLASTIFICATION,
  FIN_COLLAGE,
  FIN_RELIURE,
  FIN_DECOUPE,
  FIN_PERFORATION,
  FIN_COUTURE,
  FIN_DORURE,
  FIN_GAUFRAGE,
  FIN_COINS,
  FIN_AUTOCOLLANT,
  FIN_AUTRES,
};
