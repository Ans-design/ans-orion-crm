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
  LIVRES_RELIURE_BY_TYPE,
  LIVRES_TYPES,
  livresTypesWithPages,
  LIVRES_MENU_TYPES,
  livresTypesWithCover,
  BOOK_COVER_MATIERES,
} from '../shared';

// ═══════════════════════════════════════════════════════════════
// LIVRES & PUBLICATIONS (fusion booklet, livret, fascicule, magazine, menu…)
// ═══════════════════════════════════════════════════════════════

const _livresReliureByType = LIVRES_RELIURE_BY_TYPE;

const BK_LIVRES: ProductConfig = {
  qtyMin: 1, qtyDefault: 50, qtyPresets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  sections: [
    { title: 'Type de publication', icon: '📚', fields: [
      {
        key: 'type',
        label: 'Type',
        type: 'chips',
        options: [...LIVRES_TYPES],
        default: 'Booklet',
        forcePriceValues: ['Publication personnalisée'],
        note: 'Booklet, livret, fascicule, magazine, menus, livres et mémoires — un seul configurateur.',
      },
    ]},
    { title: 'Format', icon: '📐', fields: [
      {
        key: 'format',
        label: 'Format',
        type: 'chips',
        options: [
          'A6 — 105×148 mm', 'A5 — 148×210 mm', 'A4 — 210×297 mm',
          'A4+ — 216×303 mm', 'A3 — 297×420 mm',
          'DL — 100×210 mm', 'Carré — 210×210 mm', 'Tabloïd — 280×380 mm',
          'Poche — 110×178 mm', 'Roman — 140×216 mm', 'Format personnalisé',
        ],
        default: 'A5 — 148×210 mm',
        forcePriceValues: ['Format personnalisé'],
      },
    ]},
    { title: 'Nombre de pages', icon: '📄', fields: [
      {
        key: 'pages',
        label: 'Nombre de pages',
        type: 'number',
        min: 1,
        default: 48,
        showWhen: { field: 'type', values: [...livresTypesWithPages()] },
        note: 'Impacte feuilles, matière intérieure, épaisseur, reliure et prix. Piqûre à cheval : multiple de 4.',
      },
    ]},
    { title: 'Volets menu', icon: '📄', fields: [
      {
        key: 'volets',
        label: 'Volets',
        type: 'chips',
        options: ['1 volet (feuille)', 'Livret 4–8 pages', 'Personnalisé'],
        default: '1 volet (feuille)',
        forcePriceValues: ['Personnalisé'],
        showWhen: { field: 'type', values: [...LIVRES_MENU_TYPES] },
      },
    ]},
    { title: 'Couleur impression intérieur', icon: '🖨️', fields: [
      {
        key: 'couleur_int',
        label: 'Couleur intérieur',
        type: 'chips',
        options: ['Noir & blanc', 'Quadrichromie (couleur)', 'Mixte (certaines pages couleur)'],
        default: 'Quadrichromie (couleur)',
        showWhen: { field: 'type', values: [...livresTypesWithCover()] },
      },
      {
        key: 'face_interieur',
        label: 'Recto / recto-verso',
        type: 'chips',
        options: ['Recto', 'Recto-verso'],
        default: 'Recto-verso',
        showWhen: { field: 'type', values: [...livresTypesWithCover()] },
      },
      {
        key: 'pages_noir',
        label: 'Nombre de pages en noir',
        type: 'number',
        min: 0,
        default: 0,
        showWhen: { field: 'couleur_int', values: ['Mixte (certaines pages couleur)'] },
      },
      {
        key: 'pages_quadri',
        label: 'Nombre de pages en quadri',
        type: 'number',
        min: 0,
        default: 0,
        showWhen: { field: 'couleur_int', values: ['Mixte (certaines pages couleur)'] },
      },
    ]},
    {
      ..._matiereGrammageSection(
        'Intérieur — Matière & grammage',
        { key: 'matiere_int', options: _bookIntMatieres },
        _bookIntWeightsByMatiere,
        'grammage_int',
      ),
      showWhen: { field: 'type', values: [...livresTypesWithCover()] },
    },
    {
      title: 'Couverture — Matière & grammage',
      icon: '📃',
      layout: 'grid-3',
      showWhen: { field: 'type', values: [...livresTypesWithCover()] },
      fields: [
        ..._matiereGrammageSection(
          'Couverture — Matière & grammage',
          {
            key: 'matiere_couv',
            options: [...BOOK_COVER_MATIERES],
            note: 'Supports premium : pelliculé, texturé, invitation, kraft, PVC opaque, toile fin…',
          },
          _bookCouvWeightsByMatiere,
          'grammage_couv',
        ).fields,
        {
          key: 'nombre_couverture',
          label: 'Nombre de couvertures',
          type: 'number',
          min: 1,
          default: 1,
          required: false,
          presets: [1, 2, 4],
          note: 'Ex. 1, 2 ou 4 feuilles couverture — tarif = nombre × prix unitaire (pas de recto-verso).',
        },
      ],
    },
    {
      ..._matiereGrammageSection(
        'Matière & grammage',
        { key: 'matiere', options: _menuMatieres, default: 'PCB' },
        _menuWeightsByMatiere,
      ),
      showWhen: { field: 'type', values: [...LIVRES_MENU_TYPES] },
    },
    { title: 'Reliure / finition', icon: '📎', fields: [
      {
        key: 'reliure',
        label: 'Reliure',
        type: 'chips',
        options: [],
        optionsFilter: { field: 'type', optionsByValue: _livresReliureByType },
        default: 'Spirale plastique',
        forcePriceValues: ['Reliure personnalisée'],
        note: 'Réf. agrafe (23/006–23/015), diamètre spirale (mm / pouces) et tranche DCC selon pages + grammage.',
      },
    ]},
    { title: 'Quantité', icon: '📦', fields: [
      { key: 'qty', label: 'Quantité', type: 'number', min: 1, default: 50, presets: [1, 5, 10, 25, 50, 100, 250, 500, 1000] },
    ]},
    { title: 'Remarque / détails', icon: '📝', fields: [
      { key: 'remarques', label: 'Remarque / détails', type: 'textarea' },
    ]},
  ],
};

/** @deprecated configs séparés — conservés pour référence, remplacés par BK_LIVRES */
const BK_LIVRE: ProductConfig = BK_LIVRES;
const BK_MAGAZINE: ProductConfig = BK_LIVRES;
const BK_MENU: ProductConfig = BK_LIVRES;



export {
  BK_LIVRES,
  BK_LIVRE,
  BK_MAGAZINE,
  BK_MENU,
};
