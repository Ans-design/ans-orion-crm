export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBatRead, requireBatWrite } from '@/lib/server/auth/bat-access';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { logAudit } from '@/lib/audit';
import { nextSequence } from '@/lib/services/SequenceService';
import { isBatPending } from '@/lib/constants/file-assets';
import { z } from 'zod';
import { created } from '@/lib/server/http/api-response';

const createProofSchema = z.object({
  commandeId: z.string().optional().nullable(),
  clientId: z.string().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const auth = await requireBatRead();
  if ('error' in auth) return auth.error;

  const statut = new URL(req.url).searchParams.get('statut') || '';
  const commandeId =
    new URL(req.url).searchParams.get('commande')
    || new URL(req.url).searchParams.get('commandeId')
    || '';

  const where: Record<string, unknown> = {};
  if (statut) where.statut = statut;
  if (commandeId) where.commandeId = commandeId;

  const proofs = await prisma.proof.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      client: { select: { name: true, code: true } },
      commande: { select: { numero: true, article: true } },
    },
  });

  const pending = proofs.filter((p) => isBatPending(p.statut)).length;

  return NextResponse.json({ proofs, pending });
}

export async function POST(req: NextRequest) {
  const auth = await requireBatWrite();
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(createProofSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const numero = await nextSequence('BAT');

    const proof = await prisma.proof.create({
      data: {
        numero,
        commandeId: parsed.data.commandeId || null,
        clientId: parsed.data.clientId || null,
        notes: parsed.data.notes || null,
        statut: 'En attente fichier',
      },
      include: {
        client: { select: { name: true } },
        commande: { select: { numero: true } },
      },
    });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'CREATE',
      entity: 'Proof',
      entityId: proof.id,
      entityLabel: proof.numero,
    });

    return created(proof);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur création BAT'), 500);
  }
}
