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
// GOODIES & OBJETS PUBLICITAIRES
// ═══════════════════════════════════════════════════════════════

const _goodiesNoteFields: ConfigField[] = [
  {
    key: 'fichier_joint',
    label: 'Fichier / visuel à joindre',
    type: 'chips',
    options: ['Dépôt via BAT / commande', 'Référence en notes'],
    default: 'Dépôt via BAT / commande',
  },
  {
    key: 'remarques',
    label: 'Notes & remarques',
    type: 'textarea',
    required: false,
    note: 'Instructions spéciales, référence fichier, consigne de marquage ou remarque production…',
  },
];

const _archivedGoodiesNotesSection: ConfigSection = {
  title: 'Notes (archivé)',
  icon: '📝',
  posHidden: true,
  archived: true,
  keepForHistory: true,
  fields: [
    { key: 'fichier_visuel', label: 'Fichier / visuel à personnaliser', type: 'textarea' },
    { key: 'note_emplacement_marquage', label: 'Précision emplacement / consigne de marquage', type: 'textarea' },
    { key: 'note_production', label: 'Note production', type: 'textarea' },
  ],
};

function _goodiesLxlFields(triggerField: string, triggerValues: string[], min = 1): ConfigField[] {
  const showWhen = { field: triggerField, values: triggerValues };
  return [
    {
      key: 'longueur',
      label: 'Longueur (mm)',
      type: 'number',
      min,
      suffix: 'mm',
      showWhen,
    },
    {
      key: 'largeur',
      label: 'Largeur (mm)',
      type: 'number',
      min,
      suffix: 'mm',
      showWhen,
    },
  ];
}

function _goodiesDiametreMmField(triggerField: string, triggerValues: string[]): ConfigField {
  return {
    key: 'diametre_mm',
    label: 'Diamètre (mm)',
    type: 'number',
    min: 1,
    suffix: 'mm',
    showWhen: { field: triggerField, values: triggerValues },
  };
}

