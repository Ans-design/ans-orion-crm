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
  _goodiesColors,
  _evtLuxeColorPalette,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// ÉVÉNEMENTIEL
// ═══════════════════════════════════════════════════════════════

const EVT_AFFICHE: ProductConfig = {
  qtyMin: 1,
  qtyDefault: 50,
  qtyPresets: [1, 5, 10, 25, 50, 100, 250, 500],
  aliases: ['Affiche événement', 'Affiche évènement', 'Affiche'],
  sections: [
    {
      title: 'Format',
      icon: '📐',
      fields: [
        {
          key: 'format',
          label: 'Format',
          type: 'chips',
          options: ['A4 — 210×297 mm', 'A3 — 297×420 mm', 'A3+ — 320×450 mm', 'A2 — 420×594 mm', 'A1 — 594×841 mm', 'A0 — 841×1189 mm', 'Format personnalisé'],
          forcePriceValues: ['Format personnalisé'],
        },
      ],
    },
    _matiereGrammageSection('Matière & grammage', { key: 'matiere', options: ['PCB', 'PCM', 'Papier photo', 'Dos bleu', 'Offset', 'Matière personnalisée'] }, _evtAfficheWeightsByMatiere),
    {
      title: 'Quantité',
      icon: '📦',
      fields: [
        { key: 'qty', label: 'Quantité', type: 'number', min: 1, presets: [1, 5, 10, 25, 50, 100, 250, 500] },
      ],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [
        { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
      ],
    },
  ],
};

const EVT_CORDON: ProductConfig = {
  qtyMin: 10, qtyDefault: 50, qtyPresets: [10,25,50,100,250,500],
  sections: [
    { title: 'Type de cordon badge', icon: '🎫', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Cordon plat sublimé','Cordon tubulaire','Cordon satin','Cordon personnalisé'], default: 'Cordon plat sublimé', forcePriceValues: ['Cordon personnalisé'] },
    ]},
    { title: 'Largeur', icon: '📏', fields: [
      { key: 'largeur', label: 'Largeur', type: 'chips', options: ['10 mm','15 mm','20 mm','25 mm'], default: '20 mm' },
    ]},
    { title: 'Attache', icon: '🔗', fields: [
      { key: 'attache', label: 'Attache', type: 'chips', options: ['Mousqueton métal','Mousqueton plastique','Crochet','Clip sécurité','Attache personnalisée'], default: 'Mousqueton métal', forcePriceValues: ['Attache personnalisée'] },
    ]},
    { title: 'Couleur', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors.filter(c => c.id !== 'transparent'), forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sublimation','Sérigraphie','Tissé jacquard','DTF','Flex','Technique personnalisée'], default: 'Sublimation', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 10, default: 50, presets: [10,25,50,100,250,500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const EVT_BRACELET: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500,1000],
  sections: [
    { title: 'Type de bracelet', icon: '⌚', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Bracelet Tyvek','Bracelet silicone','Bracelet tissu','Bracelet vinyle','Bracelet personnalisé'], default: 'Bracelet Tyvek', forcePriceValues: ['Bracelet personnalisé'] },
    ]},
    { title: 'Couleur', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors.filter(c => c.id !== 'transparent'), forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Impression standard','Sublimation','Sérigraphie','Tissé','Gravure','Technique personnalisée'], default: 'Impression standard', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Fermeture', icon: '🔒', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'fermeture', label: 'Fermeture', type: 'chips', options: ['Adhésive','Clip plastique','Fermoir métal','Velcro','Fermeture personnalisée'], forcePriceValues: ['Fermeture personnalisée'] },
    ]},
  ]
};

