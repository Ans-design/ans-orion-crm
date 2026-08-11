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
  DOYPACK_PALETTES_BY_MATIERE,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// PACKAGING
// ═══════════════════════════════════════════════════════════════

const _hangtagMinGrammageG = 230;
function _hangtagGrammagesOnly(weights: string[]): string[] {
  return weights.filter((g) => {
    if (/personnalis/i.test(g)) return true;
    const n = parseInt(g, 10);
    return Number.isFinite(n) && n >= _hangtagMinGrammageG;
  });
}

const _hangtagMatieres = [
  'Glossy',
  'PCB',
  'PCM',
  'Bristol',
  'Papier spécial invitation',
  'Papier recyclé épais',
  'Autre matière',
];
const _hangtagWeightsByMatiere: Record<string, string[]> = {
  Glossy: ['250g', '300g', 'Grammage personnalisé'],
  PCB: _hangtagGrammagesOnly(_printWeightsByType.PCB),
  PCM: _hangtagGrammagesOnly(_printWeightsByType.PCM),
  Bristol: _hangtagGrammagesOnly(_printWeightsByType.Bristol),
  'Papier spécial invitation': ['250g', '300g', '350g', 'Grammage personnalisé'],
  'Papier recyclé épais': ['250g', '300g', '350g', 'Grammage personnalisé'],
  'Autre matière': ['Grammage personnalisé'],
};

