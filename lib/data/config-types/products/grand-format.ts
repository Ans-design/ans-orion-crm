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
// GRAND FORMAT — structure unifiée (surface 2D, formats A, sans matière papier)
// ═══════════════════════════════════════════════════════════════

const _GF_STD_FORMATS = [
  'A5 — 148×210 mm',
  'A4 — 210×297 mm',
  'A3 — 297×420 mm',
  'A2 — 420×594 mm',
  'A1 — 594×841 mm',
  'A0 — 841×1189 mm',
  'Format personnalisé',
] as const;
const _GF_FORMAT_PERSO = 'Format personnalisé';

const _GF_FINITION_VINYL = ['Sans finition', 'Découpe droite', 'Découpe forme personnalisée', 'Lamination', 'Finition personnalisée'];
const _GF_FINITION_BACHE = ['Sans finition', 'Œillets', 'Ourlets', 'Fourreaux', 'Renfort', 'Finition personnalisée'];
const _GF_FINITION_RIGID = ['Sans finition', 'Découpe droite', 'Découpe forme personnalisée', 'Perçage', 'Entretoises', 'Finition personnalisée'];

type GfFaceMode = 'none' | 'recto_only' | 'recto_verso';
type GfFinitionMode = 'none' | 'vinyl' | 'bache' | 'rigid';

type GfStandardOpts = {
  prixM2?: number;
  aliases?: string[];
  /** Laizes injectées dynamiquement depuis le stock (API grand-format). */
  withLaize?: 'rouleau' | 'plaque';
  face?: GfFaceMode;
  finition?: GfFinitionMode;
  epaisseur?: string[];
  grammage?: string[];
  extraSections?: ConfigSection[];
};

function _gfLaizeSection(kind: 'rouleau' | 'plaque'): ConfigSection {
  /** Laize / plaque : uniquement format personnalisé (ISO A0–A5 hors laize). */
  const customOnly = { field: 'format', values: [_GF_FORMAT_PERSO] as string[] };
  if (kind === 'plaque') {
    return {
      title: 'LAIZE DISPONIBLE',
      icon: '📏',
      showWhen: customOnly,
      fields: [
        {
          key: 'laize_plaque',
          label: 'Dimension plaque',
          type: 'chips',
          options: [],
          note: 'Selon plaques disponibles en stock',
          forcePriceValues: ['Autres'],
        },
        {
          key: 'laize_plaque_autre',
          label: 'Largeur plaque personnalisée (cm)',
          type: 'number',
          min: 1,
          suffix: 'cm',
          showWhen: { field: 'laize_plaque', values: ['Autres'] },
        },
      ],
    };
  }
  return {
    title: 'Laize',
    icon: '📏',
    showWhen: customOnly,
    fields: [
      {
        key: 'laize',
        label: 'Laize',
        type: 'chips',
        options: [],
        note: 'Choisir après les dimensions — selon laizes disponibles en stock',
        forcePriceValues: ['Autres'],
      },
      {
        key: 'laize_autre',
        label: 'Laize personnalisée (cm)',
        type: 'number',
        min: 1,
        suffix: 'cm',
        showWhen: { field: 'laize', values: ['Autres'] },
      },
    ],
  };
}

function _gfFormatSection(): ConfigSection {
  return {
    title: 'Format',
    icon: '📐',
    layout: 'grid-3',
    fields: [
      {
        key: 'format',
        label: 'Format',
        type: 'chips',
        options: [..._GF_STD_FORMATS],
        forcePriceValues: [_GF_FORMAT_PERSO],
      },
      {
        key: 'largeur_cm',
        label: 'Largeur (cm)',
        type: 'number',
        min: 1,
        suffix: 'cm',
        showWhen: { field: 'format', values: [_GF_FORMAT_PERSO] },
      },
      {
        key: 'hauteur_cm',
        label: 'Hauteur (cm)',
        type: 'number',
        min: 1,
        suffix: 'cm',
        showWhen: { field: 'format', values: [_GF_FORMAT_PERSO] },
      },
    ],
  };
}

