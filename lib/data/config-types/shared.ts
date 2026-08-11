import type { ConfigField, ConfigSection } from './types';
import {
  DOYPACK_COLOR_PALETTE,
  DOYPACK_PALETTES_BY_MATIERE,
  EXTENDED_COLOR_PALETTE,
} from '../color-palettes';
import {
  LIVRES_MENU_TYPES,
  LIVRES_TYPES,
  livresTypesWithCover,
  livresTypesWithPages,
} from '@/lib/pos/livres-catalog';
import {
  ORIFLAMME_BASES,
  ORIFLAMME_MATIERES,
  ORIFLAMME_TYPES,
  oriflammeHauteursOptionsByType,
} from '../oriflamme-catalog';
import { PRESENTOIR_MAGASIN_FORMAT_OPTIONS } from '../plv-presentoir-catalog';
import {
  BOOK_COVER_MATIERES,
  BOOK_COVER_WEIGHTS,
  BOOK_INTERIOR_MATIERES,
  BOOK_INTERIOR_WEIGHTS,
  BOOK_MENU_MATIERES,
  BOOK_MENU_WEIGHTS,
} from '../book-material-catalog';
import {
  BLOC_NOTE_COVER_MATIERES,
  BLOC_NOTE_COVER_WEIGHTS,
  BLOC_NOTE_INTERIEUR_FAMILLES,
  BLOC_NOTE_INTERIOR_WEIGHTS,
  CARTE_COVER_WEIGHTS,
  CARTE_FIDELITE_MATIERES,
  CARTE_FIDELITE_WEIGHTS,
  CARTE_JEUX_FORMAT_OPTIONS,
  CARTE_JEUX_MATIERES,
  CARTE_VISITE_MATIERES,
  CARTERIE_COINS_OPTIONS,
  CARTERIE_FORMAT_OPTIONS,
} from '../carte-cover-material-catalog';
import {
  BLOC_NOTE_RELIURE_OPTIONS,
  FACONNAGE_RELIURE_OPTIONS,
  LIVRES_RELIURE_BY_TYPE,
} from '../binding-catalog';
import {
  PRINT_PETIT_FORMAT_MATIERES,
  PRINT_WEIGHTS_BY_MATIERE,
} from '../print-material-weights';
import { FLYER_FORMAT_OPTIONS } from '@/lib/pos/flyer-catalog';
import {
  FLYER_MATIERES,
  FLYER_VOLET_OPTIONS,
  FLYER_WEIGHTS_BY_MATIERE,
} from '../flyer-material-catalog';
import {
  IMPRESSION_SF_FORMATS,
  IMPRESSION_SF_MATIERE_LABELS,
  IMPRESSION_SF_WEIGHTS_BY_MATIERE,
} from '../impression-sf-material-catalog';

const _textileColors: NonNullable<ConfigField['palette']> = EXTENDED_COLOR_PALETTE;

