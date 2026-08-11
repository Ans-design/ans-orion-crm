import { isRectoVerso } from '@/lib/pricing/config-normalize';
import {
  CARTE_FIDELITE_MATIERES,
  CARTE_JEUX_MATIERES,
  THICK_PAPER_MIN_GRAMMAGE_G,
  CARTE_FIDELITE_MIN_GRAMMAGE_G,
} from '@/lib/data/carte-cover-material-catalog';
import {
  filterThickPaperGrammageOptions,
  getMinGrammageG,
  parsePaperGrammageG,
} from '@/lib/pos/thick-paper-grammage-policy';

export const CARTE_RECTO_ONLY_MATIERES = [
  'PVC translucide 1 mm',
  'Toile fin',
] as const;

export function isCarteArticleId(articleId: string): boolean {
  return (
    articleId === 'cv-std'
    || articleId === 'cv-fidelite'
    || articleId === 'cv-jeux'
    || articleId.startsWith('carte_')
  );
}

export function isFideliteArticleId(articleId: string): boolean {
  return articleId === 'cv-fidelite' || articleId === 'carte_fidelite';
}

export function isJeuxCartesArticleId(articleId: string): boolean {
  return articleId === 'cv-jeux' || articleId === 'jeux_cartes';
}

export function isCarteRectoOnlyMatiere(matiere: string): boolean {
  const m = matiere.trim().toLowerCase();
  if (!m) return false;
  return CARTE_RECTO_ONLY_MATIERES.some((label) => m === label.toLowerCase())
    || /pvc\s*translucide/i.test(matiere);
}

export function isFideliteForbiddenMatiere(matiere: string): boolean {
  return /pvc/i.test(matiere.trim());
}

export function filterCarteMatiereOptions(articleId: string, options: string[]): string[] {
  if (isFideliteArticleId(articleId)) {
    const allowed = new Set(CARTE_FIDELITE_MATIERES.map((m) => m.toLowerCase()));
    return options.filter(
      (o) => allowed.has(o.toLowerCase()) && !isFideliteForbiddenMatiere(o),
    );
  }
  if (isJeuxCartesArticleId(articleId)) {
    const allowed = new Set(CARTE_JEUX_MATIERES.map((m) => m.toLowerCase()));
    return options.filter((o) => allowed.has(o.toLowerCase()));
  }
  if (articleId === 'cv-std' || articleId === 'carte_visite') {
    return options.filter((o) => !/pvc\s*translucide/i.test(o));
  }
  return options;
}

export function filterCarteFaceOptions(matiere: string, options: string[]): string[] {
  if (!isCarteRectoOnlyMatiere(matiere)) return options;
  return options.filter((o) => !isRectoVerso(o));
}

export function isFideliteGrammageTooLight(grammage: string, matiere?: string): boolean {
  const mat = matiere?.trim().toLowerCase() ?? '';
  const g = grammage.trim();
  if (mat === 'kraft' && g === '230g') return false;
  if (mat === 'toile fin') {
    if (!g) return false;
    if (/^blanc$/i.test(g) || /^beige$/i.test(g)) return false;
    if (/personnalis/i.test(g)) return false;
    return true;
  }
  const parsed = parsePaperGrammageG(grammage);
  if (parsed == null) return false;
  const min = getMinGrammageG('cv-fidelite', 'grammage');
  if (min == null) return false;
  return parsed < min;
}

export function filterCarteGrammageOptions(
  articleId: string,
  matiere: string,
  options: string[],
  grammageKey: string,
  category?: string,
): string[] {
  let opts = filterThickPaperGrammageOptions(articleId, options, grammageKey, category);
  if (isFideliteArticleId(articleId) && matiere.trim().toLowerCase() === 'kraft') {
    opts = options.filter((opt) => {
      const g = parsePaperGrammageG(opt);
      if (g == null) return true;
      return g >= 230;
    });
  }
  return opts;
}

export function isCarteVisiteGrammageTooLight(grammage: string): boolean {
  const min = getMinGrammageG('cv-std', 'grammage');
  if (min == null) return false;
  const g = parsePaperGrammageG(grammage);
  if (g == null) return false;
  return g < min;
}

/** Applique les règles métier après changement matière / face / grammage. */
export function applyCarteMaterialRules(
  articleId: string,
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (!isCarteArticleId(articleId)) return config;

  let next = { ...config };
  const matiere = String(next.matiere ?? '').trim();
  const face = String(next.face ?? '').trim();
  const grammage = String(next.grammage ?? '').trim();

  if (isFideliteArticleId(articleId) && isFideliteForbiddenMatiere(matiere)) {
    next.matiere = '';
    next.grammage = '';
  }

  if (articleId === 'cv-std' && /pvc\s*translucide/i.test(matiere)) {
    next.matiere = '';
    next.grammage = '';
  }

  if (isJeuxCartesArticleId(articleId) && /pvc\s*translucide/i.test(matiere)) {
    next.matiere = '';
    next.grammage = '';
  }

  const matiereAfterPurge = String(next.matiere ?? '').trim();

  if (isCarteRectoOnlyMatiere(matiereAfterPurge) && isRectoVerso(face)) {
    next.face = 'Recto';
  }

  if (isFideliteArticleId(articleId) && isFideliteGrammageTooLight(grammage, matiereAfterPurge)) {
    next.grammage = '';
  }

  if (articleId === 'cv-std' && isCarteVisiteGrammageTooLight(grammage)) {
    next.grammage = '';
  }

  if (isJeuxCartesArticleId(articleId) && isCarteVisiteGrammageTooLight(grammage)) {
    next.grammage = '';
  }

  return next;
}

export {
  CARTE_FIDELITE_MATIERES,
  CARTE_JEUX_MATIERES,
  THICK_PAPER_MIN_GRAMMAGE_G,
  CARTE_FIDELITE_MIN_GRAMMAGE_G,
};
