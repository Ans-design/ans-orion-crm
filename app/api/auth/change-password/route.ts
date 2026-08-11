export const dynamic = 'force-dynamic';

/**
 * SEC-01 — changement de mot de passe obligatoire (bootstrap / reset admin).
 * Ne log jamais le mot de passe.
 */
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimitAsync } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Session requise' }, { status: 401 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimitAsync(`auth-sensitive:${ip}:change-password`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Trop de tentatives' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec ?? 60) } },
    );
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
  }

  const currentPassword = body.currentPassword ?? '';
  const newPassword = body.newPassword ?? '';
  if (newPassword.length < 12) {
    return NextResponse.json({ error: 'Nouveau mot de passe : min. 12 caractères' }, { status: 400 });
  }
  if (newPassword === currentPassword) {
    return NextResponse.json({ error: 'Le nouveau mot de passe doit être différent' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.password) {
    return NextResponse.json({ error: 'Compte invalide' }, { status: 400 });
  }

  const ok = await bcrypt.compare(currentPassword, user.password);
  if (!ok) {
    return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hash, mustChangePassword: false },
  });

  return NextResponse.json({
    ok: true,
    message: 'Mot de passe mis à jour. Reconnectez-vous si la session conserve l’ancien flag.',
  });
}