const _goodiesColors: NonNullable<ConfigField['palette']> = [
  { id: 'blanc', label: 'Blanc', hex: '#FFFFFF' },
  { id: 'blanc_casse', label: 'Blanc cassé', hex: '#FAF0E6' },
  { id: 'noir', label: 'Noir', hex: '#1A1A1A' },
  { id: 'gris_anthracite', label: 'Gris anthracite', hex: '#3C3C3C' },
  { id: 'gris', label: 'Gris', hex: '#808080' },
  { id: 'gris_clair', label: 'Gris clair', hex: '#C0C0C0' },
  { id: 'rouge', label: 'Rouge', hex: '#D32F2F' },
  { id: 'rouge_fonce', label: 'Rouge foncé', hex: '#8B0000' },
  { id: 'bordeaux', label: 'Bordeaux', hex: '#800020' },
  { id: 'bleu', label: 'Bleu', hex: '#1565C0' },
  { id: 'bleu_marine', label: 'Bleu marine', hex: '#1B3A5C' },
  { id: 'bleu_roi', label: 'Bleu roi', hex: '#002395' },
  { id: 'bleu_ciel', label: 'Bleu ciel', hex: '#87CEEB' },
  { id: 'turquoise', label: 'Turquoise', hex: '#40E0D0' },
  { id: 'vert', label: 'Vert', hex: '#2E7D32' },
  { id: 'vert_fonce', label: 'Vert foncé', hex: '#1B5E20' },
  { id: 'vert_olive', label: 'Vert olive', hex: '#808000' },
  { id: 'kaki', label: 'Kaki', hex: '#6B7B3A' },
  { id: 'jaune', label: 'Jaune', hex: '#F9A825' },
  { id: 'jaune_vif', label: 'Jaune vif', hex: '#FFD700' },
  { id: 'moutarde', label: 'Moutarde', hex: '#C7A317' },
  { id: 'orange', label: 'Orange', hex: '#EF6C00' },
  { id: 'orange_vif', label: 'Orange vif', hex: '#FF6600' },
  { id: 'rose', label: 'Rose', hex: '#C2185B' },
  { id: 'rose_pastel', label: 'Rose pastel', hex: '#FFB6C1' },
  { id: 'fuchsia', label: 'Fuchsia', hex: '#FF00FF' },
  { id: 'violet', label: 'Violet', hex: '#7B1FA2' },
  { id: 'lilas', label: 'Lilas', hex: '#C8A2C8' },
  { id: 'prune', label: 'Prune', hex: '#8E4585' },
  { id: 'beige', label: 'Beige', hex: '#D7CCC8' },
  { id: 'camel', label: 'Camel', hex: '#C19A6B' },
  { id: 'marron', label: 'Marron', hex: '#5D4037' },
  { id: 'chocolat', label: 'Chocolat', hex: '#3E2723' },
  { id: 'argent', label: 'Argent', hex: '#B0BEC5' },
  { id: 'or', label: 'Or', hex: '#C9A94E' },
  { id: 'rose_gold', label: 'Rose gold', hex: '#E8B4B8' },
  { id: 'transparent', label: 'Transparent', hex: '#E0E0E0', badge: 'transp.' },
  { id: 'custom', label: 'Personnalisée', hex: '#CCCCCC', badge: 'prix forcé' },
];

const _evtLuxeColorPalette: NonNullable<ConfigField['palette']> = [
  ..._goodiesColors.filter((c) => c.id !== 'transparent' && c.id !== 'custom'),
  { id: 'paillete', label: 'Pailleté', hex: '#C8C8D0', badge: 'luxe' },
  { id: 'dore', label: 'Doré', hex: '#D4AF37', badge: 'luxe' },
  { id: 'chrome', label: 'Chromé', hex: '#A8A9AD', badge: 'luxe' },
  { id: 'satine', label: 'Satiné', hex: '#E8E8E8', badge: 'luxe' },
  { id: 'veloute', label: 'Velouté', hex: '#6B4C3B', badge: 'luxe' },
  { id: 'custom_luxe', label: 'Personnalisée', hex: '#CCCCCC', badge: 'prix forcé' },
];

const _printMatieres = [...PRINT_PETIT_FORMAT_MATIERES];
const _printMatieresAliases: Record<string, string> = {
  glossy: 'Glossy',
  'papier couché brillant': 'PCB',
  'papier couché mat': 'PCM',
};
const _printWeightsByType = PRINT_WEIGHTS_BY_MATIERE;
const _flyerMatieres = [...FLYER_MATIERES];
const _flyerWeightsByType = FLYER_WEIGHTS_BY_MATIERE;
const _carteMatieres = [...CARTE_VISITE_MATIERES];
const _carteWeightsByType = CARTE_COVER_WEIGHTS;
const _carteFideliteMatieres = [...CARTE_FIDELITE_MATIERES];
const _carteFideliteWeightsByType = CARTE_FIDELITE_WEIGHTS;
const _carteJeuxMatieres = [...CARTE_JEUX_MATIERES];

