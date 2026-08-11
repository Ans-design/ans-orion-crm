export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveDatabaseUrl } from '@/lib/database-url';
import {
  getLoginSecurityFlags,
} from '@/lib/auth-environment';

const isDemoMode = () => process.env.DEMO_MODE === 'true';

/** Indique si la base n'a aucun utilisateur (première installation) */
export async function GET() {
  if (isDemoMode()) {
    return NextResponse.json({
      ...getLoginSecurityFlags(false),
      message: 'Mode démo — connectez-vous ou créez un compte ci-dessous',
    });
  }

  const e2eMode = process.env.E2E_MODE === 'true';
  if (e2eMode) {
    let needsSetup = false;
    try {
      resolveDatabaseUrl();
      needsSetup = (await prisma.user.count()) === 0;
    } catch {
      needsSetup = false;
    }
    return NextResponse.json({
      ...getLoginSecurityFlags(needsSetup),
      e2eMode: true,
      message: 'Mode E2E local — connexion rapide disponible',
    });
  }

  if (process.env.NODE_ENV === 'production') {
    let needsSetup = false;
    try {
      resolveDatabaseUrl();
      needsSetup = (await prisma.user.count()) === 0;
    } catch {
      needsSetup = false;
    }
    return NextResponse.json(getLoginSecurityFlags(needsSetup));
  }

  try {
    resolveDatabaseUrl();
    const count = await prisma.user.count();
    return NextResponse.json({ ...getLoginSecurityFlags(count === 0), userCount: count });
  } catch {
    return NextResponse.json({
      ...getLoginSecurityFlags(false),
      message: 'Base inaccessible — configurez DATABASE_URL ou activez DEMO_MODE',
    });
  }
}
