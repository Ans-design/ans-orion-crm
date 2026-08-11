/** Messages d'erreur ANS Talk — masque les erreurs Prisma brutes côté UI. */

export type TalkErrorDisplay = {
  title: string;
  description: string;
  technical: string;
};

export function sanitizeTalkError(raw: string): TalkErrorDisplay {
  const technical = raw.trim();
  const isSchema =
    /prisma|devisId|column|does not exist|P2022|SQLITE|postgres/i.test(technical);

  if (isSchema) {
    return {
      title: 'Impossible de charger les conversations',
      description: 'Une configuration de base de données semble incomplète.',
      technical,
    };
  }

  if (/401|session|unauthorized/i.test(technical)) {
    return {
      title: 'Session expirée',
      description: 'Reconnectez-vous pour accéder à la messagerie.',
      technical,
    };
  }

  return {
    title: 'Impossible de charger les conversations',
    description: 'Un problème temporaire est survenu. Réessayez dans quelques instants.',
    technical,
  };
}

export function canUseTalkDemoFallback(): boolean {
  if (typeof process !== 'undefined') {
    if (process.env.NODE_ENV === 'production') return false;
    if (process.env.NEXT_PUBLIC_APP_ENV === 'production') return false;
    if (process.env.APP_ENV === 'production') return false;
  }
  if (typeof window !== 'undefined') {
    return /localhost|127\.0\.0\.1/i.test(window.location.hostname);
  }
  return process.env.NODE_ENV === 'development' || process.env.APP_ENV === 'local';
}
