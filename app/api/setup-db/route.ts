export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { prisma } from '@/lib/prisma';
import { resolveDatabaseUrl } from '@/lib/database-url';
import { checkRateLimit } from '@/lib/rate-limit';
import { isProductionDeploy } from '@/lib/auth-environment';

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

/** SEC-003 : setup HTTP uniquement en local explicite (jamais prod/preview). */
function isSetupHttpAllowed(): boolean {
  if (isProductionDeploy()) return false;
  if (process.env.NODE_ENV === 'production') return false;
  if (process.env.VERCEL_ENV === 'production' || process.env.VERCEL_ENV === 'preview') return false;
  if (process.env.ALLOW_SETUP_DB !== 'true') return false;
  // Local strict : APP_ENV=local ou LOCAL_DEV
  if (process.env.APP_ENV === 'local' || process.env.LOCAL_DEV === 'true') return true;
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_SETUP_DB === 'true') return true;
  return false;
}

/** GET interdit — surface d’attaque minimale. */
export async function GET() {
  return notFound();
}

/**
 * Initialise la base PostgreSQL (dev local contrôlé uniquement).
 * Préférer le CLI : `npm run db:setup` / scripts admin.
 * Production / preview / Hostinger : toujours 404.
 */
export async function POST(req: Request) {
  if (!isSetupHttpAllowed()) {
    return notFound();
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = checkRateLimit(`setup-db:${ip}`, 3, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de tentatives' }, { status: 429 });
  }

  resolveDatabaseUrl();

  const secret = process.env.SETUP_SECRET;
  if (!secret || secret.trim().length < 32) {
    return NextResponse.json({ error: 'Configuration invalide' }, { status: 503 });
  }

  const provided = req.headers.get('x-setup-secret');
  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  if (!process.env.DATABASE_URL?.startsWith('postgres')) {
    return NextResponse.json({ error: 'Base incompatible' }, { status: 400 });
  }

  try {
    const existing = await prisma.client.count();
    if (existing > 0) {
      return NextResponse.json({
        ok: true,
        message: 'Base déjà initialisée',
        clients: existing,
      });
    }

    execSync('npx prisma db push', { stdio: 'pipe', env: process.env });
    execSync('npm run seed', { stdio: 'pipe', env: process.env });
    execSync('npm run seed:demo', { stdio: 'pipe', env: process.env });

    const clients = await prisma.client.count();
    return NextResponse.json({
      ok: true,
      message: 'Base initialisée avec succès',
      clients,
    });
  } catch {
    return NextResponse.json({ error: 'Échec initialisation' }, { status: 500 });
  }
}
