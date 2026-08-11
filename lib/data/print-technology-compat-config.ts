/**
 * Compatibilité matière / grammage / article ↔ technologie d'impression.
 * Source admin (SystemConfig) — règles par défaut synchronisées catalogue / POS.
 */
export type PrintTechnologyCompatRule = {
  id: string;
  matiere?: string | null;
  grammageG?: number | null;
  articleId?: string | null;
  allowedTechnologies?: string[] | null;
  forbiddenTechnologies: string[];
  active: boolean;
  note?: string;
};

export const PRINT_TECHNOLOGY_COMPAT_CONFIG_KEY = 'pos_print_technology_compat';

export const DEFAULT_PRINT_TECHNOLOGY_COMPAT_RULES: PrintTechnologyCompatRule[] = [
  {
    id: 'pcb-no-inkjet',
    matiere: 'PCB',
    forbiddenTechnologies: ["Jet d'encre"],
    active: true,
    note: "Le jet d'encre n'adhère pas sur PCB couché.",
  },
  {
    id: 'pcm-no-inkjet',
    matiere: 'PCM',
    forbiddenTechnologies: ["Jet d'encre"],
    active: true,
    note: "Le jet d'encre n'adhère pas sur PCM couché.",
  },
];