// ── Événements — matières / grammages séparés (validation stock) ──
const _evtCarteMatieres = ['PCB', 'PCM', 'Glossy', 'Texturé', 'Invitation', 'Kraft', 'Matière personnalisée'];
const _evtCarteWeights: Record<string, string[]> = {
  PCB: ['250g', '300g', '350g', '600g', '700g', 'Grammage personnalisé'],
  PCM: ['250g', '300g', '350g', '600g', '700g', 'Grammage personnalisé'],
  Glossy: ['170g', '250g', '300g', 'Grammage personnalisé'],
  Texturé: ['300g', 'Grammage personnalisé'],
  Invitation: ['250g', '300g', 'Grammage personnalisé'],
  Kraft: ['300g', 'Grammage personnalisé'],
  'Matière personnalisée': ['Grammage personnalisé'],
};
const _evtEnveloppeMatieres = ['Offset', 'PCB', 'PCM', 'Kraft', 'Vélin', 'Invitation', 'Papier spécial invitation', 'Matière personnalisée'];
const _evtEnveloppeWeights: Record<string, string[]> = {
  Offset: ['80g', '100g', 'Grammage personnalisé'],
  PCB: ['170g', '250g', '300g', '350g', 'Grammage personnalisé'],
  PCM: ['170g', '250g', '300g', '350g', 'Grammage personnalisé'],
  Kraft: ['120g', '300g', 'Grammage personnalisé'],
  Vélin: ['120g', 'Grammage personnalisé'],
  Invitation: ['250g', '300g', 'Grammage personnalisé'],
  'Papier spécial invitation': ['250g', '300g', '350g', 'Grammage personnalisé'],
  'Matière personnalisée': ['Grammage personnalisé'],
};
const _evtPochetteMatieres = ['PCB', 'PCM', 'Kraft', 'Plastique PP', 'Matière personnalisée'];
/** Pochette à rabat — grammage strictement supérieur à 250 g (à partir de 300 g). */
const _evtPochetteWeights: Record<string, string[]> = {
  PCB: ['300g', '350g', '400g', '600g', '700g', 'Grammage personnalisé'],
  PCM: ['300g', '350g', '400g', '600g', '700g', 'Grammage personnalisé'],
  Kraft: ['300g', '350g', '400g', 'Grammage personnalisé'],
  'Plastique PP': ['Grammage personnalisé'],
  'Matière personnalisée': ['Grammage personnalisé'],
};
const _evtBilletMatieres = ['Offset', 'PCB', 'PCM', 'Glossy', 'Bristol', 'PVC', 'Matière personnalisée'];
const _evtBilletWeights: Record<string, string[]> = {
  Offset: ['80g', '100g', 'Grammage personnalisé'],
  PCB: ['170g', '250g', '300g', 'Grammage personnalisé'],
  PCM: ['170g', '250g', '300g', 'Grammage personnalisé'],
  Glossy: ['170g', '250g', '300g', 'Grammage personnalisé'],
  Bristol: ['250g', '300g', 'Grammage personnalisé'],
  PVC: ['0.3 mm', '0.5 mm', '760g', 'Grammage personnalisé'],
  'Matière personnalisée': ['Grammage personnalisé'],
};

/** Chèque cadeau : pas d’Offset / papiers fins — uniquement >250G ou PVC/Plexi/Acrylic. */
const _evtChequeMatieres = ['PCB', 'PCM', 'Glossy', 'Papier spécial', 'Plexiglas', 'PVC', 'Acrylique', 'Matière personnalisée'];
const _evtChequeWeights: Record<string, string[]> = {
  PCB: ['300g', '350g', '400g', 'Grammage personnalisé'],
  PCM: ['300g', '350g', '400g', 'Grammage personnalisé'],
  Glossy: ['300g', '350g', 'Grammage personnalisé'],
  'Papier spécial': ['300g', '350g', 'Grammage personnalisé'],
  Plexiglas: ['3 mm', '5 mm', '8 mm', 'Épaisseur personnalisée'],
  PVC: ['2 mm', '3 mm', '5 mm', 'Épaisseur personnalisée'],
  Acrylique: ['3 mm', '5 mm', '8 mm', '10 mm', 'Épaisseur personnalisée'],
  'Matière personnalisée': ['Grammage personnalisé'],
};

const EVT_CARTE_VOEUX: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _evtFormatsCarteVoeux, default: 'A6 — 105×148 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    _matiereGrammageSection('Matière & grammage', { key: 'matiere', options: _evtCarteMatieres, default: 'PCB' }, _evtCarteWeights),
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Type de carte de vœux', icon: '💌', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Carte simple','Carte pliée','Carte pop-up','Carte avec enveloppe','Carte personnalisée'], forcePriceValues: ['Carte personnalisée'] },
    ]},
    { title: 'Enveloppe', icon: '✉️', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'enveloppe', label: 'Enveloppe', type: 'chips', options: ['Sans enveloppe','Enveloppe blanche','Enveloppe kraft','Enveloppe colorée','Enveloppe personnalisée'], forcePriceValues: ['Enveloppe personnalisée'] },
    ]},
  ]
};

const EVT_PHOTOCALL: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1,2,3,5],
  aliases: ['Photocall / Backdrop', 'Backdrop', 'Mur photo'],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _evtFormatsPhotocall, default: '230×230 cm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Matière', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Tissu polyester','PVC','Plexiglas','Acrylique','Vinyle','Matière personnalisée'], default: 'Tissu polyester', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Structure', icon: '🏗️', fields: [
      { key: 'structure', label: 'Structure', type: 'chips', options: ['Pop-up magnétique','Cadre aluminium','X-support','Local en acier','Structure personnalisée'], default: 'Pop-up magnétique', forcePriceValues: ['Structure personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1,2,3,5] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Type de photocall', icon: '📸', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Photocall droit','Photocall courbe','Photocall pop-up','Photocall tissu','Photocall personnalisé'], forcePriceValues: ['Photocall personnalisé'] },
    ]},
  ]
};

