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
  CARTERIE_FORMAT_OPTIONS,
  CARTERIE_COINS_OPTIONS,
  CARTE_JEUX_FORMAT_OPTIONS,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// CARTERIE — prix = grille PRIX 2026 (onglet Carte de visite)
// Fallback format perso : ISF feuille ÷ pièces + finitions + découpe
// ═══════════════════════════════════════════════════════════════

const CARTERIE_FINITION_SECTION = {
  title: 'Finitions',
  icon: '✨',
  fields: [
    {
      key: 'pelliculage',
      label: 'Pelliculage',
      type: 'chips' as const,
      options: ['Sans', 'Oui — Mat', 'Oui — Brillant'],
      default: 'Sans',
      required: false,
      note: 'Optionnel — « Sans » par défaut. Bascule sur la colonne pelliculé PRIX 2026 (320G / 370G).',
    },
    {
      key: 'gaufrage',
      label: 'Gaufrage / Débossage',
      type: 'chips' as const,
      options: ['Sans', 'Oui'],
      default: 'Sans',
      required: false,
      note: 'Optionnel — extra hors grille (feuille A4 ÷ pièces).',
    },
    {
      key: 'dorure',
      label: 'Dorure',
      type: 'chips' as const,
      options: ['Sans', 'Oui'],
      default: 'Sans',
      required: false,
    },
    {
      key: 'vernis',
      label: 'Vernis',
      type: 'chips' as const,
      options: ['Sans', 'Oui'],
      default: 'Sans',
      required: false,
    },
    {
      key: 'decoupe',
      label: 'Découpe',
      type: 'chips' as const,
      options: ['Oui — droite (50 Ar/pièce)', 'Sans'],
      default: 'Sans',
      required: false,
      note: 'Optionnel — incluse dans la grille commerciale ; fallback ISF uniquement.',
    },
  ],
};

const CART_VISITE: ProductConfig = {
  qtyMin: 50, qtyDefault: 500, qtyPresets: [50,100,250,500,1000,2500],
  aliases: ['Carte de visite','Business card'],
  // Prix = ISF + imposition + finitions (pas de paliers fixes isolés)
  priceTiers: [],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      {
        key: 'format',
        label: 'Format',
        type: 'chips',
        options: [...CARTERIE_FORMAT_OPTIONS],
        default: '85×55 mm',
        forcePriceValues: ['Format personnalisé'],
        note: '85×55 mm = 10 pièces / A4 (Admin). Prix = grille PRIX 2026 Carte de visite (PCB recto 50–199 = 200 Ar).',
      },
      {
        key: 'format_largeur',
        label: 'Largeur finie (mm)',
        type: 'number',
        min: 1,
        suffix: 'mm',
        note: 'Si format personnalisé',
        showWhen: { field: 'format', values: ['Format personnalisé'] },
      },
      {
        key: 'format_hauteur',
        label: 'Hauteur finie (mm)',
        type: 'number',
        min: 1,
        suffix: 'mm',
        note: 'Si format personnalisé',
        showWhen: { field: 'format', values: ['Format personnalisé'] },
      },
    ]},
    _matiereGrammageSection(
      'Matière & grammage',
      {
        key: 'matiere',
        options: _carteMatieres,
        default: 'PCB',
        note: 'PCB et PCM : mêmes grammages (250–700g). Support ≥ 230g. Tarif = grille Excel Carte de visite.',
      },
      _carteWeightsByType,
    ),
    { title: 'Orientation', icon: '🔄', fields: [
      { key: 'orientation', label: 'Orientation', type: 'chips', options: ['Paysage','Portrait'], default: 'Paysage' },
    ]},
    { title: 'Face', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto','Recto-verso'], default: 'Recto' },
    ]},
    { title: 'Coins', icon: '⬜', fields: [
      { key: 'coins', label: 'Coins', type: 'chips', options: [...CARTERIE_COINS_OPTIONS], default: 'Bord carré' },
    ]},
    CARTERIE_FINITION_SECTION,
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 50, default: 500, presets: [50,100,250,500,1000,2500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const CART_FIDELITE: ProductConfig = {
  qtyMin: 50, qtyDefault: 500, qtyPresets: [50,100,250,500,1000],
  aliases: ['Carte de fidélité','Loyalty card'],
  priceTiers: [],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: [...CARTERIE_FORMAT_OPTIONS], default: '85×55 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    _matiereGrammageSection(
      'Matière & grammage',
      {
        key: 'matiere',
        options: _carteFideliteMatieres,
        default: 'PCB',
        note: 'PCB et PCM : mêmes grammages (250–700g). Support ≥ 250g pour tamponnage (Kraft 230g accepté). PVC interdit.',
      },
      _carteFideliteWeightsByType,
    ),
    { title: 'Face', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto','Recto-verso'], default: 'Recto' },
    ]},
    { title: 'Coins', icon: '⬜', fields: [
      { key: 'coins', label: 'Coins', type: 'chips', options: [...CARTERIE_COINS_OPTIONS], default: 'Bord carré' },
    ]},
    CARTERIE_FINITION_SECTION,
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 50, default: 500, presets: [50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const CART_JEUX: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500],
  priceTiers: [],
  sections: [
    { title: 'Type de jeu de cartes', icon: '🃏', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Jeu 32 cartes','Jeu 52 cartes','Jeu éducatif','Jeu mémoire','Flash cards','Jeu personnalisé'], default: 'Jeu 52 cartes', forcePriceValues: ['Jeu personnalisé'] },
    ]},
    { title: 'Format carte', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: [...CARTE_JEUX_FORMAT_OPTIONS], default: 'Poker — 63×88 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    _matiereGrammageSection(
      'Matière & grammage',
      {
        key: 'matiere',
        options: _carteJeuxMatieres,
        default: 'PCB',
        note: 'Papier épais uniquement (≥ 230g). PVC translucide exclu.',
      },
      _carteWeightsByType,
    ),
    { title: 'Face', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto','Recto-verso'], default: 'Recto-verso' },
    ]},
    CARTERIE_FINITION_SECTION,
    { title: 'Quantité (jeux)', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};



export {
  CART_VISITE,
  CART_FIDELITE,
  CART_JEUX,
};