const GD_MUG: ProductConfig = {
  qtyMin: 1, qtyDefault: 25, qtyPresets: [1,5,10,25,50,100,250],
  // Prix = modèles/techniques Admin (GoodiesArticleModel + GoodiesPrintingTechnique)
  sections: [
    { title: 'Type de mug', icon: '☕', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Mug classique','Mug magique (thermosensible)','Mug bicolore','Mug intérieur couleur','Mug enfant','Mug personnalisé'], default: 'Mug classique', forcePriceValues: ['Mug personnalisé'] },
    ]},
    { title: 'Contenance', icon: '📏', fields: [
      { key: 'contenance', label: 'Contenance', type: 'chips', options: ['200 ml','250 ml','300 ml (standard)','350 ml','400 ml','500 ml (XXL)'], default: '300 ml (standard)' },
    ]},
    { title: 'Couleur du mug', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur extérieure', type: 'color_palette', palette: _goodiesColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Couleur intérieure / anse', icon: '🎨', fields: [
      { key: 'couleur_int', label: 'Couleur intérieure / anse', type: 'color_palette', palette: [
        { id: 'identique', label: 'Identique', hex: '#DDDDDD' },
        ..._goodiesColors.filter(c => c.id !== 'transparent'),
      ]},
    ]},
    { title: 'Technique de personnalisation', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Sublimation','Impression UV','Sérigraphie','Gravure laser','Transfert','Technique personnalisée'], default: 'Sublimation', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 25, presets: [1,5,10,25,50,100,250] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Matière / support', icon: '🏺', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Céramique blanche','Céramique colorée','Porcelaine','Grès','Verre','Inox','Plastique','Matière personnalisée'], default: 'Céramique blanche', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Aucun marquage','Face avant','Face arrière','Tour complet','Deux faces','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const GD_TASSE: ProductConfig = {
  qtyMin: 1, qtyDefault: 25, qtyPresets: [1,5,10,25,50,100],
  sections: [
    { title: 'Type d\'assiette', icon: '🍽️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Assiette plate','Assiette creuse','Assiette dessert','Assiette à soupe','Assiette personnalisée'], default: 'Assiette plate', forcePriceValues: ['Assiette personnalisée'] },
    ]},
    { title: 'Diamètre / format', icon: '📏', fields: [
      { key: 'diametre', label: 'Diamètre', type: 'chips', options: ['18 cm','20 cm','22 cm','24 cm','26 cm','28 cm','Format personnalisé'], default: '22 cm', forcePriceValues: ['Format personnalisé'] },
      _goodiesDiametreMmField('diametre', ['Format personnalisé']),
    ]},
    { title: 'Matière', icon: '🏺', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Porcelaine','Céramique','Grès','Verre','Matière personnalisée'], default: 'Porcelaine', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur de l\'assiette', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Sublimation','Impression UV','Sérigraphie','Gravure laser','Décalcomanie','Technique personnalisée'], default: 'Sublimation', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 25, presets: [1,5,10,25,50,100] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Soucoupe / accessoire', icon: '🍽️', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'soucoupe', label: 'Soucoupe', type: 'chips', options: ['Sans soucoupe','Avec soucoupe assortie','Avec soucoupe contrastée','Avec cuillère','Set complet','Accessoire personnalisé'], forcePriceValues: ['Accessoire personnalisé'] },
    ]},
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Aucun marquage','Face avant','Face arrière','Tour complet','Soucoupe','Deux faces','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const GD_GOURDE: ProductConfig = {
  qtyMin: 1, qtyDefault: 25, qtyPresets: [1,5,10,25,50,100],
  sections: [
    { title: 'Type de gourde', icon: '🍶', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Gourde isotherme','Gourde sport','Gourde aluminium','Gourde inox','Gourde plastique','Gourde verre','Gourde personnalisée'], default: 'Gourde inox', forcePriceValues: ['Gourde personnalisée'] },
    ]},
    { title: 'Contenance', icon: '📏', fields: [
      { key: 'contenance', label: 'Contenance', type: 'chips', options: ['350 ml','500 ml','600 ml','750 ml','1000 ml'], default: '500 ml' },
    ]},
    { title: 'Matière', icon: '🏗️', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Inox 304','Inox double paroi','Aluminium','Tritan (plastique)','Verre borosilicate','Matière personnalisée'], default: 'Inox double paroi', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur de la gourde', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Bouchon / couvercle', icon: '🔝', fields: [
      { key: 'bouchon', label: 'Bouchon', type: 'chips', options: ['Bouchon vissé','Bouchon sport (bec)','Bouchon paille','Bouchon bambou','Bouchon personnalisé'], default: 'Bouchon vissé', forcePriceValues: ['Bouchon personnalisé'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Gravure laser','Impression UV','Sérigraphie','Sublimation','Technique personnalisée'], default: 'Gravure laser', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 25, presets: [1,5,10,25,50,100] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Aucun marquage','Face avant','Face arrière','Tour complet','Bouchon','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const GD_TAPIS_SOURIS: ProductConfig = {
  qtyMin: 10, qtyDefault: 50, qtyPresets: [10,25,50,100,250,500],
  sections: [
    { title: 'Type de tapis souris', icon: '🖱️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Tapis standard','Tapis ergonomique (repose-poignet)','Tapis gaming (large)','Tapis rond','Tapis personnalisé'], default: 'Tapis standard', forcePriceValues: ['Tapis personnalisé'] },
    ]},
    { title: 'Forme', icon: '🔷', fields: [
      { key: 'forme', label: 'Forme', type: 'chips', options: ['Rectangulaire','Rond','Carré','Forme personnalisée'], default: 'Rectangulaire', forcePriceValues: ['Forme personnalisée'] },
    ]},
    { title: 'Format / dimensions', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['18×22 cm (XS)','22×27 cm (S)','30×25 cm (M)','80×30 cm (XL)','Ø 20 cm (S)','Format personnalisé'], default: '18×22 cm (XS)', forcePriceValues: ['Format personnalisé'] },
      ..._goodiesLxlFields('format', ['Format personnalisé']),
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sublimation pleine surface','Impression UV','Sérigraphie','Technique personnalisée'], default: 'Sublimation pleine surface', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 10, default: 50, presets: [10,25,50,100,250,500] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Matière de surface', icon: '🧵', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'matiere_surface', label: 'Surface', type: 'chips', options: ['Tissu polyester','Microfibre','PVC souple','Néoprène','Matière personnalisée'], default: 'Tissu polyester', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Base antidérapante', icon: '🔗', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'base', label: 'Base', type: 'chips', options: ['Caoutchouc','Silicone','Mousse','Base personnalisée'], default: 'Caoutchouc', forcePriceValues: ['Base personnalisée'] },
    ]},
  ]
};