const PKG_HANGTAG: ProductConfig = {
  qtyMin: 50, qtyDefault: 100, qtyPresets: [50,100,250,500,1000],
  aliases: ['Hang tag','Étiquette pendante','Tag vêtement'],
  priceTiers: [{max:99,px:150},{max:499,px:120},{max:1999,px:100},{max:null,px:80}],
  sections: [
    { title: 'Dimension', icon: '📐', fields: [
      { key: 'dimension', label: 'Dimension (fraction de A4)', type: 'chips', options: ['85×55 mm','1/10 A4 (63×99mm)','1/12 A4 (63×82mm)','1/16 A4 (52×74mm)','1/20 A4 (42×63mm)','1/24 A4 (42×52mm)','Format personnalisé'], default: '85×55 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    _matiereGrammageSection('Matière & grammage', { key: 'matiere', options: _hangtagMatieres, default: 'PCB' }, _hangtagWeightsByMatiere),
    { title: 'Orientation', icon: '🔄', fields: [
      { key: 'orientation', label: 'Orientation', type: 'chips', options: ['Portrait','Paysage'], default: 'Portrait' },
    ]},
    { title: 'Face', icon: '🖨️', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto','Recto-Verso'], default: 'Recto' },
    ]},
    { title: 'Particularités', icon: '✨', fields: [
      { key: 'particularites', label: 'Particularités', type: 'chips_multi', required: false, options: ['Cordelette','Œillet','Ruban','Découpe spéciale','Coins arrondis'] },
    ]},
    { title: 'Finitions', icon: '🔧', fields: [
      { key: 'finitions', label: 'Finitions', type: 'chips_multi', required: false, options: ['Pelliculage mat','Pelliculage brillant','Vernis sélectif','Dorure à chaud','Gaufrage'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 50, default: 100, presets: [50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea', note: 'Précisions client, emplacement particulier, demande spéciale...' },
    ]},
  ]
};

const PKG_ETIQUETTE: ProductConfig = {
  qtyMin: 1, qtyDefault: 100, qtyPresets: [1,100,250,500,1000,5000],
  aliases: ['Étiquette','Étiquette adhésive','Autocollant produit'],
  // prixCm2 / priceTiers = fallback uniquement — moteur calculatePrecutLabelPrice prioritaire
  prixCm2: 3,
  priceTiers: [{max:499,px:60},{max:1999,px:40},{max:4999,px:30},{max:null,px:20}],
  sections: [
    { title: 'Type / Matière', icon: '🏷️', fields: [
      { key: 'type_etiquette', label: 'Type vinyle', type: 'chips', options: ['Vinyle blanc','Vinyle transparent','Autres'], default: 'Vinyle blanc' },
    ]},
    { title: 'Format / Dimensions', icon: '📐', layout: 'grid-3', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['50×50 cm','Format personnalisé'], default: '50×50 cm', note: '50×50 cm = prix standard Admin. Perso = m² vinyle GF + découpe Finitions.' },
      { key: 'longueur', label: 'Largeur (mm)', type: 'number', min: 10, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'largeur', label: 'Hauteur (mm)', type: 'number', min: 10, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    { title: 'Découpe', icon: '✂️', fields: [
      { key: 'type_decoupe', label: 'Type de découpe', type: 'chips', options: ['Découpe autocollant','Découpe droite','Découpe personnalisée','Sans découpe'], default: 'Découpe autocollant' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 100, presets: [1,100,250,500,1000,5000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const _boxMatieres = [
  'PCB',
  'PCM',
  'Glossy',
  'Papier spécial invitation',
  'Kraft épais',
  'Autre matière',
];
const _boxGrammages = ['300g', '350g', '400g', 'Grammage personnalisé'];
const _boxGlossyGrammages = ['300g', '350g', '400g', '600g', 'Grammage personnalisé'];
const _boxWeightsByMatiere: Record<string, string[]> = Object.fromEntries(
  _boxMatieres.map((m) => [m, m === 'Glossy' ? _boxGlossyGrammages : _boxGrammages]),
);

const PKG_BOITE: ProductConfig = {
  qtyMin: 10, qtyDefault: 50, qtyPresets: [10,25,50,100,500],
  // prixCm2 conservé en fallback anomalie uniquement — moteur calculatePackagingBoxPrice prioritaire
  prixCm2: 3,
  aliases: ['Boîte','Boîte personnalisée','Packaging boîte','Coffret'],
  hasCliche: true,
  sections: [
    { title: 'Structure de boîte', icon: '📦', fields: [
      { key: 'structure', label: 'Type de boîte', type: 'chips', options: [
        'Boîte rabats droits','Boîte rabats inversés','Boîte fond automatique','Boîte fond 1-2-3',
        'Fourreau','Boîte tiroir','Boîte fond + couvercle','Plateau ouvert','Boîte oreiller',
      ], default: 'Boîte rabats droits' },
    ]},
    { title: 'Dimensions intérieures (L × P × H)', icon: '📐', layout: 'grid-3', fields: [
      { key: 'longueur', label: 'Longueur L (mm)', type: 'number', min: 20, suffix: 'mm' },
      { key: 'profondeur', label: 'Profondeur P (mm)', type: 'number', min: 10, suffix: 'mm' },
      { key: 'hauteur', label: 'Hauteur H (mm)', type: 'number', min: 20, suffix: 'mm' },
      { key: 'hauteur_couvercle', label: 'Hauteur couvercle (mm)', type: 'number', min: 5, suffix: 'mm', showWhen: { field: 'structure', values: ['Boîte fond + couvercle'] } },
      { key: 'jeu_couvercle', label: 'Jeu couvercle (mm)', type: 'number', min: 1, suffix: 'mm', default: 2, showWhen: { field: 'structure', values: ['Boîte fond + couvercle'] } },
    ]},
    { title: 'Matière & grammage', icon: '📃', layout: 'grid-2', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: _boxMatieres.filter((m) => m !== 'Autre matière'), default: 'PCB', forcePriceValues: ['Autre matière'], customInput: 'material' },
      { key: 'grammage', label: 'Grammage', type: 'chips', options: [], forcePriceValues: ['Grammage personnalisé'], customInput: 'grammage', optionsFilter: { field: 'matiere', optionsByValue: _boxWeightsByMatiere } },
    ]},
    { title: 'Impression & finition', icon: '🖨️', fields: [
      { key: 'face', label: 'Impression', type: 'chips', options: ['Recto','Recto-Verso'], default: 'Recto' },
      // Calculé auto (surface L×P×H → équiv. A4) — pas affiché POS
      { key: 'formatEquivalent', label: 'Format équivalent (tarif)', type: 'chips', options: ['Auto'], default: 'Auto', posHidden: true, note: 'Auto = surface développée L×P×H → équiv. A4.' },
      { key: 'format_eq_longueur', label: 'Longueur tarif (mm)', type: 'number', min: 10, default: 210, suffix: 'mm', posHidden: true, showWhen: { field: 'formatEquivalent', values: ['Format personnalisé'] } },
      { key: 'format_eq_largeur', label: 'Largeur tarif (mm)', type: 'number', min: 10, default: 297, suffix: 'mm', posHidden: true, showWhen: { field: 'formatEquivalent', values: ['Format personnalisé'] } },
      { key: 'finitions', label: 'Finitions', type: 'chips_multi', required: false, options: ['Pelliculage mat','Pelliculage brillant','Vernis sélectif','Dorure à chaud','Gaufrage','Rainage','Collage','Découpe spéciale','Plastification','Fenêtre transparente'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 10, default: 50, presets: [10,25,50,100,500] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const PKG_DOYPACK: ProductConfig = {
  qtyMin: 50, qtyDefault: 100, qtyPresets: [50,100,250,500,1000],
  aliases: ['Doypack','Sachet stand-up','Sachet doypack','Pochette stand-up'],
  hasCliche: true,
  sections: [
    { title: 'Matière du doypack', icon: '📃', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Kraft','Alu','Plastique'], default: 'Kraft' },
    ]},
    { title: 'Aspect / couleur', icon: '🎨', fields: [
      {
        key: 'couleur_doypack',
        label: 'Couleur / aspect',
        type: 'color_palette',
        palette: DOYPACK_PALETTES_BY_MATIERE.Kraft,
        default: 'Kraft naturel',
        note: 'Palette selon la matière (catalogue doypack) : Kraft naturel/blanc, Alu mat/brillant, Plastique opaque & translucide.',
        paletteFilter: {
          field: 'matiere',
          palettes: DOYPACK_PALETTES_BY_MATIERE,
        },
      },
    ]},
    { title: 'Format doypack', icon: '📐', layout: 'grid-3', fields: [
      { key: 'format', label: 'Format', type: 'chips',
        optionsFilter: { field: 'matiere', optionsByValue: {
          'Kraft': ['90×140mm','100×150mm','110×180mm','130×180mm','140×200mm','150×220mm','160×240mm','180×260mm','200×280mm','200×300mm','Format personnalisé'],
          'Alu': ['70×100mm','80×120mm','90×140mm','100×150mm','110×180mm','120×200mm','130×180mm','140×200mm','150×220mm','160×240mm','180×260mm','200×280mm','200×300mm','Format personnalisé'],
          'Plastique': ['90×140mm','100×150mm','130×180mm','150×220mm','180×260mm','200×300mm','Format personnalisé'],
        }},
        forcePriceValues: ['Format personnalisé'],
      },
      { key: 'custom_width', label: 'Largeur finie (mm)', type: 'number', min: 30, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'custom_height', label: 'Hauteur finie (mm)', type: 'number', min: 50, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'custom_gusset', label: 'Soufflet fond (mm)', type: 'number', min: 10, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    { title: 'Fermeture & fenêtre', icon: '🔒', layout: 'grid-2', fields: [
      { key: 'fermeture', label: 'Type de fermeture', type: 'chips', options: ['Zip','Tin tie','Sans fermeture'], default: 'Zip' },
      { key: 'fenetre', label: 'Fenêtre', type: 'chips', options: ['Non','Oui'], default: 'Non' },
    ]},
    { title: 'Impression', icon: '🖨️', fields: [
      { key: 'zone_impression', label: 'Zone d\'impression', type: 'chips', options: [
        'Sans impression',
        'Impression totale face avant',
        'Impression totale face arrière',
        'Impression recto-verso',
        'Impression partielle personnalisée',
        'Sticker / étiquette personnalisée',
      ], default: 'Impression partielle personnalisée' },
      { key: 'matiere_impression', label: 'Matière vinyle / autocollant', type: 'chips', options: ['Vinyle blanc','Vinyle transparent','Autocollant blanc','Autocollant transparent'], default: 'Vinyle blanc', showWhen: { field: 'zone_impression', values: [
        'Impression totale face avant','Impression totale face arrière','Impression recto-verso','Impression partielle personnalisée','Sticker / étiquette personnalisée',
      ] } },
    ]},
    { title: 'Dimensions d\'impression', icon: '📏', layout: 'grid-3', fields: [
      { key: 'zone_impression_largeur', label: 'Largeur impression (mm)', type: 'number', min: 5, suffix: 'mm', showWhen: { field: 'zone_impression', values: ['Impression partielle personnalisée','Sticker / étiquette personnalisée'] } },
      { key: 'zone_impression_hauteur', label: 'Hauteur impression (mm)', type: 'number', min: 5, suffix: 'mm', showWhen: { field: 'zone_impression', values: ['Impression partielle personnalisée','Sticker / étiquette personnalisée'] } },
      { key: 'position_impression', label: 'Position', type: 'chips', options: ['Centre','Haut','Bas','Gauche','Droite'], default: 'Centre', showWhen: { field: 'zone_impression', values: ['Impression partielle personnalisée','Sticker / étiquette personnalisée'] } },
    ]},
    { title: 'Découpe & pose', icon: '✂️', layout: 'grid-2', fields: [
      { key: 'decoupe', label: 'Découpe', type: 'chips', options: ['Oui','Sans'], default: 'Oui', showWhen: { field: 'zone_impression', values: [
        'Impression totale face avant','Impression totale face arrière','Impression recto-verso','Impression partielle personnalisée','Sticker / étiquette personnalisée',
      ] } },
      { key: 'pose', label: 'Pose autocollant', type: 'chips', options: ['Oui','Sans'], default: 'Oui', showWhen: { field: 'zone_impression', values: [
        'Impression totale face avant','Impression totale face arrière','Impression recto-verso','Impression partielle personnalisée','Sticker / étiquette personnalisée',
      ] } },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 50, default: 100, presets: [50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea', note: 'Précisions client, couleur non standard, consigne spéciale...' },
    ]},
  ]
};

const _sacMatieres = [
  'PCB',
  'PCM',
  'Glossy',
  'Offset',
  'Kraft blanc',
  'Kraft brun',
  'Papier recyclé épais',
  'Papier spécial',
  'Autre matière',
];
const _sacKraftGrammages = ['120g', '150g', '170g', '200g', '250g', 'Grammage personnalisé'];
const _sacCoatedGrammages = ['170g', '200g', '250g', '300g', '350g', 'Grammage personnalisé'];
const _sacGlossyGrammages = ['170g', '200g', '250g', '300g', 'Grammage personnalisé'];
const _sacOffsetGrammages = ['80g', '90g', '100g', '120g', '170g', '200g', '250g', '300g', 'Grammage personnalisé'];
const _sacRecycledGrammages = ['250g', '300g', '350g', 'Grammage personnalisé'];
const _sacSpecialGrammages = ['250g', '300g', '350g', '400g', 'Grammage personnalisé'];
const _sacWeightsByMatiere: Record<string, string[]> = {
  PCB: _sacCoatedGrammages,
  PCM: _sacCoatedGrammages,
  Glossy: _sacGlossyGrammages,
  Offset: _sacOffsetGrammages,
  'Kraft blanc': _sacKraftGrammages,
  'Kraft brun': _sacKraftGrammages,
  'Papier recyclé épais': _sacRecycledGrammages,
  'Papier spécial': _sacSpecialGrammages,
  'Autre matière': ['Grammage personnalisé'],
};

const PKG_SAC: ProductConfig = {
  qtyMin: 50, qtyDefault: 100, qtyPresets: [50,100,250,500,1000],
  // prixCm2 / priceTiers = fallback anomalie — moteur calculatePaperBagPrice prioritaire
  prixCm2: 3,
  aliases: ['Sac kraft','Sac papier','Sac emballage','Sac en papier personnalisé'],
  priceTiers: [{max:99,px:250},{max:499,px:200},{max:null,px:150}],
  sections: [
    { title: 'Dimensions (L × P × H)', icon: '📐', layout: 'grid-3', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['XS (180×80×240mm)','S (220×100×310mm)','M (260×120×340mm)','L (320×140×420mm)','Format personnalisé'], default: 'S (220×100×310mm)', forcePriceValues: ['Format personnalisé'] },
      { key: 'longueur', label: 'Largeur façade L (mm)', type: 'number', min: 50, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'profondeur', label: 'Profondeur / soufflet P (mm)', type: 'number', min: 0, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
      { key: 'hauteur', label: 'Hauteur H (mm)', type: 'number', min: 50, suffix: 'mm', showWhen: { field: 'format', values: ['Format personnalisé'] } },
    ]},
    _matiereGrammageSection(
      'Matière & grammage',
      { key: 'matiere', options: _sacMatieres.filter((m) => m !== 'Autre matière'), default: 'Kraft brun' },
      _sacWeightsByMatiere,
    ),
    { title: 'Impression & format tarif', icon: '🖨️', layout: 'grid-2', fields: [
      { key: 'face', label: 'Face', type: 'chips', options: ['Recto','Recto-Verso'], default: 'Recto' },
      { key: 'formatEquivalent', label: 'Format équivalent (tarif)', type: 'chips', options: ['Auto'], default: 'Auto', posHidden: true, note: 'Auto = surface développée → équiv. A4.' },
      { key: 'format_eq_longueur', label: 'Longueur tarif (mm)', type: 'number', min: 10, default: 210, suffix: 'mm', posHidden: true, showWhen: { field: 'formatEquivalent', values: ['Format personnalisé'] } },
      { key: 'format_eq_largeur', label: 'Largeur tarif (mm)', type: 'number', min: 10, default: 297, suffix: 'mm', posHidden: true, showWhen: { field: 'formatEquivalent', values: ['Format personnalisé'] } },
      { key: 'type_impression', label: 'Zone', type: 'chips', options: ['Impression partielle','Impression totale'], default: 'Impression totale' },
    ]},
    { title: 'Finitions', icon: '🔧', fields: [
      { key: 'finitions', label: 'Finitions', type: 'chips_multi', required: false, options: [
        'Pelliculage mat','Pelliculage brillant','Vernis sélectif','Dorure à chaud','Gaufrage',
        'Rainage','Collage','Découpe','Perforation','Plastification',
      ] },
    ]},
    { title: 'Poignées & accessoires', icon: '🎀', layout: 'grid-2', fields: [
      { key: 'poignees', label: 'Poignées', type: 'chips', options: ['Sans poignée','Torsadées','Plates','Cordon','Poignée cordelette','Autre'], default: 'Torsadées', note: 'Le type de sac (soufflet / luxe / fond plat) est déduit des poignées pour le tarif.' },
      { key: 'oeillets', label: 'Nombre d\'œillets', type: 'number', min: 0, default: 0, note: '0 = sans œillet' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 50, default: 100, presets: [50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const PKG_GOBELET: ProductConfig = {
  qtyMin: 50, qtyDefault: 100, qtyPresets: [50,100,250,500,1000],
  // prixCm2 fallback anomalie — moteur calculateCustomCupPrice prioritaire
  prixCm2: 3,
  aliases: ['Gobelet','Gobelet personnalisé','Cup','Gobelet carton'],
  sections: [
    { title: 'Type de gobelet', icon: '🥤', fields: [
      { key: 'type_gobelet', label: 'Type', type: 'chips', options: ['Gobelet carton','Gobelet plastique','Gobelet réutilisable','Gobelet kraft','Autres'], default: 'Gobelet carton', forcePriceValues: ['Autres'] },
    ]},
    { title: 'Contenance', icon: '📏', layout: 'grid-3', fields: [
      { key: 'contenance', label: 'Contenance', type: 'chips', options: ['4 oz (120 ml)','6 oz (180 ml)','8 oz (240 ml)','10 oz (300 ml)','12 oz (350 ml)','16 oz (475 ml)','Autres'], default: '8 oz (240 ml)' },
      { key: 'contenance_ml', label: 'Capacité (ml)', type: 'number', min: 50, suffix: 'ml', showWhen: { field: 'contenance', values: ['Autres'] } },
      { key: 'gobelet_diametre_mm', label: 'Diamètre (mm)', type: 'number', min: 30, suffix: 'mm', showWhen: { field: 'contenance', values: ['Autres'] } },
      { key: 'gobelet_hauteur_mm', label: 'Hauteur (mm)', type: 'number', min: 30, suffix: 'mm', showWhen: { field: 'contenance', values: ['Autres'] } },
    ]},
    { title: 'Technique & zone', icon: '🖨️', fields: [
      { key: 'technique_impression', label: 'Technique', type: 'chips', options: ['Sticker / vinyle','Impression directe','Sublimation','Sérigraphie'], default: 'Sticker / vinyle' },
      { key: 'face', label: 'Zone d\'impression', type: 'chips', options: [
        'Sans impression','Impression totale','Impression partielle','Sticker / étiquette','Logo petit','Logo moyen','Logo grand',
      ], default: 'Impression partielle' },
      { key: 'matiere_impression', label: 'Matière vinyle', type: 'chips', options: ['Vinyle blanc','Vinyle transparent'], default: 'Vinyle blanc', showWhen: { field: 'technique_impression', values: ['Sticker / vinyle'] } },
    ]},
    { title: 'Dimensions d\'impression', icon: '📐', layout: 'grid-3', fields: [
      { key: 'zone_impression_longueur', label: 'Largeur impression (mm)', type: 'number', min: 5, suffix: 'mm', showWhen: { field: 'face', values: ['Impression partielle','Sticker / étiquette','Logo petit','Logo moyen','Logo grand'] } },
      { key: 'zone_impression_largeur', label: 'Hauteur impression (mm)', type: 'number', min: 5, suffix: 'mm', showWhen: { field: 'face', values: ['Impression partielle','Sticker / étiquette','Logo petit','Logo moyen','Logo grand'] } },
      { key: 'position_impression', label: 'Position', type: 'chips', options: ['Centre','Haut','Bas','Gauche','Droite'], default: 'Centre', showWhen: { field: 'face', values: ['Impression partielle','Sticker / étiquette','Logo petit','Logo moyen','Logo grand'] } },
    ]},
    { title: 'Découpe & pose', icon: '✂️', layout: 'grid-2', fields: [
      { key: 'decoupe', label: 'Découpe', type: 'chips', options: ['Oui','Sans'], default: 'Oui' },
      { key: 'pose', label: 'Pose', type: 'chips', options: ['Oui','Sans'], default: 'Oui' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 50, default: 100, presets: [50,100,250,500,1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};




export {
  PKG_HANGTAG,
  PKG_ETIQUETTE,
  PKG_BOITE,
  PKG_DOYPACK,
  PKG_SAC,
  PKG_GOBELET,
};
