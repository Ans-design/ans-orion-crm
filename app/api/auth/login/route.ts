export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { runApiHandler } from '@/lib/api-guard';

/** Désactivé — utiliser NextAuth POST /api/auth/callback/credentials */
export async function POST() {
  return runApiHandler('auth/login POST', async () => {
    return NextResponse.json(
      { error: 'Endpoint désactivé. Utilisez la connexion via /login (NextAuth).' },
      { status: 410 },
    );
  });
}