const EVT_PHOTOBOOTH: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1,2,3,5],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _evtFormatsPhotobooth, default: '200×200 cm', forcePriceValues: ['Format personnalisé'] },
    ]},
    {
      title: 'Matière & épaisseur',
      icon: '🧱',
      layout: 'grid-2',
      fields: [
        { key: 'matiere', label: 'Matière', type: 'chips', options: _evtRigidMatieres, default: 'PVC', forcePriceValues: ['Matière personnalisée'] },
        { key: 'epaisseur', label: 'Épaisseur', type: 'chips', options: [], forcePriceValues: ['Épaisseur personnalisée'], optionsFilter: { field: 'matiere', optionsByValue: _evtRigidThickness } },
      ],
    },
    { title: 'Type de découpe', icon: '✂️', fields: [
      { key: 'decoupe', label: 'Découpe', type: 'chips', options: ['Découpe simple','Découpe personnalisée'], default: 'Découpe simple', forcePriceValues: ['Découpe personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1,2,3,5] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Type de photobooth', icon: '🎭', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Fond photobooth tissu','Fond photobooth PVC','Cadre photobooth (selfie frame)','Kit accessoires photobooth','Photobooth personnalisé'], forcePriceValues: ['Photobooth personnalisé'] },
    ]},
  ]
};

const EVT_ENVELOPPE: ProductConfig = {
  qtyMin: 25, qtyDefault: 250, qtyPresets: [25,50,100,250,500,1000],
  sections: [
    { title: 'Type d\'enveloppe', icon: '✉️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Enveloppe C6','Enveloppe C5','Enveloppe C4','Enveloppe DL','Enveloppe carrée','Enveloppe personnalisée'], default: 'Enveloppe DL', forcePriceValues: ['Enveloppe personnalisée'] },
    ]},
    _matiereGrammageSection('Matière & grammage', { key: 'matiere', options: _evtEnveloppeMatieres, default: 'Offset' }, _evtEnveloppeWeights),
    { title: 'Couleur', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _evtLuxeColorPalette, forcePriceValues: ['Personnalisée', 'custom_luxe'] },
    ]},
    { title: 'Fermeture', icon: '🔒', fields: [
      { key: 'fermeture', label: 'Fermeture', type: 'chips', options: ['Autocollante','Gommée','Cire','Patte trapèze','Patte pointue','Fermeture personnalisée'], default: 'Autocollante', forcePriceValues: ['Fermeture personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 250, presets: [25,50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Fenêtre', icon: '🔲', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'fenetre', label: 'Fenêtre', type: 'chips', options: ['Sans fenêtre','Fenêtre droite','Fenêtre gauche','Fenêtre personnalisée'], forcePriceValues: ['Fenêtre personnalisée'] },
    ]},
  ]
};

