/**
 * Matières premium cartes, couvertures livres & bloc-notes — alignées catalogue ANS / CV_RECTO.
 */

const CUSTOM = 'Grammage personnalisé';

/** Grammages identiques PCB & PCM — tous articles carte / couverture. */
export const PCB_PCM_GRAMMAGES = ['250g', '300g', '350g', '600g', '700g', CUSTOM] as const;

export const CARTERIE_FORMAT_OPTIONS = [
  '85×55 mm',
  '90×50 mm',
  '90×55 mm',
  '91×55 mm',
  'Carré — 55×55 mm',
  'Format personnalisé',
] as const;

export const CARTERIE_COINS_OPTIONS = ['Bord carré', 'Coin arrondi'] as const;

/** Formats classiques jeux de cartes (poker, bridge, tarot…). */
export const CARTE_JEUX_CLASSIC_FORMAT_OPTIONS = [
  'Poker — 63×88 mm',
  'Bridge — 57×89 mm',
  'Tarot — 61×112 mm',
  'Carré — 70×70 mm',
  'Mini — 44×67 mm',
] as const;

/** Carterie + formats jeux — un seul « Format personnalisé » en fin de liste. */
export const CARTE_JEUX_FORMAT_OPTIONS = [
  ...CARTERIE_FORMAT_OPTIONS.filter((f) => f !== 'Format personnalisé'),
  ...CARTE_JEUX_CLASSIC_FORMAT_OPTIONS,
  'Format personnalisé',
] as const;

export const CARTE_VISITE_MATIERES = [
  'PCB',
  'PCM',
  'Glossy',
  'Bristol',
  'Papier texturé avec motif',
  'Toile fin',
  'Invitation luxe',
  'Papier pelliculé mat',
  'Papier pelliculé brillant',
  'Kraft',
  'PVC opaque 1 mm',
  'Matière personnalisée',
] as const;

/** PVC translucide — couvertures livre & bloc-note uniquement (retiré carte de visite). */
export const CARTE_TRANSLUCIDE_MATIERE = 'PVC translucide 1 mm' as const;

/** Carte fidélité : PVC interdit (non tamponnable / non inscriptible). */
export const CARTE_FIDELITE_MATIERES = CARTE_VISITE_MATIERES.filter(
  (m) => !/pvc/i.test(m),
);

/** Jeux de cartes — papier épais uniquement (sans PVC translucide). */
export const CARTE_JEUX_MATIERES = CARTE_VISITE_MATIERES.filter(
  (m) => !/pvc translucide/i.test(m),
);

export const BOOK_COVER_MATIERES = [
  ...CARTE_VISITE_MATIERES.filter((m) => m !== 'Matière personnalisée'),
  CARTE_TRANSLUCIDE_MATIERE,
  'Carton rigide',
  'Matière personnalisée',
] as const;

/** Couverture bloc-note — sans papier pelliculé (réservé à finition / pelliculage). */
export const BLOC_NOTE_COVER_MATIERES = [
  ...CARTE_VISITE_MATIERES.filter((m) => !/papier pelliculé/i.test(m)),
  CARTE_TRANSLUCIDE_MATIERE,
] as const;

export const BLOC_NOTE_INTERIEUR_FAMILLES = [
  'Offset',
  'PCB',
  'PCM',
  'Papier spécial invitation',
  'Autres',
] as const;

/** Grammages intérieur bloc-note — invitation : strictement < 300g. */
export const BLOC_NOTE_INTERIOR_WEIGHTS: Record<string, string[]> = {
  Offset: ['70g', '80g', '90g', 'Autres'],
  PCB: ['70g', '80g', '90g', 'Autres'],
  PCM: ['70g', '80g', '90g', 'Autres'],
  'Papier spécial invitation': [
    '90g', '100g', '115g', '130g', '135g', '150g', '170g', '200g', '230g', '250g', 'Autres',
  ],
  Autres: ['70g', '80g', '90g', 'Autres'],
};

const _pelliculeGrammages = ['320g', '370g', CUSTOM];

export const CARTE_COVER_WEIGHTS: Record<string, string[]> = {
  PCB: [...PCB_PCM_GRAMMAGES],
  PCM: [...PCB_PCM_GRAMMAGES],
  Glossy: ['250g', '300g', CUSTOM],
  Bristol: ['250g', '300g', '350g', CUSTOM],
  'Papier texturé avec motif': ['250g', '300g', '350g', CUSTOM],
  'Toile fin': ['270g', CUSTOM],
  'Invitation luxe': ['230g', '250g', '300g', '325g', CUSTOM],
  'Papier pelliculé mat': _pelliculeGrammages,
  'Papier pelliculé brillant': _pelliculeGrammages,
  Kraft: ['230g', '300g', CUSTOM],
  'PVC opaque 1 mm': ['1 mm'],
  'PVC translucide 1 mm': ['1 mm'],
  'Carton rigide': ['350g', '600g', '750g', CUSTOM],
  'Matière personnalisée': [CUSTOM],
};

/** Grammages carte fidélité — Kraft 230g autorisé ; Toile fin en bases Blanc / Beige. */
export const CARTE_FIDELITE_WEIGHTS: Record<string, string[]> = {
  ...CARTE_COVER_WEIGHTS,
  Kraft: ['230g', '250g', '300g', CUSTOM],
  'Toile fin': ['Blanc', 'Beige'],
};

/** Grammages couverture bloc-note — Glossy inclut 600g (règle globale sans 350/400/700/750). */
export const BLOC_NOTE_COVER_WEIGHTS: Record<string, string[]> = {
  ...CARTE_COVER_WEIGHTS,
  Glossy: ['250g', '300g', '600g', CUSTOM],
};

export const CARTE_MATIERE_NOTES: Record<string, string> = {
  'Papier texturé avec motif':
    'Préciser le motif en remarque : cuir, carreaux, pois, lin, bois, etc.',
  'Toile fin': 'Teinte beige ou blanc — préciser en remarque (carte visite). Carte fidélité : choisir Blanc ou Beige.',
  'Papier pelliculé mat': 'Support PCB ou Glossy pelliculé mat (320g / 370g).',
  'Papier pelliculé brillant': 'Support PCB ou Glossy pelliculé brillant (320g / 370g).',
  'Invitation luxe': 'Papier spécial invitation haut de gamme.',
  'PVC translucide 1 mm': 'Recto uniquement — interdit en recto-verso.',
  'PVC opaque 1 mm': 'Support carte PVC 1 mm — recto ou recto-verso.',
  Kraft: 'Kraft 230g recommandé pour cartes éco / naturelles.',
};

/** Grammage minimum carte visite & supports rigides comparables — voir thick-paper-grammage-policy. */
export { THICK_PAPER_MIN_GRAMMAGE_G, FIDELITE_MIN_GRAMMAGE_G as CARTE_FIDELITE_MIN_GRAMMAGE_G } from '@/lib/pos/thick-paper-grammage-policy';
