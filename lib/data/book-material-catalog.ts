/**
 * Matières & grammages livres — intérieur aligné bloc-note, couverture premium inchangée.
 */
import {
  BLOC_NOTE_INTERIEUR_FAMILLES,
  BLOC_NOTE_INTERIOR_WEIGHTS,
  BOOK_COVER_MATIERES,
  CARTE_COVER_WEIGHTS,
  CARTE_VISITE_MATIERES,
} from './carte-cover-material-catalog';
import { officialWeightsByLabels } from './print-material-weights';

export const BOOK_INTERIOR_MATIERES = [...BLOC_NOTE_INTERIEUR_FAMILLES];

export const BOOK_INTERIOR_WEIGHTS: Record<string, string[]> = {
  ...BLOC_NOTE_INTERIOR_WEIGHTS,
};

export { BOOK_COVER_MATIERES, CARTE_VISITE_MATIERES };

export const BOOK_COVER_WEIGHTS: Record<string, string[]> = {
  ...CARTE_COVER_WEIGHTS,
  ...officialWeightsByLabels(
    BOOK_COVER_MATIERES.filter((m) => !CARTE_COVER_WEIGHTS[m]),
    { 'Matière personnalisée': ['Grammage personnalisé'] },
  ),
};

export const BOOK_MENU_MATIERES = ['PCB', 'PCM', 'Bristol', 'Matière personnalisée'] as const;

export const BOOK_MENU_WEIGHTS: Record<string, string[]> = officialWeightsByLabels(
  [...BOOK_MENU_MATIERES],
  { 'Matière personnalisée': ['Grammage personnalisé'] },
);
