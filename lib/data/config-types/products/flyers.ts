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
  FLYER_FORMAT_OPTIONS,
  FLYER_VOLET_OPTIONS,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// FLYERS
// ═══════════════════════════════════════════════════════════════

const FLY_FLYER: ProductConfig = {
  qtyMin: 5, qtyDefault: 500, qtyPresets: [5,10,20,25,50,100,250,500,1000,2500,5000],
  aliases: ['Flyer','Tract','Prospectus'],
  // Prix = ISF + pliage (pas de paliers fixes isolés)
  priceTiers: [],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      {
        key: 'format',
        label: 'Format',
        type: 'chips',
        options: [...FLYER_FORMAT_OPTIONS],
        default: 'A5 — 148×210 mm',
        forcePriceValues: ['Format personnalisé'],
        note: 'Quantité min. selon format : B5 5 ex · A5 10 ex · DL 15 ex · A6/A4/A3 20 ex · Carré 90 mm 30 ex. Prix = Impression sans finition + pliage.',
      },
    ]},
    { title: 'Plis / volets', icon: '📂', fields: [
      {
        key: 'volets',
        label: 'Nombre de volets',
        type: 'chips',
        options: [...FLYER_VOLET_OPTIONS],
        default: '1 volet (feuille plate)',
        forcePriceValues: ['Personnalisé'],
        note: '1 volet = 0 pli · 3 volets = 2 plis × 100 Ar (A4). Pliage facturé via Finitions rainage.',
      },
    ]},
    _matiereGrammageSection(
      'Matière & grammage',
      {
        key: 'matiere',
        options: _flyerMatieres,
        default: 'PCB',
        note: 'Flyer papier fin — max 300 g. PCB/PCM (90–170 g…) et Glossy (120–180 g…) ont des gammes distinctes. Pas de PVC ni carton rigide.',
      },
      _flyerWeightsByType,
    ),
    { title: 'Face', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto','Recto-verso'], default: 'Recto-verso', note: 'Tarif recto-verso = règle Impression sans finition.' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 5, default: 500, presets: [5,10,20,25,50,100,250,500,1000,2500,5000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};



export {
  FLY_FLYER,
};