const EVT_POCHETTE: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500],
  sections: [
    { title: 'Type de pochette', icon: '📂', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Pochette à rabat','Pochette à rabat luxe dos carré','Pochette sans rabat','Pochette à soufflet','Pochette plastique','Pochette personnalisée'], default: 'Pochette à rabat', forcePriceValues: ['Pochette personnalisée'] },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _evtFormatsPochette, default: 'A4', forcePriceValues: ['Format personnalisé'] },
    ]},
    _matiereGrammageSection('Matière & grammage', { key: 'matiere', options: _evtPochetteMatieres, default: 'PCB' }, _evtPochetteWeights),
    { title: 'Finition pelliculage', icon: '✨', fields: [
      { key: 'finition_pelliculage', label: 'Pelliculage', type: 'chips', options: ['Sans pelliculage', 'Pelliculage mat', 'Pelliculage brillant', 'Pelliculage personnalisé'], default: 'Sans pelliculage', forcePriceValues: ['Pelliculage personnalisé'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const EVT_FANION: ProductConfig = {
  qtyMin: 10, qtyDefault: 50, qtyPresets: [10,25,50,100,250],
  sections: [
    { title: 'Type de fanion', icon: '🚩', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Fanion triangle','Fanion rectangle','Fanion avec support','Banderole de fanions','Fanion personnalisé'], default: 'Fanion triangle', forcePriceValues: ['Fanion personnalisé'] },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Petit — 10×15 cm','Standard — 15×20 cm','Grand — 20×30 cm','Format personnalisé'], default: 'Standard — 15×20 cm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Matière', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Tissu polyester','Satin','PVC','Feutrine','PCB','PCM','Glossy','Offset','Matière personnalisée'], default: 'Tissu polyester', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 10, default: 50, presets: [10,25,50,100,250] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const EVT_BADGE: ProductConfig = {
  qtyMin: 10, qtyDefault: 50, qtyPresets: [10,25,50,100,250,500],
  sections: [
    { title: 'Type de badge', icon: '🏷️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Badge nominatif','Badge magnétique','Badge à épingle','Badge PVC / carte','Badge personnalisé'], default: 'Badge nominatif', forcePriceValues: ['Badge personnalisé'] },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Standard — 86×54 mm','Grand — 100×70 mm','Rond Ø 56 mm','Rond Ø 75 mm','Format personnalisé'], default: 'Standard — 86×54 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Attache', icon: '🔗', fields: [
      { key: 'attache', label: 'Attache', type: 'chips', options: ['Épingle','Aimant','Clip','Cordon','Attache personnalisée'], default: 'Épingle', forcePriceValues: ['Attache personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 10, default: 50, presets: [10,25,50,100,250,500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const EVT_BILLET: ProductConfig = {
  qtyMin: 50, qtyDefault: 500, qtyPresets: [50,100,250,500,1000,2500],
  sections: [
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Compact — 148×52 mm','Standard — 210×74 mm','Grand — 210×99 mm','Format personnalisé'], default: 'Standard — 210×74 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    _matiereGrammageSection('Matière & grammage', { key: 'matiere', options: _evtBilletMatieres, default: 'PCB' }, _evtBilletWeights),
    { title: 'Numérotation', icon: '🔢', fields: [
      { key: 'numerotation', label: 'Numérotation', type: 'chips', options: ['Sans numérotation','Numérotation séquentielle','Numérotation + code-barres','Numérotation + QR code','Personnalisée'], default: 'Sans numérotation', forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 50, default: 500, presets: [50,100,250,500,1000,2500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Type de billet', icon: '🎟️', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Billet événement','Billet numéroté','Billet avec souche détachable','Billet carton','Billet PVC','Billet personnalisé'], forcePriceValues: ['Billet personnalisé'] },
    ]},
  ]
};

const EVT_CHEQUE: ProductConfig = {
  qtyMin: 50, qtyDefault: 100, qtyPresets: [50, 100, 250, 500, 1000, 2500],
  aliases: ['Chèque cadeau', 'Bon cadeau', 'Gift card'],
  sections: [
    { title: 'Type de chèque', icon: '🎫', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Chèque cadeau standard', 'Chèque avec hologramme', 'Chèque en plexiglas', 'Chèque PVC', 'Chèque personnalisé'], default: 'Chèque cadeau standard', forcePriceValues: ['Chèque personnalisé'] },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: _evtFormatsGrand, default: 'A3', forcePriceValues: ['Format personnalisé'] },
    ]},
    _matiereGrammageSection('Matière & grammage', { key: 'matiere', options: _evtChequeMatieres, default: 'PCB' }, _evtChequeWeights),
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 50, default: 100, presets: [50, 100, 250, 500, 1000, 2500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
    { title: 'Valeur faciale', icon: '💰', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'valeur', label: 'Montant indicatif (Ar)', type: 'number', min: 0, default: 0, note: 'Montant imprimé sur le chèque (informatif devis).' },
    ]},
  ],
};

const EVT_COMPTOIR: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1,2,3,5],
  sections: [
    { title: 'Type de comptoir', icon: '🏪', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Comptoir pliable','Comptoir droit','Comptoir courbe','Comptoir avec vitrine','Comptoir personnalisé'], default: 'Comptoir pliable', forcePriceValues: ['Comptoir personnalisé'] },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Petit — 80×45 cm','Standard — 100×50 cm','Grand — 120×50 cm','Format personnalisé'], default: 'Standard — 100×50 cm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Matière impression', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Tissu polyester','PVC','Matière personnalisée'], default: 'Tissu polyester', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1,2,3,5] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};



export {
  EVT_AFFICHE,
  EVT_CORDON,
  EVT_BRACELET,
  EVT_CARTE_VOEUX,
  EVT_PHOTOCALL,
  EVT_PHOTOBOOTH,
  EVT_ENVELOPPE,
  EVT_POCHETTE,
  EVT_FANION,
  EVT_BADGE,
  EVT_BILLET,
  EVT_CHEQUE,
  EVT_COMPTOIR,
};
