/** Règles matière / grammage — module Calendrier ANS ORION. */

import { filterGlossyGrammageOptions } from '@/lib/pos/glossy-grammage-policy';
import { isRetiredMaterialLabel } from '@/lib/pos/retired-material-policy';

export const CALENDAR_ARTICLE_IDS = new Set([
  'cal-plateau',
  'cal-mural',
  'cal-marquepage',
  'cal-chevalet',
  'cal-chevalet-table',
  'cal-sousmain',
]);

export const CALENDAR_PLATEAU_MIN_GRAMMAGE_G = 300;
export const CALENDAR_MARQUEPAGE_MIN_GRAMMAGE_G = 230;

const FORBIDDEN_MARQUEPAGE_MATERIALS = new Set([
  'offset',
  'standard / offset',
  'standard offset',
]);

export function isCalendarArticleId(articleId: string): boolean {
  return CALENDAR_ARTICLE_IDS.has(articleId) || articleId.startsWith('cal-');
}

export function isForbiddenMarquepageMaterial(material: string): boolean {
  const m = material.trim().toLowerCase();
  return FORBIDDEN_MARQUEPAGE_MATERIALS.has(m) || m === 'offset';
}

export function getCalendarMinGrammageG(articleId: string, grammageKey: string): number | null {
  if (articleId === 'cal-plateau' && grammageKey === 'grammage') {
    return CALENDAR_PLATEAU_MIN_GRAMMAGE_G;
  }
  if (articleId === 'cal-marquepage' && grammageKey === 'grammage') {
    return CALENDAR_MARQUEPAGE_MIN_GRAMMAGE_G;
  }
  if (
    (articleId === 'cal-chevalet' || articleId === 'cal-sousmain')
    && (grammageKey === 'grammage' || grammageKey === 'grammage_support')
  ) {
    return CALENDAR_MARQUEPAGE_MIN_GRAMMAGE_G;
  }
  if (articleId === 'cal-chevalet' && grammageKey === 'grammage_feuillets') {
    return null;
  }
  return null;
}

export function filterCalendarGrammageOptions(
  articleId: string,
  options: string[],
  grammageKey: string,
  matiere?: string | null,
): string[] {
  let filtered = options;
  const min = getCalendarMinGrammageG(articleId, grammageKey);
  if (min != null) {
    filtered = filtered.filter((opt) => {
      const m = opt.match(/(\d+)/);
      if (!m) return true;
      return parseInt(m[1], 10) >= min;
    });
  }
  return filterGlossyGrammageOptions(matiere, filtered);
}

export function filterCalendarMaterialOptions(articleId: string, options: string[]): string[] {
  let filtered = options.filter((opt) => !isRetiredMaterialLabel(opt));
  if (articleId !== 'cal-marquepage') return filtered;
  return filtered.filter((opt) => !isForbiddenMarquepageMaterial(opt));
}
