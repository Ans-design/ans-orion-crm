import { calculateCalendarMaterialRecap } from '@/lib/calendar/calendar-calculation';
import { isCalendarArticleId } from '@/lib/calendar/calendar-material-policy';

export type { CalendarMaterialRecap, CalendarComponentSurface } from '@/lib/calendar/calendar-calculation';

export function resolveCalendarMaterialRecap(
  articleId: string,
  config: Record<string, unknown>,
) {
  if (!isCalendarArticleId(articleId)) return null;
  return calculateCalendarMaterialRecap(articleId, config);
}
