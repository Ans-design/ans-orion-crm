import { NextResponse } from 'next/server';

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Masque les détails sensibles en production */
export function safeErrorMessage(error: unknown, fallback = 'Erreur serveur'): string {
  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('SQLITE_READONLY') || msg.includes('read-only')) {
      return 'Base de données en lecture seule — réessayez dans quelques secondes';
    }
    if (msg.includes('Foreign key constraint') || msg.includes('P2003')) {
      return 'Session ou données invalides — déconnectez-vous puis reconnectez-vous';
    }
    if (process.env.NODE_ENV === 'development' || process.env.DEMO_MODE === 'true') {
      return msg;
    }
  }
  return fallback;
}
