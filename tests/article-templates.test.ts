import { describe, expect, it } from 'vitest';
import { ARTICLE_TEMPLATES } from '@/lib/data/article-templates';

describe('article templates', () => {
  it('expose au moins 7 modèles métier', () => {
    expect(ARTICLE_TEMPLATES.length).toBeGreaterThanOrEqual(7);
    const ids = new Set(ARTICLE_TEMPLATES.map((t) => t.id));
    expect(ids.size).toBe(ARTICLE_TEMPLATES.length);
  });

  it('chaque modèle a famille et type de calcul', () => {
    for (const t of ARTICLE_TEMPLATES) {
      expect(t.family).toBeTruthy();
      expect(t.calculationType).toBeTruthy();
      expect(t.defaultVariables.length).toBeGreaterThan(0);
    }
  });
});