function _gfStandardConfig(opts: GfStandardOpts): ProductConfig {
  const sections: ConfigSection[] = [];

  if (opts.grammage?.length) {
    sections.push({
      title: 'Grammage',
      icon: '⚖️',
      fields: [{ key: 'grammage', label: 'Grammage', type: 'chips', options: opts.grammage }],
    });
  }

  if (opts.epaisseur?.length) {
    sections.push({
      title: 'Épaisseur',
      icon: '📊',
      fields: [
        {
          key: 'epaisseur',
          label: 'Épaisseur',
          type: 'chips',
          options: opts.epaisseur,
          forcePriceValues: opts.epaisseur.includes('Autres') ? ['Autres'] : [],
        },
        {
          key: 'epaisseur_autre',
          label: 'Épaisseur personnalisée (mm)',
          type: 'number',
          min: 1,
          suffix: 'mm',
          showWhen: { field: 'epaisseur', values: ['Autres'] },
        },
      ],
    });
  }

  sections.push(_gfFormatSection());

  if (opts.withLaize) {
    sections.push(_gfLaizeSection(opts.withLaize));
  }

  if (opts.face === 'recto_only') {
    sections.push({
      title: 'Impression',
      icon: '🖨️',
      fields: [{ key: 'face', label: 'Impression', type: 'chips', options: ['Recto seul'] }],
    });
  } else if (opts.face === 'recto_verso') {
    sections.push({
      title: 'Impression',
      icon: '🖨️',
      fields: [{ key: 'face', label: 'Impression', type: 'chips', options: ['Recto seul', 'Recto-Verso'] }],
    });
  }

  if (opts.finition === 'vinyl') {
    sections.push({
      title: 'Finition',
      icon: '✨',
      fields: [{
        key: 'finition',
        label: 'Finition',
        type: 'chips',
        options: _GF_FINITION_VINYL,
        forcePriceValues: ['Finition personnalisée'],
      }],
    });
  } else if (opts.finition === 'bache') {
    sections.push({
      title: 'Finition',
      icon: '✨',
      fields: [{
        key: 'finition',
        label: 'Finition',
        type: 'chips',
        options: _GF_FINITION_BACHE,
        forcePriceValues: ['Finition personnalisée'],
      }],
    });
  } else if (opts.finition === 'rigid') {
    sections.push({
      title: 'Finition',
      icon: '✨',
      fields: [{
        key: 'finition',
        label: 'Finition',
        type: 'chips',
        options: _GF_FINITION_RIGID,
        forcePriceValues: ['Finition personnalisée'],
      }],
    });
  }

  if (opts.extraSections?.length) sections.push(...opts.extraSections);

  sections.push(
    {
      title: 'Quantité',
      icon: '📦',
      fields: [{
        key: 'qty',
        label: 'Quantité',
        type: 'number',
        min: 1,
        presets: [1, 2, 5, 10, 25],
        note: 'Prix = surface (m²) × prix/m² × quantité',
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarque / détails', type: 'textarea' }],
    },
  );

  return {
    qtyMin: 1,
    qtyDefault: 1,
    qtyPresets: [1, 2, 5, 10, 25],
    prixM2: opts.prixM2,
    aliases: opts.aliases,
    sections,
  };
}

const GF_VINYL = _gfStandardConfig({
  prixM2: 20000,
  withLaize: 'rouleau',
  finition: 'vinyl',
});

const GF_VINYL_TRANSP = _gfStandardConfig({
  prixM2: 22000,
  withLaize: 'rouleau',
});

const GF_ONEWAY = _gfStandardConfig({
  prixM2: 30000,
  withLaize: 'rouleau',
  aliases: ['One-Way Vision', 'One-Way Vision 140g', 'Vision microperforé', 'Microperforé'],
});

const GF_DOSBLEU = _gfStandardConfig({
  prixM2: 23000,
  withLaize: 'rouleau',
  extraSections: [{
    title: 'Aspect / finition surface',
    icon: '✨',
    fields: [{
      key: 'aspect',
      label: 'Aspect',
      type: 'chips',
      options: ['Mat', 'Brillant', 'Satiné'],
      default: 'Mat',
    }],
  }],
});

const GF_REFLECHISSANT = _gfStandardConfig({
  prixM2: 46000,
  withLaize: 'rouleau',
});

const GF_BACHE_WIDE = _gfStandardConfig({
  prixM2: 30000,
  withLaize: 'rouleau',
  face: 'recto_verso',
  finition: 'bache',
});

/** Palette dos bâche — blanc / noir / gris / autres */
const BACHE_DOS_PALETTE = [
  { id: 'blanc', label: 'Dos blanc', hex: '#FFFFFF' },
  { id: 'noir', label: 'Dos noir', hex: '#1A1A1A' },
  { id: 'gris', label: 'Dos gris', hex: '#808080' },
  { id: 'custom', label: 'Autres', hex: '#E5E7EB', badge: 'Sur devis' },
];

/** Configurateur bâche unifié — ordre UX : type → grammage → format → laize → dos → aspect */
const GF_BACHE_UNIFIED: ProductConfig = {
  qtyMin: 1,
  qtyDefault: 1,
  qtyPresets: [1, 2, 5, 10, 25],
  prixM2: 20000,
  aliases: [
    'Bâche 440G', 'Mesh 270G', 'Bâche large', 'Bache', 'bache', 'Mesh', 'bâche',
    'dos noir', 'dos blanc', 'bache 440', 'bache 320', 'mesh', 'banderole',
  ],
  sections: [
    {
      title: 'Type de bâche',
      icon: '🏗️',
      fields: [{
        key: 'type_bache',
        label: 'Type de bâche',
        type: 'chips',
        options: ['Bâche PVC standard', 'Bâche PVC renforcée', 'Mesh micro-perforé', 'Autres'],
        forcePriceValues: ['Autres'],
      }],
    },
    {
      title: 'Grammage',
      icon: '⚖️',
      fields: [{
        key: 'grammage',
        label: 'Grammage',
        type: 'chips',
        options: ['270g', '440g', '510g', '650g', 'Autres'],
        forcePriceValues: ['Autres'],
      }],
    },
    {
      title: 'Format / dimensions',
      icon: '📐',
      layout: 'grid-3',
      fields: [
        {
          key: 'format',
          label: 'Format',
          type: 'chips',
          options: ['A4 — 210×297 mm', 'A3 — 297×420 mm', 'A2 — 420×594 mm', 'A1 — 594×841 mm', 'A0 — 841×1189 mm', 'Format personnalisé'],
          forcePriceValues: ['Format personnalisé'],
        },
        {
          key: 'longueur_cm',
          label: 'Longueur',
          type: 'number',
          min: 1,
          suffix: 'cm',
          showWhen: { field: 'format', values: ['Format personnalisé'] },
        },
        {
          key: 'largeur_cm',
          label: 'Largeur / hauteur',
          type: 'number',
          min: 1,
          suffix: 'cm',
          showWhen: { field: 'format', values: ['Format personnalisé'] },
        },
      ],
    },
    {
      title: 'Laize',
      icon: '📏',
      showWhen: { field: 'format', values: ['Format personnalisé'] },
      fields: [
        {
          key: 'laize',
          label: 'Laize',
          type: 'chips',
          options: ['1m', '1m40', '1m60', '1m80', '2m40', '3m20', 'Autres'],
          note: 'Choisir après les dimensions — laize recommandée affichée dans le récapitulatif',
          forcePriceValues: ['Autres'],
        },
        {
          key: 'laize_autre',
          label: 'Laize personnalisée (cm)',
          type: 'number',
          min: 1,
          suffix: 'cm',
          showWhen: { field: 'laize', values: ['Autres'] },
        },
      ],
    },
    {
      title: 'Couleur du dos / support',
      icon: '🎨',
      fields: [{
        key: 'dos',
        label: 'Couleur du dos',
        type: 'color_palette',
        palette: BACHE_DOS_PALETTE,
        default: 'Dos blanc',
      }],
    },
    {
      title: 'Aspect / finition surface',
      icon: '✨',
      fields: [{
        key: 'aspect',
        label: 'Aspect',
        type: 'chips',
        options: ['Mat', 'Brillant', 'Autres'],
        default: 'Mat',
        forcePriceValues: ['Autres'],
      }],
    },
    {
      title: 'Impression',
      icon: '🖨️',
      fields: [{
        key: 'face',
        label: 'Impression',
        type: 'chips',
        options: ['Recto seul', 'Recto-Verso'],
        default: 'Recto seul',
        note: 'Recto-Verso disponible uniquement sur dos blanc',
      }],
    },
    {
      title: 'Œillets',
      icon: '⭕',
      fields: [{
        key: 'oeillets_data',
        label: 'Positionnez les œillets sur la bâche',
        type: 'bache_eyelets',
        default: { mode: 'Aucun', count: 0, positions: [] },
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
        presets: [1, 2, 5, 10, 25],
        note: 'Prix = surface facturable (m²) × prix/m² × quantité + œillets',
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarque / détails', type: 'textarea' }],
    },
  ],
};

const GF_TISSU_DRAPEAU = _gfStandardConfig({
  prixM2: 30000,
  withLaize: 'rouleau',
});

const GF_FROSTED = _gfStandardConfig({
  prixM2: 46000,
  withLaize: 'rouleau',
});

const GF_PVC = _gfStandardConfig({
  prixM2: 110000,
  withLaize: 'plaque',
  face: 'recto_verso',
  finition: 'rigid',
  epaisseur: ['3 mm', '5 mm', '6 mm', '10 mm', '20 mm', 'Autres'],
  aliases: ['PVC rigide', 'Forex', 'PVC 3mm', 'PVC 5mm', 'PVC 6mm', 'PVC 10mm', 'PVC 20mm'],
});

const GF_PLEXI = _gfStandardConfig({
  prixM2: 200000,
  withLaize: 'plaque',
  face: 'recto_verso',
  finition: 'rigid',
  epaisseur: ['3 mm', '5 mm', 'Autres'],
  aliases: ['Plexiglas', 'Plexi', 'Plexiglas 3mm', 'Plexiglas 5mm'],
});

/** Palette couleur plaque opaque — Acrylic */
const ACRYLIC_PLATE_COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'blanc', label: 'Blanc', hex: '#FFFFFF' },
  { id: 'gris_clair', label: 'Gris clair', hex: '#C0C0C0' },
  { id: 'gris_fonce', label: 'Gris foncé', hex: '#555555' },
  { id: 'noir', label: 'Noir', hex: '#1A1A1A' },
  { id: 'rouge', label: 'Rouge', hex: '#D32F2F' },
  { id: 'orange', label: 'Orange', hex: '#FB8C00' },
  { id: 'jaune', label: 'Jaune', hex: '#FDD835' },
  { id: 'vert', label: 'Vert', hex: '#388E3C' },
  { id: 'bleu', label: 'Bleu', hex: '#1E88E5' },
  { id: 'violet', label: 'Violet', hex: '#7B1FA2' },
  { id: 'rose', label: 'Rose', hex: '#E91E63' },
  { id: 'marron', label: 'Marron', hex: '#5D4037' },
];

/** Palette couleur plaque transparente — Acrylic */
const ACRYLIC_TRANSPARENT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: 'transparent', label: 'Transparent', hex: '#F0F9FF' },
  { id: 'transparent_rouge', label: 'Transparent rouge', hex: '#FFCDD2' },
  { id: 'transparent_orange', label: 'Transparent orange', hex: '#FFE0B2' },
  { id: 'transparent_jaune', label: 'Transparent jaune', hex: '#FFF9C4' },
  { id: 'transparent_vert', label: 'Transparent vert', hex: '#C8E6C9' },
  { id: 'transparent_bleu', label: 'Transparent bleu', hex: '#BBDEFB' },
  { id: 'transparent_violet', label: 'Transparent violet', hex: '#E1BEE7' },
  { id: 'transparent_rose', label: 'Transparent rose', hex: '#F8BBD0' },
  { id: 'transparent_fume', label: 'Transparent fumé', hex: '#B0BEC5' },
];

