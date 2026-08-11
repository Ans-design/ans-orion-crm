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
// DOCUMENTS ADMINISTRATIFS
// ═══════════════════════════════════════════════════════════════

const DOC_ENTETE: ProductConfig = {
  qtyMin: 100, qtyDefault: 500, qtyPresets: [100,250,500,1000,2500,5000],
  aliases: ['Papier à en-tête','En-tête','Letterhead'],
  sections: [
    { title: 'Format', icon: '📐', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['A4 — 210×297 mm','A5 — 148×210 mm','Letter US','Format personnalisé'], default: 'A4 — 210×297 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Matière', icon: '📃', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Offset 80g','Offset 100g','PCB 135g','Vélin','Matière personnalisée'], default: 'Offset 80g', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur d\'impression', icon: '🖨️', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'couleur_imp', label: 'Impression', type: 'chips', options: ['Quadrichromie','Noir & blanc','1 couleur Pantone','2 couleurs Pantone'], default: 'Quadrichromie' },
    ]},
    { title: 'Quantité', icon: '📦', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 100, default: 500, presets: [100,250,500,1000,2500,5000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const DOC_AUTOCOPIANT_DUPLICOPIE = [
  'Duplicopie',
  'Triplicopie',
  'Quadruplicopie',
  'Quintuplicopie',
  'Autre nombre personnalisé (>4)',
] as const;

const DOC_AUTOCOPIANT_COULEURS = ['Jaune', 'Rose', 'Vert', 'Bleu', 'Autres'];

const DOC_FACTURIER: ProductConfig = {
  qtyMin: 1, qtyDefault: 10, qtyPresets: [1, 5, 10, 25, 50, 100],
  aliases: ['Facturier','Carnet de factures','Carnet autocopiant','Reçu','Bon'],
  sections: [
    { title: 'Type', icon: '📋', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Carnet autocopiant','Facturier','Carnet de reçus','Bon de commande','Bon de livraison','Type personnalisé'], default: 'Carnet autocopiant', forcePriceValues: ['Type personnalisé'] },
    ]},
    { title: 'Duplicopie', icon: '📑', fields: [
      { key: 'duplicopie', label: 'Duplicopie', type: 'chips', options: [...DOC_AUTOCOPIANT_DUPLICOPIE], default: 'Duplicopie', forcePriceValues: ['Autre nombre personnalisé (>4)'] },
      { key: 'nb_copies', label: 'Nombre de copies (personnalisé)', type: 'number', min: 5, default: 5, suffix: 'copies', showWhen: { field: 'duplicopie', values: ['Autre nombre personnalisé (>4)'] } },
    ]},
    { title: 'Impression intérieur', icon: '🖨️', fields: [
      { key: 'impression_interieur', label: 'Impression intérieur', type: 'chips', options: ['Niveaux de gris','Quadri couleur'], default: 'Niveaux de gris' },
    ]},
    { title: 'Couleurs des souches', icon: '🎨', fields: [
      { key: 'couleurs_souches', label: 'Couleurs', type: 'chips_multi', options: DOC_AUTOCOPIANT_COULEURS, selectionMode: 'multipleExact', exactSelections: 1, forcePriceValues: ['Autres'], note: 'La 1ère souche est toujours blanche — les suivantes selon choix' },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['A6 — 105×148 mm','A5 — 148×210 mm','A4 — 210×297 mm','DL — 99×210 mm','Format personnalisé'], default: 'A6 — 105×148 mm', forcePriceValues: ['Format personnalisé'] },
    ]},
    { title: 'Feuillets par carnet', icon: '📄', fields: [
      { key: 'feuillets', label: 'Feuillets', type: 'chips', options: ['25','50','100','Personnalisé'], default: '50', forcePriceValues: ['Personnalisé'] },
      { key: 'feuillets_custom', label: 'Nombre de feuillets', type: 'number', min: 1, default: 50, showWhen: { field: 'feuillets', values: ['Personnalisé'] } },
    ]},
    { title: 'Numérotation', icon: '🔢', fields: [
      { key: 'numerotation', label: 'Numérotation', type: 'chips', options: ['Sans numérotation','Avec numérotation'], default: 'Avec numérotation' },
    ]},
    { title: 'Façonnage (obligatoire)', icon: '📎', fields: [
      { key: 'reliure', label: 'Reliure', type: 'chips', options: ['Reliure carnet obligatoire'], default: 'Reliure carnet obligatoire' },
      { key: 'perforation', label: 'Perforation', type: 'chips', options: ['Perforation obligatoire'], default: 'Perforation obligatoire' },
    ]},
    { title: 'Quantité (carnets)', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 10, presets: [1, 5, 10, 25, 50, 100] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ]
};

const DOC_TAMPON: ProductConfig = {
  qtyMin: 1, qtyDefault: 1, qtyPresets: [1,2,5,10],
  sections: [
    { title: 'Type de tampon', icon: '🔏', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: [
        'Tampon standard',
        'Tampon auto-encreur',
        'Tampon bois',
        'Tampon de poche',
        'Tampon numéroteur',
        'Tampon dateur',
        'Tampon professionnel',
        'Tampon personnalisé',
      ], default: 'Tampon standard' },
    ]},
    { title: 'Format', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: [
        'Rond Ø 20 mm',
        'Rond Ø 30 mm',
        'Rond Ø 40 mm',
        'Rond Ø 50 mm',
        'Carré 20×20 mm',
        'Carré 30×30 mm',
        'Carré 50×50 mm',
        'Petit — 38×14 mm',
        'Standard — 47×18 mm',
        'Moyen — 58×22 mm',
        'Grand — 68×47 mm',
        '40×20 mm',
        '60×40 mm',
        'Format personnalisé',
      ], default: 'Carré 20×20 mm' },
    ]},
    { title: 'Couleur encre', icon: '🖋️', fields: [
      { key: 'encre', label: 'Couleur encre', type: 'chips', options: ['Bleu','Noir','Rouge','Vert','Violet','Multicolore'], default: 'Bleu' },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 1, presets: [1,2,5,10] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Texte / note tampon', type: 'textarea' },
    ]},
  ]
};



export {
  DOC_ENTETE,
  DOC_AUTOCOPIANT_DUPLICOPIE,
  DOC_AUTOCOPIANT_COULEURS,
  DOC_FACTURIER,
  DOC_TAMPON,
};
