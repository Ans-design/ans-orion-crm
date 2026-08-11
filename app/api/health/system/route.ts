export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runApiHandler } from '@/lib/api-guard';
import { requireSession } from '@/lib/auth-utils';

/** Diagnostic système — session requise (pas de sonde publique détaillée). */
export async function GET() {
  return runApiHandler('health/system GET', async () => {
    const auth = await requireSession({ skipRhAttendance: true });
    if ('error' in auth) return auth.error;

    const checks: Array<{ id: string; ok: boolean; detail?: string }> = [];

    try {
      await prisma.$queryRaw`SELECT 1`;
      const url = process.env.DATABASE_URL ?? '';
      const kind = url.startsWith('postgres')
        ? 'PostgreSQL'
        : url.startsWith('file:')
          ? 'SQLite'
          : 'unknown';
      checks.push({ id: 'database', ok: true, detail: kind });
    } catch (e) {
      checks.push({
        id: 'database',
        ok: false,
        detail: e instanceof Error ? e.message.slice(0, 120) : 'error',
      });
    }

    checks.push({
      id: 'auth',
      ok: Boolean(process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32),
      // Pas de libellé de force secrète exposé — état générique uniquement.
      detail: 'checked',
    });

    checks.push({
      id: 'environment',
      ok: true,
      detail: [
        process.env.VERCEL ? 'vercel' : 'local',
        process.env.NODE_ENV ?? 'unknown',
        process.env.LOCAL_DEV === 'true' ? 'LOCAL_DEV' : null,
      ]
        .filter(Boolean)
        .join(' · '),
    });

    const allOk = checks.every((c) => c.ok);

    return NextResponse.json({
      ok: allOk,
      data: {
        status: allOk ? 'healthy' : 'degraded',
        version: process.env.npm_package_version ?? 'unknown',
        checks,
        timestamp: new Date().toISOString(),
      },
    });
  });
}
