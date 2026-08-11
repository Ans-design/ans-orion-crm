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
  PRESENTOIR_MAGASIN_FORMAT_OPTIONS,
  ORIFLAMME_TYPES,
  oriflammeHauteursOptionsByType,
  ORIFLAMME_MATIERES,
  ORIFLAMME_BASES,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// PLV — PUBLICITÉ SUR LIEU DE VENTE
// ═══════════════════════════════════════════════════════════════

const _plvStructureThickness: Record<string, string[]> = {
  'Carton ondulé': ['E flute (~1,5 mm)', 'B flute (~3 mm)', 'EB double (~4 mm)', 'Épaisseur personnalisée'],
  'Carton compact': ['1 mm', '1,5 mm', '2 mm', 'Épaisseur personnalisée'],
  'PVC rigide': ['2 mm', '3 mm', '5 mm', '10 mm', '20 mm', 'Épaisseur personnalisée'],
  'PVC 20 mm': ['20 mm', 'Épaisseur personnalisée'],
  'Plexiglass': ['3 mm', '5 mm', '8 mm', 'Épaisseur personnalisée'],
  'Forex': ['3 mm', '5 mm', '10 mm', 'Épaisseur personnalisée'],
  'Métal': ['0,8 mm', '1 mm', '1,5 mm', 'Épaisseur personnalisée'],
  'Tôle acier métallique local': ['0,8 mm', '1 mm', '1,5 mm', 'Épaisseur personnalisée'],
  'Tôle / acier métallique local': ['0,8 mm', '1 mm', '1,5 mm', 'Épaisseur personnalisée'],
  'Mixte': ['Épaisseur personnalisée'],
  'Matière personnalisée': ['Épaisseur personnalisée'],
};

const _plvChevaletMatieres = ['Plexiglass', 'Carton compact', 'PVC rigide', 'Forex', 'Matière personnalisée'] as const;
const _plvChevaletThickness = {
  Plexiglass: ['3 mm', '5 mm', '8 mm'],
  'Carton compact': ['1,5 mm', '2 mm'],
  'PVC rigide': ['3 mm', '5 mm', '10 mm'],
  Forex: ['3 mm', '5 mm'],
  'Matière personnalisée': ['Épaisseur personnalisée'],
};

