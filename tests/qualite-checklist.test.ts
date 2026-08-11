import { describe, expect, it } from 'vitest';
import {
  buildDefaultChecklist,
  checklistProgress,
  isChecklistComplete,
  normalizeChecklist,
  QUALITE_CHECKLIST_TEMPLATE,
} from '@/lib/qualite/checklist-definition';

describe('qualite checklist', () => {
  it('expose 13 points de contrôle métier', () => {
    expect(QUALITE_CHECKLIST_TEMPLATE).toHaveLength(13);
    expect(QUALITE_CHECKLIST_TEMPLATE[0].key).toBe('fichier_conforme');
    expect(QUALITE_CHECKLIST_TEMPLATE.at(-1)?.key).toBe('livraison_prete');
  });

  it('normalise une checklist partielle', () => {
    const items = normalizeChecklist([
      { key: 'bat_respecte', label: 'BAT respecté', checked: true },
    ]);
    expect(items).toHaveLength(13);
    expect(items.find((i) => i.key === 'bat_respecte')?.checked).toBe(true);
    expect(items.find((i) => i.key === 'fichier_conforme')?.checked).toBe(false);
  });

  it('calcule la progression', () => {
    const all = buildDefaultChecklist().map((i, idx) => ({ ...i, checked: idx < 6 }));
    const p = checklistProgress(all);
    expect(p.checked).toBe(6);
    expect(p.total).toBe(13);
    expect(p.percent).toBe(46);
  });

  it('exige tous les points pour conforme', () => {
    const partial = buildDefaultChecklist().map((i, idx) => ({ ...i, checked: idx < 12 }));
    expect(isChecklistComplete(partial)).toBe(false);
    expect(isChecklistComplete(buildDefaultChecklist().map((i) => ({ ...i, checked: true })))).toBe(true);
  });
});
