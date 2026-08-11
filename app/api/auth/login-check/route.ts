export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { checkLoginAllowed } from '@/lib/login-guard';
import { lookupAccountGate } from '@/lib/login-account-lookup';
import {
  getLocalAdminCredentials,
  isLocalAuthEnabled,
  matchLocalAdminAuth,
  localAuthSuccessPayload,
  normalizeLoginIdentifier,
  parseLoginCredentials,
} from '@/lib/local-auth';
import { LOGIN_MESSAGES } from '@/lib/login-account-status';
import { parseBody } from '@/lib/validators/common';
import { loginCheckSchema } from '@/lib/validators/auth';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  let body: unknown = {};
  try {
    const raw = await req.json();
    const parsed = parseBody(loginCheckSchema, raw);
    if (!parsed.ok) {
      return NextResponse.json(
        { allowed: false, message: 'Corps de requête invalide' },
        { status: 400 },
      );
    }
    body = parsed.data;
  } catch (err) {
    console.error('login-check: body JSON invalide', err);
    return NextResponse.json(
      { allowed: false, message: 'Corps JSON invalide' },
      { status: 400 },
    );
  }

  const { identifier: rawIdentifier, password } = parseLoginCredentials(body);

  // ─── Priorité 1 : bypass local ADM01 (sans Prisma, sans Hostinger) ───
  if (isLocalAuthEnabled() && rawIdentifier.trim()) {
    const normalizedLocal = normalizeLoginIdentifier(rawIdentifier);
    const localCreds = getLocalAdminCredentials();
    if (localCreds && normalizedLocal === localCreds.login) {
      const localUser = matchLocalAdminAuth(rawIdentifier, password);
      if (localUser) {
        return NextResponse.json(localAuthSuccessPayload(localUser));
      }
      return NextResponse.json(
        { allowed: false, message: LOGIN_MESSAGES.invalidCredentials },
        { status: 401 },
      );
    }
  }

  const identifier = rawIdentifier ? normalizeLoginIdentifier(rawIdentifier) : '';

  const status = checkLoginAllowed(ip, identifier);
  if (!status.ok) {
    return NextResponse.json(
      {
        allowed: false,
        locked: true,
        retryAfterSec: status.retryAfterSec,
        message: 'Trop de tentatives — réessayez dans quelques minutes.',
      },
      { status: 429 },
    );
  }

  if (identifier.trim()) {
    try {
      const gate = await lookupAccountGate(identifier);
      if (!gate.allowed) {
        return NextResponse.json(
          {
            allowed: false,
            code: gate.code,
            message: gate.message,
          },
          { status: 403 },
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('login-check account gate failed:', message, err);
      return NextResponse.json(
        {
          allowed: false,
          code: 'GATE_UNAVAILABLE',
          message: `Vérification du compte temporairement indisponible (${message}). Réessayez dans quelques instants.`,
        },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({
    allowed: true,
    remaining: status.remaining,
    limit: status.limit,
  });
}