const _cartonGrammages = ['300g', '350g', '400g', '600g', 'Grammage personnalisé'];
const _cartonWeightsByMatiere: Record<string, string[]> = Object.fromEntries(
  ['Carton blanc', 'Carton kraft', 'Carton compact', 'Carton ondulé', 'Carton micro-cannelure', 'Carton rigide', 'Autre matière'].map(
    (m) => [m, _cartonGrammages],
  ),
);

const _bacheGrammages = ['440g', '510g', 'Grammage personnalisé'];
const _bacheWeightsByMatiere: Record<string, string[]> = {
  PVC: _bacheGrammages,
  Polyester: _bacheGrammages,
};

/** Roll-up & X-Banner — bâche + PP film indéchirable uniquement. */
const _rollupBannerMatieres = ['Bâche', 'PP film indéchirable'];
const _rollupBannerWeightsByMatiere: Record<string, string[]> = {
  Bâche: ['440g', '510g'],
  'PP film indéchirable': ['140g'],
};

const _rollupFormatsByType: Record<string, string[]> = {
  'Roll-up standard': ['80×200 cm', '85×200 cm'],
  'Roll-up deluxe / premium': ['80×200 cm', '85×200 cm', '100×200 cm', '120×200 cm', '150×200 cm'],
  'Roll-up mini': ['A4 — 210×297 mm', 'A3 — 297×420 mm'],
};

const _xbannerFormatsByType: Record<string, string[]> = {
  'X-Banner standard': ['80×200 cm', '85×200 cm', '100×200 cm', '120×200 cm', '150×200 cm'],
  'X-Banner mini': ['A4 — 210×297 mm', 'A3 — 297×420 mm'],
};

const _bookIntMatieres = [...BOOK_INTERIOR_MATIERES];
const _bookIntWeightsByMatiere = BOOK_INTERIOR_WEIGHTS;

const _bookCouvMatieres = [...BOOK_COVER_MATIERES];
const _bookCouvWeightsByMatiere = BOOK_COVER_WEIGHTS;

const _menuMatieres = [...BOOK_MENU_MATIERES];
const _menuWeightsByMatiere = BOOK_MENU_WEIGHTS;

const _evtAfficheWeightsByMatiere: Record<string, string[]> = {
  PCB: _printWeightsByType.PCB,
  PCM: _printWeightsByType.PCM,
  Offset: ['70g', '80g', '90g', '100g', 'Grammage personnalisé'],
  'Papier photo': ['200g', '250g', '300g', 'Grammage personnalisé'],
  'Dos bleu': ['120g', 'Grammage personnalisé'],
  'Matière personnalisée': ['Grammage personnalisé'],
};

/** Formats événementiel — du plus petit au plus grand (ISO courts + grands formats cm). */
const _evtFormatsGrand = [
  'A4', 'A3', 'A3+', 'A2', 'A1', 'A0',
  '30×60 cm', '40×80 cm', '60×120 cm', '80×120 cm', '100×200 cm', '120×40 cm',
  'Format personnalisé',
];
const _evtFormatsPhotocall = [
  '200×200 cm', '230×230 cm', '240×300 cm', '300×230 cm', '300×300 cm',
  '400×300 cm', '500×250 cm', '600×300 cm', 'Format personnalisé',
];
const _evtFormatsPhotobooth = [
  '150×200 cm', '200×200 cm', '200×250 cm', '230×230 cm', '240×300 cm', '300×230 cm',
  'Format personnalisé',
];
const _evtFormatsCarteVoeux = [
  'A6 — 105×148 mm', 'DL — 100×210 mm', 'Carré — 148×148 mm', 'A5 — 148×210 mm',
  'Format personnalisé',
];
const _evtFormatsPochette = ['DL', 'A5', 'A4', 'A3', 'Format personnalisé'];