const GD_BRIQUET: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500,1000],
  sections: [
    { title: 'Format / taille', icon: '📏', fields: [
      { key: 'taille', label: 'Format / taille', type: 'chips', options: ['Mini','Standard','Large','Modèle personnalisé'], default: 'Standard', forcePriceValues: ['Modèle personnalisé'] },
      ..._goodiesLxlFields('taille', ['Modèle personnalisé']),
    ]},
    { title: 'Couleur', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Tampographie','Sérigraphie','Gravure laser','Impression UV','Technique personnalisée'], default: 'Tampographie', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500,1000] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Type de briquet', icon: '🔥', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Briquet jetable','Briquet rechargeable','Briquet tempête','Briquet électrique / USB','Briquet premium','Briquet personnalisé'], forcePriceValues: ['Briquet personnalisé'] },
    ]},
    { title: 'Matière', icon: '🏗️', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Plastique','Métal','Alliage zinc','Inox','Matière personnalisée'], forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Aucun marquage','Face avant','Face arrière','Deux faces','Tour complet','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const GD_USB: ProductConfig = {
  qtyMin: 10, qtyDefault: 50, qtyPresets: [10,25,50,100,250,500],
  sections: [
    { title: 'Type de clé USB', icon: '💾', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Clé classique','Clé pivotante','Clé carte (crédit card)','Clé bracelet','Clé porte-clés','Clé bois','Clé métal premium','Clé personnalisée'], default: 'Clé classique', forcePriceValues: ['Clé personnalisée'] },
    ]},
    { title: 'Capacité', icon: '📊', fields: [
      { key: 'capacite', label: 'Capacité', type: 'chips', options: ['4 Go','8 Go','16 Go','32 Go','64 Go','128 Go'], default: '16 Go' },
    ]},
    { title: 'Interface', icon: '🔌', fields: [
      { key: 'interface', label: 'Interface', type: 'chips', options: ['USB 2.0','USB 3.0','USB-C','Double USB-A + USB-C','Interface personnalisée'], default: 'USB 2.0', forcePriceValues: ['Interface personnalisée'] },
    ]},
    { title: 'Couleur', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Gravure laser','Impression UV','Tampographie','Sérigraphie','Impression pleine face','Technique personnalisée'], default: 'Gravure laser', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 10, default: 50, presets: [10,25,50,100,250,500] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Matière', icon: '🏗️', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Plastique','Métal','Bois','Bambou','Cuir','Silicone','Matière personnalisée'], forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Aucun marquage','Face avant','Face arrière','Deux faces','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const GD_PARAPLUIE: ProductConfig = {
  qtyMin: 5, qtyDefault: 25, qtyPresets: [5,10,25,50,100],
  sections: [
    { title: 'Diamètre / format', icon: '📐', fields: [
      { key: 'diametre', label: 'Diamètre', type: 'chips', options: ['90 cm (mini)','100 cm (pliant standard)','105 cm','120 cm (droit standard)','130 cm (golf)','Diamètre personnalisé'], default: '100 cm (pliant standard)', forcePriceValues: ['Diamètre personnalisé'] },
      _goodiesDiametreMmField('diametre', ['Diamètre personnalisé']),
    ]},
    { title: 'Nombre de panneaux', icon: '🔷', fields: [
      { key: 'panneaux', label: 'Panneaux', type: 'chips', options: ['6 panneaux','8 panneaux','10 panneaux','16 panneaux'], default: '8 panneaux' },
    ]},
    { title: 'Matière de la toile', icon: '🧵', fields: [
      { key: 'matiere', label: 'Matière toile', type: 'chips', options: ['Polyester','Pongé','Nylon','Fibre de verre baleines','Matière personnalisée'], default: 'Polyester', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur de la toile', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors.filter(c => c.id !== 'transparent'), forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Sérigraphie','Sublimation panneau','Sublimation complète','Impression numérique','Technique personnalisée'], default: 'Sérigraphie', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 5, default: 25, presets: [5,10,25,50,100] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Type de parapluie', icon: '☂️', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Parapluie pliant','Parapluie droit / canne','Parapluie golf','Parapluie automatique','Parapluie enfant','Parapluie premium','Parapluie personnalisé'], forcePriceValues: ['Parapluie personnalisé'] },
    ]},
    { title: 'Poignée / manche', icon: '🔧', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'poignee', label: 'Poignée', type: 'chips', options: ['Poignée droite','Poignée crochet','Poignée caoutchouc','Poignée bois','Poignée personnalisée'], forcePriceValues: ['Poignée personnalisée'] },
    ]},
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Aucun marquage','1 panneau','2 panneaux','4 panneaux','Tous panneaux','Poignée','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const GD_STYLO: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500,1000],
  sections: [
    { title: 'Type de stylo', icon: '🖊️', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Stylo bille','Stylo roller','Stylo plume','Stylo 4 couleurs','Stylo tactile (écran)','Stylo premium / coffret','Stylo personnalisé'], default: 'Stylo bille', forcePriceValues: ['Stylo personnalisé'] },
    ]},
    { title: 'Mécanisme', icon: '⚙️', fields: [
      { key: 'mecanisme', label: 'Mécanisme', type: 'chips', options: ['Rétractable (clic)','Capuchon','Twist (rotation)','Mécanisme personnalisé'], default: 'Rétractable (clic)', forcePriceValues: ['Mécanisme personnalisé'] },
    ]},
    { title: 'Couleur d\'encre', icon: '🖋️', fields: [
      { key: 'encre', label: 'Encre', type: 'chips', options: ['Bleu','Noir','Rouge','Vert','Violet','Orange'], default: 'Bleu' },
    ]},
    { title: 'Matière', icon: '🏗️', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Plastique','Métal','Aluminium','Bambou','Bois','Matière recyclée','Matière personnalisée'], default: 'Plastique', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur du stylo', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors.filter(c => c.id !== 'transparent'), forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Tampographie','Gravure laser','Sérigraphie','Impression UV','Impression','Technique personnalisée'], default: 'Tampographie', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500,1000] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Aucun marquage','Clip','Corps','Capuchon / bouton','Deux zones','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};

const GD_PORTECLES: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500,1000],
  sections: [
    { title: 'Type de porte-clés', icon: '🔑', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Porte-clés métal','Porte-clés plastique','Porte-clés bois','Porte-clés cuir','Porte-clés acrylique','Porte-clés PVC souple','Porte-clés décapsuleur','Porte-clés personnalisé'], default: 'Porte-clés métal', forcePriceValues: ['Porte-clés personnalisé'] },
    ]},
    { title: 'Forme', icon: '🔷', fields: [
      { key: 'forme', label: 'Forme', type: 'chips', options: ['Rond','Carré','Rectangle','Cœur','Étoile','Logo découpé','Forme personnalisée'], default: 'Rectangle', forcePriceValues: ['Forme personnalisée'] },
    ]},
    { title: 'Format / dimensions', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Mini — 25×25 mm','Petit — 30×30 mm','Standard — 35×35 mm','Moyen — 40×40 mm','Grand — 50×50 mm','Format personnalisé'], default: 'Standard — 35×35 mm', forcePriceValues: ['Format personnalisé'] },
      ..._goodiesLxlFields('format', ['Format personnalisé'], 5),
    ]},
    { title: 'Matière', icon: '🏗️', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Métal chromé','Métal brossé','Alliage zinc','Acrylique','PVC souple','Bois','Bambou','Cuir','Matière personnalisée'], default: 'Métal chromé', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Couleur', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Attache / anneau', icon: '🔗', fields: [
      { key: 'attache', label: 'Attache', type: 'chips', options: ['Anneau métal','Mousqueton','Chaînette','Cordon','Attache personnalisée'], default: 'Anneau métal', forcePriceValues: ['Attache personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Gravure laser','Impression UV','Résine époxy','Tampographie','Émaillage','Impression pleine face','Technique personnalisée'], default: 'Gravure laser', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500,1000] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Finition / effet', icon: '✨', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'finition', label: 'Finition', type: 'chips', options: ['Brillant','Mat','Satiné','Brossé','Vernis','Finition personnalisée'], default: 'Brillant', forcePriceValues: ['Finition personnalisée'] },
    ]},
  ]
};