/** Palette dos PP film — blanc / gris (comme bâche) */
const PP_DOS_PALETTE = [
  { id: 'blanc', label: 'Blanc', hex: '#FFFFFF' },
  { id: 'gris', label: 'Gris', hex: '#808080' },
  { id: 'custom', label: 'Autres', hex: '#E5E7EB', badge: 'Sur devis' },
];

const GF_ACRYLIC: ProductConfig = {
  qtyMin: 1,
  qtyDefault: 1,
  qtyPresets: [1, 2, 5, 10, 25],
  prixM2: 200000,
  aliases: ['Acrylic', 'Acrylic 1/3/5mm', 'Acrylique 1/3/5mm'],
  sections: [
    _gfFormatSection(),
    {
      title: 'LAIZE DISPONIBLE',
      icon: '📏',
      showWhen: { field: 'format', values: [_GF_FORMAT_PERSO] },
      fields: [
        {
          key: 'laize_plaque',
          label: 'Dimension plaque',
          type: 'chips',
          options: [],
          note: 'Selon plaques disponibles en stock',
          forcePriceValues: ['Autres'],
        },
        {
          key: 'laize_plaque_autre',
          label: 'Largeur plaque personnalisée (cm)',
          type: 'number',
          min: 1,
          suffix: 'cm',
          showWhen: { field: 'laize_plaque', values: ['Autres'] },
        },
      ],
    },
    {
      title: 'Face',
      icon: '🖨️',
      fields: [
        { key: 'face', label: 'Face', type: 'chips', options: ['Recto seul', 'Recto-Verso'] },
      ],
    },
    {
      title: 'Épaisseur',
      icon: '📊',
      fields: [
        { key: 'epaisseur', label: 'Épaisseur', type: 'chips', options: ['1 mm', '3 mm', '5 mm', 'Autres'], forcePriceValues: ['Autres'] },
        {
          key: 'epaisseur_autre',
          label: 'Épaisseur personnalisée (mm)',
          type: 'number',
          min: 1,
          suffix: 'mm',
          showWhen: { field: 'epaisseur', values: ['Autres'] },
        },
      ],
    },
    {
      title: 'Couleur de la plaque',
      icon: '🎨',
      fields: [
        {
          key: 'couleur_plaque',
          label: 'Couleur opaque',
          type: 'color_palette',
          palette: ACRYLIC_PLATE_COLORS,
          note: 'Couleurs opaques de la plaque',
        },
      ],
    },
    {
      title: 'Couleur transparente',
      icon: '🎨',
      fields: [
        {
          key: 'couleur_transparente',
          label: 'Couleur transparente',
          type: 'color_palette',
          palette: ACRYLIC_TRANSPARENT_COLORS,
          note: 'Teintes transparentes (option complémentaire)',
        },
      ],
    },
    {
      title: 'Finition',
      icon: '✨',
      fields: [{
        key: 'finition',
        label: 'Finition',
        type: 'chips',
        options: _GF_FINITION_RIGID,
        forcePriceValues: ['Finition personnalisée'],
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
        presets: [1, 2, 5, 10, 25],
        note: 'Prix = surface (m²) × prix/m² × quantité',
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarque / détails', type: 'textarea' }],
    },
  ],
};

const GF_PAPIER_PHOTO = _gfStandardConfig({
  prixM2: 25000,
  withLaize: 'rouleau',
  aliases: ['Papier photo grand format', 'Papier photo GF 140g'],
});

const GF_PP: ProductConfig = {
  qtyMin: 1,
  qtyDefault: 1,
  qtyPresets: [1, 2, 5, 10, 25],
  prixM2: 20000,
  aliases: ['PP film', 'PP indéchirable'],
  sections: [
    _gfFormatSection(),
    _gfLaizeSection('rouleau'),
    {
      title: 'Couleur du support',
      icon: '🎨',
      fields: [{
        key: 'dos',
        label: 'Couleur du support',
        type: 'color_palette',
        palette: PP_DOS_PALETTE,
        default: 'Blanc',
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
        presets: [1, 2, 5, 10, 25],
        note: 'Prix = surface (m²) × prix/m² × quantité',
      }],
    },
    {
      title: 'Remarque / détails',
      icon: '📝',
      fields: [{ key: 'remarques', label: 'Remarque / détails', type: 'textarea' }],
    },
  ],
};

const GF_TOILE = _gfStandardConfig({
  prixM2: 30000,
  withLaize: 'rouleau',
  extraSections: [{
    title: 'Châssis',
    icon: '🏗️',
    fields: [{
      key: 'chassis',
      label: 'Châssis',
      type: 'chips',
      options: ['Châssis 2 cm', 'Châssis 4 cm', 'Sans châssis (toile roulée)', 'Châssis personnalisé'],
      forcePriceValues: ['Châssis personnalisé'],
    }],
  }],
});



export {
  GF_VINYL,
  GF_VINYL_TRANSP,
  GF_ONEWAY,
  GF_DOSBLEU,
  GF_REFLECHISSANT,
  GF_BACHE_WIDE,
  BACHE_DOS_PALETTE,
  GF_BACHE_UNIFIED,
  GF_TISSU_DRAPEAU,
  GF_FROSTED,
  GF_PVC,
  GF_PLEXI,
  PP_DOS_PALETTE,
  GF_ACRYLIC,
  GF_PAPIER_PHOTO,
  GF_PP,
  GF_TOILE,
};
