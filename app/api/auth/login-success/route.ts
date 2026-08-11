export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { clearLoginFailures } from '@/lib/login-guard';
import { getHomeRouteForRole } from '@/lib/modules/role-registry';
import { resolvePostLoginPath } from '@/lib/auth-redirect';
import { parseBody } from '@/lib/validators/common';
import { loginSuccessSchema } from '@/lib/validators/auth';

/** Journalise une connexion réussie (appelé côté client après signIn OK). */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  try {
    const raw = await req.json().catch(() => ({}));
    const parsed = parseBody(loginSuccessSchema, raw);
    const body = parsed.ok ? parsed.data : {};
    const user = session.user as { id?: string; email?: string | null; name?: string | null; role?: string };
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    clearLoginFailures(ip, user.email ?? undefined);

    const redirect =
      typeof body.redirect === 'string'
        ? resolvePostLoginPath(body.redirect, user.role)
        : getHomeRouteForRole(user.role ?? 'user');

    await logAudit({
      userId: user.id,
      userName: user.name || user.email || 'Utilisateur',
      action: 'LOGIN',
      entity: 'Session',
      entityLabel: user.email || 'connexion',
      details: {
        role: user.role,
        redirect,
      },
    });
    return NextResponse.json({ ok: true, redirect, role: user.role });
  } catch {
    return NextResponse.json({ error: 'Erreur audit' }, { status: 500 });
  }
}
