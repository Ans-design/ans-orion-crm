export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { hashResetToken } from '@/lib/password-reset';
import { sendPasswordChangedEmail } from '@/lib/auth/send-password-changed-email';
import { validatePassword } from '@/lib/auth/password-policy';
import { logAudit } from '@/lib/audit';
import { parseBody } from '@/lib/validators/common';
import { resetPasswordSchema } from '@/lib/validators/auth';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimitAsync(`reset:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de tentatives.' }, { status: 429 });
  }

  try {
    const parsed = parseBody(resetPasswordSchema, await req.json());
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { token, password } = parsed.data;
    const pwCheck = validatePassword(password);
    if (!pwCheck.ok) {
      return NextResponse.json({ error: pwCheck.error }, { status: 400 });
    }

    const hashed = hashResetToken(token);
    const record = await prisma.verificationToken.findUnique({ where: { token: hashed } });
    if (!record || record.expires < new Date()) {
      if (record) await prisma.verificationToken.delete({ where: { token: hashed } }).catch(() => {});
      return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: record.identifier } });
    if (!user) {
      return NextResponse.json({ error: 'Compte introuvable' }, { status: 404 });
    }

    const hashedPw = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { password: hashedPw } }),
      prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    await logAudit({
      action: 'UPDATE',
      entity: 'User',
      entityId: user.id,
      entityLabel: user.email ?? user.id,
      details: { passwordReset: true, ip },
    });

    await sendPasswordChangedEmail({ to: record.identifier, userName: user.name });

    return NextResponse.json({ ok: true, message: 'Mot de passe mis à jour. Vous pouvez vous connecter.' });
  } catch (error) {
    console.error('[reset-password]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
