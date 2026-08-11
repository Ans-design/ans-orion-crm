/**
 * V14 — préférences notifications versionnées (quiet hours + alertes obligatoires).
 * Stockage via UserPreference.category = 'notifications' + champ version.
 */

import { prisma } from '@/lib/prisma';
import { DEFAULT_NOTIFICATIONS } from '@/lib/settings-defaults';

export type NotificationPrefsV14 = typeof DEFAULT_NOTIFICATIONS & {
  version: number;
  quietHoursStart?: string | null; // HH:mm
  quietHoursEnd?: string | null;
  /** Catégories non désactivables (sécurité / stock critique). */
  mandatoryCategories: string[];
};

export const MANDATORY_ALERT_CATEGORIES = ['stock', 'security', 'machines'] as const;

export function mergeNotificationPrefs(raw: unknown): NotificationPrefsV14 {
  const data = { ...DEFAULT_NOTIFICATIONS, ...(typeof raw === 'object' && raw ? raw : {}) } as Record<
    string,
    unknown
  >;
  return {
    ...DEFAULT_NOTIFICATIONS,
    ...data,
    version: typeof data.version === 'number' ? data.version : 1,
    quietHoursStart: typeof data.quietHoursStart === 'string' ? data.quietHoursStart : null,
    quietHoursEnd: typeof data.quietHoursEnd === 'string' ? data.quietHoursEnd : null,
    mandatoryCategories: [...MANDATORY_ALERT_CATEGORIES],
  } as NotificationPrefsV14;
}

export async function getUserNotificationPrefs(userId: string): Promise<NotificationPrefsV14> {
  const row = await prisma.userPreference.findUnique({
    where: { userId_category: { userId, category: 'notifications' } },
  });
  return mergeNotificationPrefs(row?.data);
}

/** True si maintenant est dans quiet hours (fuseau Antananarivo simplifié via offset local serveur). */
export function isInQuietHours(prefs: NotificationPrefsV14, now = new Date()): boolean {
  if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
  const [sh, sm] = prefs.quietHoursStart.split(':').map(Number);
  const [eh, em] = prefs.quietHoursEnd.split(':').map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return false;
  if (start < end) return mins >= start && mins < end;
  return mins >= start || mins < end;
}

export function canSendEmailForCategory(prefs: NotificationPrefsV14, category?: string): boolean {
  if (category && MANDATORY_ALERT_CATEGORIES.includes(category as (typeof MANDATORY_ALERT_CATEGORIES)[number])) {
    return true;
  }
  if (isInQuietHours(prefs) && category && !MANDATORY_ALERT_CATEGORIES.includes(category as never)) {
    return false;
  }
  if (!prefs.emailAlerts) return false;
  if (category && category in prefs && (prefs as Record<string, unknown>)[category] === false) return false;
  return true;
}
