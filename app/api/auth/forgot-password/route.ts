export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { buildResetUrl, generateResetToken, hashResetToken, RESET_TOKEN_TTL_MS } from '@/lib/password-reset';
import { sendPasswordResetEmail } from '@/lib/auth/send-password-reset-email';
import { resolveAccountEmail } from '@/lib/auth/resolve-account-email';
import { logAudit } from '@/lib/audit';
import { parseBody } from '@/lib/validators/common';
import { forgotPasswordSchema } from '@/lib/validators/auth';

const GENERIC = {
  ok: true,
  message: 'Si un compte existe avec cet identifiant, un lien de réinitialisation a été envoyé.',
};

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimitAsync(`forgot:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
      { status: 429 },
    );
  }

  try {
    const parsed = parseBody(forgotPasswordSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const identifier = String(parsed.data.identifier || parsed.data.email || '').trim();

    const normalized = await resolveAccountEmail(identifier);
    if (!normalized) {
      return NextResponse.json(GENERIC);
    }

    const emailRl = await checkRateLimitAsync(`forgot:email:${normalized}`, 3, 60_000);
    if (!emailRl.ok) {
      return NextResponse.json(GENERIC);
    }

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user?.password) {
      return NextResponse.json(GENERIC);
    }

    const rawToken = generateResetToken();
    const hashed = hashResetToken(rawToken);
    const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await prisma.verificationToken.deleteMany({ where: { identifier: normalized } });
    await prisma.verificationToken.create({
      data: { identifier: normalized, token: hashed, expires },
    });

    const resetUrl = buildResetUrl(rawToken);

    await logAudit({
      action: 'PASSWORD_RESET_REQUEST',
      entity: 'User',
      entityId: user.id,
      entityLabel: normalized,
      details: { ip, viaMatricule: !identifier.includes('@') },
    });

    if (process.env.DEMO_MODE === 'true') {
      return NextResponse.json({
        ...GENERIC,
        demoResetUrl: resetUrl,
        demoHint: 'Mode démo — utilisez ce lien pour réinitialiser votre mot de passe.',
      });
    }

    await sendPasswordResetEmail({
      to: normalized,
      resetUrl,
      userName: user.name,
    });

    return NextResponse.json(GENERIC);
  } catch (error) {
    console.error('[forgot-password]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
