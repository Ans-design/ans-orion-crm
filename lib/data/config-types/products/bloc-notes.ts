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
  BLOC_NOTE_COVER_MATIERES,
  BLOC_NOTE_COVER_WEIGHTS,
  BLOC_NOTE_INTERIEUR_FAMILLES,
  BLOC_NOTE_INTERIOR_WEIGHTS,
  BLOC_NOTE_RELIURE_OPTIONS,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// BLOC-NOTES
// ═══════════════════════════════════════════════════════════════

const BLOC_NOTES: ProductConfig = {
  qtyMin: 1,
  qtyDefault: 50,
  qtyPresets: [1, 25, 50, 100, 250, 500, 1000, 5000, 10000],
  sections: [
    {
      title: 'Produit & format',
      icon: '📓',
      layout: 'grid-2',
      fields: [
        {
          key: 'produit',
          label: 'Produit',
          type: 'chips',
          options: ['Bloc-note', 'Agenda'],
        },
        {
          key: 'format',
          label: 'Format',
          type: 'chips',
          options: ['A6 — 105×148 mm', 'B5 — 176×250 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm', 'Format personnalisé'],
          forcePriceValues: ['Format personnalisé'],
          note: 'A4 — 210×297 mm · B5 — 176×250 mm · A5 — 148×210 mm · A6 — 105×148 mm',
        },
      ],
    },
    {
      title: 'Couverture',
      icon: '📕',
      layout: 'grid-3',
      fields: [
        {
          key: 'matiere_couverture',
          label: 'Matière couverture',
          type: 'chips',
          options: [...BLOC_NOTE_COVER_MATIERES],
          note: 'Texturé (motif en remarque), invitation, kraft, toile fin, PVC opaque ou translucide…',
        },
        {
          key: 'type_support_couverture',
          label: 'Type de support (tarif)',
          type: 'chips',
          options: ['300g simple', '750g luxe', 'Autres'],
          forcePriceValues: ['Autres'],
          note: '300g simple ou 750g luxe pour le barème — matière détaillée ci-dessus.',
        },
        {
          key: 'finition_pelliculage',
          label: 'Finition / Pelliculage',
          type: 'chips',
          options: ['Sans pellicule', 'Pelliculé'],
          optionsFilter: {
            field: 'type_support_couverture',
            optionsByValue: {
              '300g simple': ['Sans pellicule', 'Pelliculé'],
              '750g luxe': ['Pelliculé'],
              Autres: ['Sans pellicule', 'Pelliculé'],
            },
          },
        },
        {
          key: 'grammage_couverture',
          label: 'Grammage couverture',
          type: 'chips',
          options: [],
          customInput: 'grammage',
          optionsFilter: {
            field: 'matiere_couverture',
            optionsByValue: BLOC_NOTE_COVER_WEIGHTS,
          },
          note: 'Grammage selon matière couverture. Tarif lié au type de support.',
        },
        {
          key: 'technologie_couverture',
          label: 'Technologie couverture',
          type: 'chips',
          options: ['Jet d\'encre', 'Numérique Laser'],
        },
      ],
    },
    {
      title: 'Intérieur',
      icon: '📄',
      layout: 'grid-3',
      fields: [
        {
          key: 'famille_papier',
          label: 'Famille papier',
          type: 'chips',
          options: [...BLOC_NOTE_INTERIEUR_FAMILLES],
          forcePriceValues: ['Autres'],
        },
        {
          key: 'grammage_interieur',
          label: 'Grammage intérieur',
          type: 'chips',
          options: [],
          forcePriceValues: ['Autres'],
          customInput: 'grammage',
          optionsFilter: {
            field: 'famille_papier',
            optionsByValue: BLOC_NOTE_INTERIOR_WEIGHTS,
          },
        },
        {
          key: 'face_interieur',
          label: 'Face (Impression)',
          type: 'chips',
          options: ['Recto', 'Recto-verso'],
        },
      ],
    },
    {
      title: 'Impression intérieur',
      icon: '🖨️',
      layout: 'grid-2',
      fields: [
        {
          key: 'couleur_impression',
          label: 'Couleur d\'impression',
          type: 'chips',
          options: ['N&B / Noir', 'Quadri CMJN', 'Autres'],
          forcePriceValues: ['Autres'],
        },
        {
          key: 'technologie_interieur',
          label: 'Technologie intérieur',
          type: 'chips',
          options: ['Jet d\'encre', 'Numérique Laser'],
          optionsFilter: {
            field: 'famille_papier',
            optionsByValue: {
              Offset: ['Jet d\'encre', 'Numérique Laser'],
              PCB: ['Numérique Laser'],
              PCM: ['Numérique Laser'],
              'Papier spécial invitation': ['Jet d\'encre', 'Numérique Laser'],
              Autres: ['Jet d\'encre', 'Numérique Laser'],
            },
          },
          note: 'Numérique Laser recommandé pour PCB / PCM / supports couchés.',
        },
      ],
    },
    {
      title: 'Nombre de pages',
      icon: '📊',
      fields: [
        {
          key: 'nombre_feuilles',
          label: 'Nombre de pages',
          type: 'chips',
          options: ['50 feuilles', '75 feuilles', '100 feuilles', 'Autres'],
          note: 'Nombre de feuilles physiques du bloc.',
        },
        {
          key: 'nombre_feuilles_custom',
          label: 'Nombre de feuilles personnalisé',
          type: 'number',
          min: 1,
          max: 2000,
          showWhen: { field: 'nombre_feuilles', values: ['Autres'] },
        },
      ],
    },
    {
      title: 'Type de reliure',
      icon: '📎',
      fields: [{
        key: 'type_reliure',
        label: 'Reliure',
        type: 'chips',
        options: [...BLOC_NOTE_RELIURE_OPTIONS],
        forcePriceValues: ['Autres'],
      }],
    },
    {
      title: 'Quantité',
      icon: '📦',
      fields: [{
        key: 'qty',
        label: 'Quantité',
        type: 'number',
        min: 1,
        default: 50,
        presets: [1, 25, 50, 100, 250, 500, 1000, 5000, 10000],
        note: 'Remises : 50+ · 1 000+ · 5 000+ · 10 000+ · 20 000+',
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{
        key: 'remarques',
        label: 'Remarque / détails',
        type: 'textarea',
        note: 'Instructions spéciales, références, papier spécial, reliure spéciale, agenda personnalisé…',
      }],
    },
  ],
};



export {
  BLOC_NOTES,
};
