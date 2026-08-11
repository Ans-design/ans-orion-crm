import { parsePaperGrammageG } from '@/lib/pos/thick-paper-grammage-policy';

/** Grammages interdits pour la matière Glossy (toute la POS). */
export const GLOSSY_FORBIDDEN_GRAMMAGE_G_LIST = [350, 400, 700, 750] as const;

/** @deprecated Utiliser GLOSSY_FORBIDDEN_GRAMMAGE_G_LIST */
export const GLOSSY_FORBIDDEN_GRAMMAGE_G = 350;

export function isGlossyMatiereLabel(matiere: string | undefined | null): boolean {
  const m = String(matiere ?? '').trim().toLowerCase();
  return m === 'glossy' || m.startsWith('glossy ');
}

export function isForbiddenGlossyGrammage(grammage: string): boolean {
  const g = parsePaperGrammageG(grammage);
  return g != null && (GLOSSY_FORBIDDEN_GRAMMAGE_G_LIST as readonly number[]).includes(g);
}

/** Retire les grammages Glossy interdits lorsque la matière parente est Glossy. */
export function filterGlossyGrammageOptions(
  matiere: string | undefined | null,
  options: string[],
): string[] {
  if (!isGlossyMatiereLabel(matiere)) return options;
  return options.filter((o) => !isForbiddenGlossyGrammage(o));
}

/** Réinitialise un grammage Glossy 350g encore présent en config. */
export function applyGlossyMaterialRules(config: Record<string, unknown>): Record<string, unknown> {
  let next = { ...config };
  const matKeys = ['matiere', 'paperType', 'famille_papier', 'matiere_int', 'matiere_couv', 'matiere_couverture'];
  const hasGlossyParent = matKeys.some((k) => isGlossyMatiereLabel(String(next[k] ?? '')));

  if (!hasGlossyParent) return next;

  for (const [key, val] of Object.entries(next)) {
    if (!key.startsWith('grammage') && !key.startsWith('paperWeight')) continue;
    if (isForbiddenGlossyGrammage(String(val ?? ''))) {
      next[key] = '';
    }
  }
  return next;
}
