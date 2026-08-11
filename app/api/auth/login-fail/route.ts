export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { logAudit } from '@/lib/audit';
import { checkRateLimit } from '@/lib/rate-limit';
import { recordLoginFailure } from '@/lib/login-guard';
import { parseBody } from '@/lib/validators/common';
import { loginFailSchema } from '@/lib/validators/auth';

/** Journalise une tentative de connexion échouée + verrou après 5 échecs / 15 min */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`login-fail:${ip}`, 30, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives', locked: true, retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  let email = '';
  try {
    const parsed = parseBody(loginFailSchema, await req.json());
    if (parsed.ok) email = parsed.data.email;
  } catch {
    /* ignore */
  }

  const lock = recordLoginFailure(ip, email);

  try {
    await logAudit({
      action: 'LOGIN_FAILED',
      entity: 'Auth',
      entityLabel: email.slice(0, 120) || 'unknown',
      details: { ip, attempts: lock.attempts },
    });
  } catch {
    /* ignore */
  }

  if (!lock.ok) {
    return NextResponse.json(
      {
        ok: false,
        locked: true,
        retryAfterSec: lock.retryAfterSec,
        message: 'Compte temporairement verrouillé après plusieurs échecs.',
      },
      { status: 429 },
    );
  }

  const remaining = Math.max(0, 5 - lock.attempts);
  return NextResponse.json({
    ok: true,
    remainingAttempts: remaining,
    message: remaining <= 2 ? `Attention : ${remaining} tentative(s) restante(s).` : undefined,
  });
}
