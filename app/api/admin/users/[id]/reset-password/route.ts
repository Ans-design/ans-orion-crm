export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth-utils';
import { buildResetUrl, generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/auth/send-password-reset-email';
import { logAudit } from '@/lib/audit';
import { isProductionDeploy, isDemoLoginFeaturesEnabled } from '@/lib/auth-environment';
import { runApiHandler } from '@/lib/api-guard';
import { resolveParams } from '@/lib/api/route-params';

export async function POST(
  _req: NextRequest,
  ctx: { params: { id: string } | Promise<{ id: string }> },
) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('users:manage');
  if ('error' in auth) return auth.error;

  return runApiHandler('admin/users/reset-password POST', async () => {
    const user = await prisma.user.findUnique({
      where: { id: id },
      select: { id: true, email: true, name: true, password: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
    }
    if (!user.password) {
      return NextResponse.json({ error: 'Compte sans mot de passe local' }, { status: 400 });
    }

    const normalized = user.email.toLowerCase();
    const rawToken = generateResetToken();
    const hashed = hashResetToken(rawToken);
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });
    await prisma.verificationToken.create({
      data: { identifier: normalized, token: hashed, expires },
    });

    const resetUrl = buildResetUrl(rawToken);

    // SEC-12 : envoi email hors démo locale ; jamais de token en réponse production
    if (!isDemoLoginFeaturesEnabled() || isProductionDeploy()) {
      await sendPasswordResetEmail({
        to: normalized,
        resetUrl,
        userName: user.name,
      });
    }

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'PASSWORD_RESET_REQUEST',
      entity: 'User',
      entityId: user.id,
      entityLabel: user.email,
      details: { adminTriggered: true },
    });

    const payload: Record<string, unknown> = {
      ok: true,
      message: `Lien de réinitialisation envoyé à ${normalized}`,
    };
    // Token brut uniquement en démo locale non-prod
    if (isDemoLoginFeaturesEnabled() && !isProductionDeploy()) {
      payload.demoResetUrl = resetUrl;
    }

    return NextResponse.json(payload);
  });
}