const GD_PINS: ProductConfig = {
  qtyMin: 25, qtyDefault: 100, qtyPresets: [25,50,100,250,500,1000],
  sections: [
    { title: 'Type de pin\'s', icon: '📌', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Pin\'s métal émaillé','Pin\'s métal relief','Pin\'s imprimé résine','Pin\'s bois','Pin\'s acrylique','Pin\'s personnalisé'], default: 'Pin\'s métal émaillé', forcePriceValues: ['Pin\'s personnalisé'] },
    ]},
    { title: 'Forme', icon: '🔷', fields: [
      { key: 'forme', label: 'Forme', type: 'chips', options: ['Rond','Carré','Rectangle','Logo découpé','Forme libre','Forme personnalisée'], default: 'Rond', forcePriceValues: ['Forme personnalisée'] },
    ]},
    { title: 'Format / dimensions', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['Mini — 15 mm','Petit — 20 mm','Standard — 25 mm','Moyen — 30 mm','Grand — 40 mm','Format personnalisé'], default: 'Standard — 25 mm', forcePriceValues: ['Format personnalisé'] },
      _goodiesDiametreMmField('format', ['Format personnalisé']),
    ]},
    { title: 'Matière', icon: '🏗️', fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Laiton','Alliage zinc','Fer','Cuivre','Acrylique','Bois','Matière personnalisée'], default: 'Alliage zinc', forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Émaillage soft','Émaillage hard','Impression offset','Impression UV','Gravure','Résine époxy','Technique personnalisée'], default: 'Émaillage soft', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 25, default: 100, presets: [25,50,100,250,500,1000] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Finition / effet', icon: '✨', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'finition', label: 'Finition', type: 'chips', options: ['Brillant','Mat','Satiné','Doré','Argenté','Bronze','Vernis époxy','Finition personnalisée'], default: 'Brillant', forcePriceValues: ['Finition personnalisée'] },
    ]},
    { title: 'Attache', icon: '🔗', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'attache', label: 'Attache', type: 'chips', options: ['Papillon / butterfly','Épingle','Aimant','Attache personnalisée'], default: 'Papillon / butterfly', forcePriceValues: ['Attache personnalisée'] },
    ]},
  ]
};

