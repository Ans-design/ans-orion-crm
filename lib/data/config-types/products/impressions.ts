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
  IMPRESSION_SF_FORMATS,
  IMPRESSION_SF_MATIERE_LABELS,
  IMPRESSION_SF_WEIGHTS_BY_MATIERE,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// IMPRESSIONS & CONCEPTION GRAPHIQUE
// ═══════════════════════════════════════════════════════════════

const _impressionSfFormats = [...IMPRESSION_SF_FORMATS];
const _impressionSfMatieres = [...IMPRESSION_SF_MATIERE_LABELS];
const _impressionSfWeights = IMPRESSION_SF_WEIGHTS_BY_MATIERE;

const IMP_IMPRESSION: ProductConfig = {
  qtyMin: 1, qtyDefault: 100, qtyPresets: [1,10,25,50,100,250,500,1000],
  aliases: ['Impression numérique','Impression offset','Impression laser','Impression sans finition'],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _impressionSfFormats, default: 'A4', forcePriceValues: ['Format personnalisé'] },
    ]},
    _matiereGrammageSection(
      'Matière & grammage',
      {
        key: 'matiere',
        options: _impressionSfMatieres,
        default: 'Standard / Offset',
        note: 'Matière avant le type d\'impression. Journal, collant glossy, adhestor, satiné mat et mat (liste Excel 2026).',
      },
      _impressionSfWeights,
    ),
    { title: 'Type d\'impression', icon: '🖨️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Impression numérique couleur','Impression numérique N&B','Impression laser couleur','Impression offset','Photocopie couleur','Photocopie N&B','Impression personnalisée'], default: 'Impression numérique couleur', forcePriceValues: ['Impression personnalisée'] },
    ]},
    { title: 'Face', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto','Recto-verso'], default: 'Recto' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 100, presets: [1,10,25,50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const IMP_CONCEPTION: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1],
  sections: [
    { title: 'Type de prestation', icon: '🎨', fields: [
      { key: 'type', label: 'Prestation', type: 'chips', options: ['Création logo','Charte graphique','Mise en page (flyer/brochure)','Retouche photo','Infographie','Design réseaux sociaux','Conception packaging','Prestation personnalisée'], default: 'Création logo', forcePriceValues: ['Prestation personnalisée'] },
    ]},
    { title: 'Niveau de complexité', icon: '📊', fields: [
      { key: 'complexite', label: 'Complexité', type: 'chips', options: ['Simple','Moyen','Complexe','Sur devis'], default: 'Moyen', forcePriceValues: ['Sur devis'] },
    ]},
    { title: 'Nombre de propositions', icon: '🔄', fields: [
      { key: 'propositions', label: 'Propositions', type: 'chips', options: ['1','2','3','5','Personnalisé'], default: '3', forcePriceValues: ['Personnalisé'] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea', note: 'Décrivez le projet, les couleurs, le style souhaité, les références éventuelles...' },
    ]},
  ]
};


export {
  IMP_IMPRESSION,
  IMP_CONCEPTION,
};