const _evtRigidMatieres = ['PVC', 'PVC rigide', 'PVC expansé', 'Plexiglas', 'Acrylique', 'Matière personnalisée'];
const _evtRigidThickness: Record<string, string[]> = {
  PVC: ['2 mm', '3 mm', '5 mm', 'Épaisseur personnalisée'],
  'PVC rigide': ['3 mm', '5 mm', '8 mm', 'Épaisseur personnalisée'],
  'PVC expansé': ['3 mm', '5 mm', '10 mm', 'Épaisseur personnalisée'],
  Plexiglas: ['3 mm', '5 mm', '8 mm', '10 mm', 'Épaisseur personnalisée'],
  Acrylique: ['3 mm', '5 mm', '8 mm', '10 mm', 'Épaisseur personnalisée'],
  'Matière personnalisée': ['Épaisseur personnalisée'],
};

function _matiereGrammageSection(
  title: string,
  matiere: Omit<ConfigField, 'type' | 'label'> & { key: string; options: string[] },
  weightsByValue: Record<string, string[]>,
  grammageKey = 'grammage',
): ConfigSection {
  return {
    title,
    icon: '📃',
    layout: 'grid-2',
    fields: [
      {
        label: 'Matière',
        type: 'chips',
        forcePriceValues: ['Matière personnalisée', 'Autres', 'Autre matière'],
        customInput: 'material',
        ...matiere,
      },
      {
        key: grammageKey,
        label: 'Grammage',
        type: 'chips',
        options: [],
        forcePriceValues: ['Grammage personnalisé', 'Autres'],
        customInput: 'grammage',
        optionsFilter: { field: matiere.key, optionsByValue: weightsByValue },
      },
    ],
  };
}

export {
  BLOC_NOTE_COVER_MATIERES,
  BLOC_NOTE_COVER_WEIGHTS,
  BLOC_NOTE_INTERIEUR_FAMILLES,
  BLOC_NOTE_INTERIOR_WEIGHTS,
  BLOC_NOTE_RELIURE_OPTIONS,
  BOOK_COVER_MATIERES,
  CARTE_JEUX_FORMAT_OPTIONS,
  CARTERIE_COINS_OPTIONS,
  CARTERIE_FORMAT_OPTIONS,
  DOYPACK_COLOR_PALETTE,
  DOYPACK_PALETTES_BY_MATIERE,
  EXTENDED_COLOR_PALETTE,
  FACONNAGE_RELIURE_OPTIONS,
  FLYER_FORMAT_OPTIONS,
  FLYER_VOLET_OPTIONS,
  IMPRESSION_SF_FORMATS,
  IMPRESSION_SF_MATIERE_LABELS,
  IMPRESSION_SF_WEIGHTS_BY_MATIERE,
  LIVRES_MENU_TYPES,
  LIVRES_RELIURE_BY_TYPE,
  LIVRES_TYPES,
  ORIFLAMME_BASES,
  ORIFLAMME_MATIERES,
  ORIFLAMME_TYPES,
  PRESENTOIR_MAGASIN_FORMAT_OPTIONS,
  _bacheGrammages,
  _bacheWeightsByMatiere,
  _bookCouvMatieres,
  _bookCouvWeightsByMatiere,
  _bookIntMatieres,
  _bookIntWeightsByMatiere,
  _carteFideliteMatieres,
  _carteFideliteWeightsByType,
  _carteJeuxMatieres,
  _carteMatieres,
  _carteWeightsByType,
  _cartonGrammages,
  _cartonWeightsByMatiere,
  _evtAfficheWeightsByMatiere,
  _evtFormatsCarteVoeux,
  _evtFormatsGrand,
  _evtFormatsPhotobooth,
  _evtFormatsPhotocall,
  _evtFormatsPochette,
  _evtLuxeColorPalette,
  _evtRigidMatieres,
  _evtRigidThickness,
  _flyerMatieres,
  _flyerWeightsByType,
  _goodiesColors,
  _matiereGrammageSection,
  _menuMatieres,
  _menuWeightsByMatiere,
  _printMatieres,
  _printMatieresAliases,
  _printWeightsByType,
  _rollupBannerMatieres,
  _rollupBannerWeightsByMatiere,
  _rollupFormatsByType,
  _textileColors,
  _xbannerFormatsByType,
  livresTypesWithCover,
  livresTypesWithPages,
  oriflammeHauteursOptionsByType,
};