const GD_HOUSSE: ProductConfig = {
  qtyMin: 5, qtyDefault: 25, qtyPresets: [5,10,25,50,100,250],
  sections: [
    { title: 'Type de housse', icon: '📱', fields: [
      { key: 'type', label: 'Type', type: 'chips', options: ['Housse téléphone','Housse tablette','Housse laptop','Housse universelle','Housse personnalisée'], default: 'Housse téléphone', forcePriceValues: ['Housse personnalisée'] },
    ]},
    { title: 'Format / taille', icon: '📐', fields: [
      { key: 'format', label: 'Format', type: 'chips', options: ['iPhone / Samsung standard','iPhone','Samsung','Téléphone standard','Tablette 10"','Tablette 12"','iPad','Laptop 13"','Laptop 15"','Format personnalisé'], default: 'iPhone / Samsung standard', forcePriceValues: ['Format personnalisé'] },
      ..._goodiesLxlFields('format', ['Format personnalisé']),
    ]},
    { title: 'Couleur', icon: '🎨', fields: [
      { key: 'couleur', label: 'Couleur', type: 'color_palette', palette: _goodiesColors, forcePriceValues: ['Personnalisée'] },
    ]},
    { title: 'Technique', icon: '🖌️', fields: [
      { key: 'technique', label: 'Technique', type: 'chips', options: ['Sans personnalisation','Impression UV','Sublimation','Sérigraphie','Gravure laser','Technique personnalisée'], default: 'Impression UV', forcePriceValues: ['Technique personnalisée'] },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 5, default: 25, presets: [5,10,25,50,100,250] },
    ]},
    { title: 'Fichier & notes', icon: '📝', fields: _goodiesNoteFields },
    _archivedGoodiesNotesSection,
    { title: 'Origine de la housse', icon: '📦', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'origine', label: 'Origine', type: 'chips', options: ['Housse vierge fournie','Housse client fournie','Fabrication sur mesure'], forcePriceValues: ['Fabrication sur mesure'] },
    ]},
    { title: 'Matière', icon: '🧵', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'matiere', label: 'Matière', type: 'chips', options: ['Silicone','TPU souple','Plastique rigide','Cuir / simili cuir','Néoprène','Tissu','Matière personnalisée'], forcePriceValues: ['Matière personnalisée'] },
    ]},
    { title: 'Zone de marquage', icon: '📍', posHidden: true, archived: true, keepForHistory: true, fields: [
      { key: 'zone_marquage', label: 'Zone', type: 'chips', options: ['Aucun marquage','Face arrière complète','Face arrière partielle','Bord / contour','Zone personnalisée'], forcePriceValues: ['Zone personnalisée'] },
    ]},
  ]
};



export {
  GD_MUG,
  GD_TASSE,
  GD_GOURDE,
  GD_TAPIS_SOURIS,
  GD_BRIQUET,
  GD_USB,
  GD_PARAPLUIE,
  GD_STYLO,
  GD_PORTECLES,
  GD_PINS,
  GD_HOUSSE,
};
