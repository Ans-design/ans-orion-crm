import type { ConfigField, ConfigSection, ProductConfig } from '../types';
import {
  PHOTOBOOK_POS_FORMAT_CHIPS,
  PHOTO_POS_FORMAT_CHIPS,
} from '@/lib/pricing/photo-format-equivalences';
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
// PHOTO
// ═══════════════════════════════════════════════════════════════

const _phPhotobookFormats = [...PHOTOBOOK_POS_FORMAT_CHIPS];

const _phTirageFormats = [...PHOTO_POS_FORMAT_CHIPS];

const PH_TIRAGE: ProductConfig = {
  qtyMin: 1, qtyDefault: 10, qtyPresets: [1,5,10,25,50,100],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _phTirageFormats, default: 'A4 — 210×297 mm' },
    ]},
    { title: 'Type de papier photo', icon: '📃', fields: [
      { key: 'matiere', label: 'Type de papier photo', type: 'chips', options: [
        'Papier photo brillant',
        'Papier photo mat',
        'Papier photo satiné',
        'Papier photo pearl',
        'Papier Fine Art',
        'Photo tissu',
        'Papier personnalisé',
      ], default: 'Papier photo brillant' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 10, presets: [1,5,10,25,50,100] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Type de tirage', icon: '📷', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Tirage photo standard','Tirage photo premium','Tirage grand format','Tirage rétro / vintage','Tirage personnalisé'], default: 'Tirage photo standard' },
    ]},
    { title: 'Finition', icon: '✨', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'finition', label: 'Finition', type: 'chips', options: ['Sans finition','Bord blanc','Sans bord','Coins arrondis','Finition personnalisée'], default: 'Sans bord' },
    ]},
  ]
};

const _phCadreFormats = [...PHOTO_POS_FORMAT_CHIPS];

const PH_CADRE: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1, 5, 10, 25, 50, 100],
  sections: [
    { title: 'Type de cadre', icon: '🖼️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: [
        'Cadre plastique',
        'Cadre bois',
        'Cadre aluminium',
        'Cadre premium',
      ], default: 'Cadre bois' },
    ]},
    { title: 'Format cadre', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _phCadreFormats, default: 'A4 — 210×297 mm' },
    ]},
    { title: 'Couleur cadre', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: [
        { id: 'noir', label: 'Noir', hex: '#1A1A1A' },
        { id: 'blanc', label: 'Blanc', hex: '#FFFFFF' },
        { id: 'bois_naturel', label: 'Bois naturel', hex: '#C4A77D' },
        { id: 'argent', label: 'Argent', hex: '#B0BEC5' },
        { id: 'or', label: 'Or', hex: '#C9A94E' },
      ]},
    ]},
    { title: 'Type papier photo', icon: '📃', fields: [
      { key: 'matiere', label: 'Type papier photo', type: 'chips', options: [
        'Papier photo brillant',
        'Papier photo mat',
        'Papier photo satiné',
        'Papier photo pearl',
        'Papier Fine Art',
        'Papier personnalisé',
      ], default: 'Papier photo brillant' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1, 5, 10, 25, 50, 100] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Verre / protection', icon: '🔲', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'verre', label: 'Protection', type: 'chips', options: ['Verre standard','Verre anti-reflet','Plexiglass','Sans verre','Protection personnalisée'], default: 'Verre standard' },
    ]},
    { title: 'Passe-partout', icon: '⬜', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'passe_partout', label: 'Passe-partout', type: 'chips', options: ['Sans','Blanc','Noir','Crème','Personnalisé'], default: 'Sans' },
    ]},
  ]
};

const PH_PHOTOBOOK: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1,2,5,10,25],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _phPhotobookFormats, default: 'A4 — 210×297 mm' },
    ]},
    { title: 'Nombre de pages', icon: '📄', fields: [
      { key: 'pages', label: 'Pages (recto / face 1)', type: 'chips', options: ['10','20','30','40','50','60','80','100','Personnalisé'], default: '20' },
    ]},
    { title: 'Type couverture', icon: '📗', fields: [
      { key: 'couverture', label: 'Type couverture', type: 'chips', options: [
        'Couverture souple',
        'Couverture rigide',
        'Couverture cuir',
        'Couverture personnalisée',
      ], default: 'Couverture souple' },
    ]},
    { title: 'Papier intérieur', icon: '📃', fields: [
      { key: 'papier', label: 'Papier', type: 'chips', options: ['Photo brillant','Photo mat','Photo satiné','Fine Art','Papier personnalisé'], default: 'Photo brillant' },
    ]},
    { title: 'Quantité de books', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1,2,5,10,25] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Note client', type: 'textarea' },
    ]},
    { title: 'Type de photobook', icon: '📕', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Photobook standard','Photobook premium','Photobook lay-flat','Mini photobook','Photobook personnalisé'], default: 'Photobook standard' },
    ]},
  ]
};



export {
  PH_TIRAGE,
  PH_CADRE,
  PH_PHOTOBOOK,
};
