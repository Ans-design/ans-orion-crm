export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { requireSession, requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseBody } from '@/lib/validators/common';
import { signupSchema } from '@/lib/validators/auth';
import { logAudit } from '@/lib/audit';
import { isPublicSignupEnabled, isProductionDeploy } from '@/lib/auth-environment';
import { created } from '@/lib/server/http/api-response';

/** Inscription : bootstrap, démo interactive ou admin en prod */
export async function POST(request: Request) {
  // SEC-08 : DEMO_MODE ne court-circuite jamais le durcissement production
  const allowPublic = isPublicSignupEnabled();
  const isProd = isProductionDeploy() || process.env.NODE_ENV === 'production';

  let userCount = 0;
  try {
    userCount = await prisma.user.count();
  } catch {
    return apiError('Base de données inaccessible — vérifiez DATABASE_URL', 503);
  }

  const isBootstrap = userCount === 0;

  if (!isBootstrap) {
    if (isProd && !allowPublic) {
      const auth = await requirePermission('users:manage');
      if ('error' in auth) return auth.error;
    } else if (!allowPublic) {
      const auth = await requirePermission('users:manage');
      if ('error' in auth) return auth.error;
    }
  }

  try {
    const body = await request.json();
    const parsed = parseBody(signupSchema, body);
    if (!parsed.ok) return apiError(parsed.error, 400);

    const { email, password, name, role } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) return apiError('Cet email est déjà utilisé', 400);

    const isPublicSignup = allowPublic && !isBootstrap;
    const PUBLIC_ROLES = ['commercial', 'designer', 'lecture', 'demo'] as const;
    let assignedRole = isBootstrap ? 'admin' : (role || 'commercial');
    if (isPublicSignup) {
      if (role && !PUBLIC_ROLES.includes(role as typeof PUBLIC_ROLES[number])) {
        return apiError('Rôle non autorisé pour une inscription publique', 403);
      }
      assignedRole = (role && PUBLIC_ROLES.includes(role as typeof PUBLIC_ROLES[number]))
        ? role
        : 'commercial';
    }

    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        name: name || normalizedEmail.split('@')[0],
        role: assignedRole,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await logAudit({
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      entityLabel: user.email,
      details: { role: user.role },
    });

    return created(user);
  } catch (error: unknown) {
    console.error('Signup error:', error);
    return apiError(safeErrorMessage(error, 'Erreur lors de l\'inscription'), 500);
  }
}