const PLV_CHEVALET: ProductConfig = {
  qtyMin: 1, qtyDefault: 5, qtyPresets: [1, 2, 5, 10, 25],
  sections: [
    { title: 'Type de chevalet', icon: '🖼️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Chevalet de table', 'Chevalet carton stop-rayon', 'Chevalet PVC', 'Chevalet personnalisé'], default: 'Chevalet de table', forcePriceValues: ['Chevalet personnalisé'], note: 'Chevalet de table : support Plexiglass / acrylique transparent' },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm', 'A3 — 297×420 mm', '100×150 mm', 'Format personnalisé'], default: 'A5 — 148×210 mm' },
      { key: 'longueur', label: 'Longueur L (mm)', type: 'number', min: 50, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'largeur', label: 'Largeur l (mm)', type: 'number', min: 50, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    { title: 'Matière & épaisseur', icon: '🧵', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: [..._plvChevaletMatieres], default: 'Plexiglass', forcePriceValues: ['Matière personnalisée'] },
      { key: 'epaisseur', label: 'Épaisseur', type: 'chips', options: [], optionsFilter: { field: 'matiere', optionsByValue: _plvChevaletThickness }, forcePriceValues: ['Épaisseur personnalisée'] },
    ]},
    { title: 'Impression & finition', icon: '🖨️', layout: 'grid-2', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto', 'Recto-verso'], default: 'Recto' },
      { key: 'finition', label: 'Finition', type: 'chips', options: ['Sans finition', 'Pelliculé', 'Vernis UV'], default: 'Sans finition' },
      { key: 'decoupe', label: 'Découpe', type: 'chips', options: ['Standard', 'Découpe spéciale'], default: 'Standard' },
      { key: 'rainage', label: 'Rainage', type: 'chips', options: ['Non', 'Oui'], default: 'Non' },
      { key: 'collage', label: 'Collage', type: 'chips', options: ['Non', 'Oui'], default: 'Non' },
    ]},
    { title: 'Structure', icon: '🏗️', fields: [
      { key: 'structure', label: 'Structure', type: 'chips', options: ['Standard', 'Renforcée'], default: 'Standard' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 5, presets: [1, 2, 5, 10, 25] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

const PLV_ROLLUP: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1,2,3,5,10],
  sections: [
    { title: 'Type de roll-up', icon: '🪧', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Roll-up standard','Roll-up deluxe / premium','Roll-up mini'], default: 'Roll-up standard' },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: [], optionsFilter: { field: 'type', optionsByValue: _rollupFormatsByType } },
    ]},
    { title: 'Matière & grammage', icon: '🧵', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: _rollupBannerMatieres, default: 'Bâche' },
      { key: 'grammage', label: 'Grammage', type: 'chips', options: [], optionsFilter: { field: 'matiere', optionsByValue: _rollupBannerWeightsByMatiere } },
    ]},
    { title: 'Structure', icon: '🏗️', fields: [
      { key: 'structure', label: 'Structure', type: 'chips', options: ['Aluminium standard','Aluminium large','Structure premium'], default: 'Aluminium standard' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1,2,3,5,10] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const PLV_XBANNER: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1,2,3,5,10],
  sections: [
    { title: 'Type de X-Banner', icon: '✖️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['X-Banner standard','X-Banner mini'], default: 'X-Banner standard' },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: [], optionsFilter: { field: 'type', optionsByValue: _xbannerFormatsByType } },
    ]},
    { title: 'Matière & grammage', icon: '🧵', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: _rollupBannerMatieres, default: 'Bâche' },
      { key: 'grammage', label: 'Grammage', type: 'chips', options: [], optionsFilter: { field: 'matiere', optionsByValue: _rollupBannerWeightsByMatiere } },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1,2,3,5,10] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const PLV_PORTEFLYERS: ProductConfig = {
  qtyMin: 1, qtyDefault: 5, qtyPresets: [1,2,5,10,25],
  sections: [
    { title: 'Type de porte-flyers', icon: '📄', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Porte-flyers comptoir','Porte-flyers mural','Porte-flyers sur pied','Porte-flyers multi-cases','Porte-brochures carton','Porte-flyers personnalisé'], default: 'Porte-flyers comptoir', forcePriceValues: ['Porte-flyers personnalisé'] },
    ]},
    { title: 'Format accepté', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm', 'DL — 99×210 mm', 'Format personnalisé'], default: 'A5 — 148×210 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Nombre de compartiments', icon: '📊', fields: [
      { key: 'compartiments', label: 'Compartiments', type: 'chips', options: ['1','2','3','4','6','8','Personnalisé'], default: '1', forcePriceValues: ['Personnalisé'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 5, presets: [1,2,5,10,25] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const PLV_PORTEAFFICHE: ProductConfig = {
  qtyMin: 1, qtyDefault: 5, qtyPresets: [1, 2, 5, 10, 25],
  sections: [
    { title: 'Type de porte-affiche', icon: '🖼️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Porte-affiche mural', 'Porte-affiche sur pied', 'Porte-affiche suspendu', 'Cadre clippant', 'Fronton + étagères', 'Porte-affiche personnalisé'], default: 'Porte-affiche mural', forcePriceValues: ['Porte-affiche personnalisé'] },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['A4 — 210×297 mm', 'A3 — 297×420 mm', 'A2 — 420×594 mm', 'A1 — 594×841 mm', 'Format personnalisé'], default: 'A3 — 297×420 mm' },
      { key: 'longueur', label: 'Longueur L (mm)', type: 'number', min: 100, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'largeur', label: 'Largeur l (mm)', type: 'number', min: 100, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    { title: 'Support & matière', icon: '🧵', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['PVC rigide', 'Forex', 'Plexiglass', 'Dibond / Alu', 'Carton compact', 'Matière personnalisée'], default: 'PVC rigide', forcePriceValues: ['Matière personnalisée'] },
      { key: 'epaisseur', label: 'Épaisseur', type: 'chips', options: [], optionsFilter: { field: 'matiere', optionsByValue: _plvStructureThickness }, forcePriceValues: ['Épaisseur personnalisée'] },
    ]},
    { title: 'Impression & finition', icon: '🖨️', layout: 'grid-2', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto', 'Recto-verso'], default: 'Recto' },
      { key: 'finition', label: 'Finition', type: 'chips', options: ['Sans finition', 'Pelliculé', 'Vernis UV'], default: 'Sans finition' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 5, presets: [1, 2, 5, 10, 25] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

const PLV_PRESENTOIR_SOL: ProductConfig = {
  qtyMin: 1, qtyDefault: 5, qtyPresets: [1, 2, 5, 10, 25],
  sections: [
    { title: 'Type de présentoir', icon: '🚧', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Stop-trottoir A', 'Stop-trottoir cadre clippant', 'Stop-trottoir à ressort', 'Totem de sol', 'Présentoir sol personnalisé'], default: 'Stop-trottoir A', forcePriceValues: ['Présentoir sol personnalisé'] },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['A2 — 420×594 mm', 'A1 — 594×841 mm', 'A0 — 841×1189 mm', '60×90 cm', 'Format personnalisé'], default: 'A1 — 594×841 mm' },
      { key: 'longueur', label: 'Longueur L (mm)', type: 'number', min: 200, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'largeur', label: 'Largeur l (mm)', type: 'number', min: 200, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    { title: 'Face', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Simple face', 'Double face'], default: 'Double face' },
    ]},
    { title: 'Support visuel', icon: '🧵', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière support', type: 'chips', options: ['PVC rigide', 'PVC 20 mm', 'Forex', 'Plexiglass', 'Vinyle', 'Bâche', 'Dibond / Alu', 'Tôle acier métallique local', 'Matière personnalisée'], default: 'PVC rigide', forcePriceValues: ['Matière personnalisée'] },
      { key: 'epaisseur', label: 'Épaisseur', type: 'chips', options: [], forcePriceValues: ['Épaisseur personnalisée'], optionsFilter: { field: 'matiere', optionsByValue: {
        'PVC rigide': ['3 mm', '5 mm', '10 mm', 'Épaisseur personnalisée'],
        'PVC 20 mm': ['20 mm', 'Épaisseur personnalisée'],
        'Forex': ['3 mm', '5 mm', '10 mm', 'Épaisseur personnalisée'],
        'Plexiglass': ['3 mm', '5 mm', '8 mm', 'Épaisseur personnalisée'],
        'Vinyle': ['Adhésif cast', 'Adhésif monomère', 'Épaisseur personnalisée'],
        'Bâche': ['440 g', '510 g', 'Épaisseur personnalisée'],
        'Dibond / Alu': ['3 mm', '4 mm', 'Épaisseur personnalisée'],
        'Tôle acier métallique local': ['0,8 mm', '1 mm', '1,5 mm', 'Épaisseur personnalisée'],
        'Matière personnalisée': ['Épaisseur personnalisée'],
      } } },
    ]},
    { title: 'Finition', icon: '✨', fields: [
      { key: 'finition', label: 'Finition', type: 'chips', options: ['Sans finition', 'Pelliculé', 'Vernis UV'], default: 'Sans finition' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 5, presets: [1, 2, 5, 10, 25] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

const PLV_PRESENTOIR_MAGASIN: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1, 2, 3, 5, 10],
  sections: [
    { title: 'Type de présentoir', icon: '🏪', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Comptoir / Escalier', 'Colonne tournante', 'Box palette / Bac de sol', 'Présentoir sur mesure'], default: 'Comptoir / Escalier', forcePriceValues: ['Présentoir sur mesure'] },
    ]},
    { title: 'Format / dimensions', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: [...PRESENTOIR_MAGASIN_FORMAT_OPTIONS], default: 'Présentoir comptoir', note: 'Dimensions standards affichées sous chaque format — modifiables ci-dessous.' },
      { key: 'largeur_mm', label: 'Largeur (mm)', type: 'number', min: 100, suffix: 'mm' },
      { key: 'hauteur_mm', label: 'Hauteur (mm)', type: 'number', min: 100, suffix: 'mm' },
      { key: 'profondeur_mm', label: 'Profondeur (mm)', type: 'number', min: 50, suffix: 'mm' },
      { key: 'longueur', label: 'Longueur L (mm)', type: 'number', min: 100, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'largeur', label: 'Largeur l (mm)', type: 'number', min: 100, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'profondeur', label: 'Profondeur P (mm)', type: 'number', min: 50, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    { title: 'Structure', icon: '🏗️', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière structure', type: 'chips', options: ['Carton ondulé', 'Carton compact', 'PVC rigide', 'PVC 20 mm', 'Plexiglass', 'Forex', 'Métal', 'Mixte', 'Matière personnalisée'], default: 'Carton ondulé', forcePriceValues: ['Matière personnalisée'] },
      { key: 'epaisseur', label: 'Épaisseur', type: 'chips', options: [], forcePriceValues: ['Épaisseur personnalisée'], optionsFilter: { field: 'matiere', optionsByValue: _plvStructureThickness } },
    ]},
    { title: 'Impression & finition', icon: '🖨️', layout: 'grid-2', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto', 'Recto-verso'], default: 'Recto' },
      { key: 'finition', label: 'Finition', type: 'chips', options: ['Sans finition', 'Pelliculé', 'Vernis UV'], default: 'Sans finition' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1, 2, 3, 5, 10] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

const PLV_ORIFLAMME: ProductConfig = {
  qtyMin: 1, qtyDefault: 2, qtyPresets: [1,2,3,5,10],
  sections: [
    { title: 'Type d\'oriflamme', icon: '🚩', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: [...ORIFLAMME_TYPES], default: 'Oriflamme goutte' },
    ]},
    { title: 'Hauteur du support', icon: '📏', fields: [
      {
        key: 'hauteur',
        label: 'Hauteur totale montée',
        type: 'chips',
        options: [],
        optionsFilter: { field: 'type', optionsByValue: oriflammeHauteursOptionsByType() },
        note: 'Hauteur totale montée (structure complète). Sous chaque taille : largeur × hauteur voile (L × H) avec référence fabricant.',
      },
    ]},
    { title: 'Matière voile', icon: '🧵', fields: [
      {
        key: 'tissu',
        label: 'Matière tissu',
        type: 'chips',
        options: [...ORIFLAMME_MATIERES],
        default: 'Tissu drapeau polyester 110 g/m² M1',
        forcePriceValues: ['Matière personnalisée'],
      },
    ]},
    { title: 'Base / pied', icon: '🏗️', fields: [
      {
        key: 'base',
        label: 'Base',
        type: 'chips',
        options: [...ORIFLAMME_BASES],
        default: 'Base locale avec ciment',
        forcePriceValues: ['Base personnalisée'],
      },
    ]},
    { title: 'Face', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Simple face','Double face (impression recto-verso)'], default: 'Simple face' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 2, presets: [1,2,3,5,10] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};



export {
  PLV_CHEVALET,
  PLV_ROLLUP,
  PLV_XBANNER,
  PLV_PORTEFLYERS,
  PLV_PORTEAFFICHE,
  PLV_PRESENTOIR_SOL,
  PLV_PRESENTOIR_MAGASIN,
  PLV_ORIFLAMME,
};
