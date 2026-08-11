export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/auth-utils';
import { DEFAULT_APPEARANCE, DEFAULT_NOTIFICATIONS } from '@/lib/settings-defaults';
import { runApiHandler } from '@/lib/api-guard';
import { parseBody } from '@/lib/validators/common';
import { updateUserSettingsSchema } from '@/lib/server/modules/settings/settings.validation';

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  return runApiHandler('settings GET', async () => {
  const category = req.nextUrl.searchParams.get('category') || 'all';
  const prefs = await prisma.userPreference.findMany({ where: { userId: auth.userId || undefined } });

  const map: Record<string, unknown> = {};
  for (const p of prefs) map[p.category] = p.data;

  const result = {
    appearance: { ...DEFAULT_APPEARANCE, ...(map.appearance as object || {}) },
    notifications: { ...DEFAULT_NOTIFICATIONS, ...(map.notifications as object || {}) },
  };

  if (category === 'appearance') return NextResponse.json(result.appearance);
  if (category === 'notifications') return NextResponse.json(result.notifications);
  return NextResponse.json(result);
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireSession();
  if ('error' in auth) return auth.error;

  return runApiHandler('settings PUT', async () => {
  const parsed = parseBody(updateUserSettingsSchema, await req.json());
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { category, data } = parsed.data;

  const defaults = category === 'appearance' ? DEFAULT_APPEARANCE : DEFAULT_NOTIFICATIONS;
  const merged = { ...defaults, ...data };

  if (!auth.userId) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 400 });
  }

  const pref = await prisma.userPreference.upsert({
    where: { userId_category: { userId: auth.userId, category } },
    create: { userId: auth.userId, category, data: merged },
    update: { data: merged },
  });

  return NextResponse.json(pref.data);
  });
}
