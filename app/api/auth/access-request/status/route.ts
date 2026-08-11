export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { verifyAccessRequestStatusToken } from '@/lib/auth/access-request-status-token';
import { runApiHandler } from '@/lib/api-guard';

const STATUS_LABELS: Record<string, string> = {
  envoye: 'Envoyée',
  en_attente: 'En attente',
  accepte: 'Acceptée',
  refuse: 'Refusée',
  traitee: 'Traitée',
};

/** Consultation du statut d'une demande d'accès via token signé (anti-énumération email). */
export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimitAsync(`access-status:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de requêtes' }, { status: 429 });
  }

  return runApiHandler('auth/access-request/status GET', async () => {
    const token = req.nextUrl.searchParams.get('token')?.trim();
    if (token) {
      const verified = verifyAccessRequestStatusToken(token);
      if (!verified) {
        return NextResponse.json({ error: 'Lien invalide ou expiré' }, { status: 403 });
      }

      const request = await prisma.accessRequest.findUnique({
        where: { id: verified.requestId },
        select: {
          id: true,
          statut: true,
          createdAt: true,
          updatedAt: true,
          nom: true,
          reviewNote: true,
        },
      });
      if (!request) {
        return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
      }

      return NextResponse.json({
        found: true,
        statut: request.statut,
        statutLabel: STATUS_LABELS[request.statut] ?? request.statut,
        createdAt: request.createdAt.toISOString(),
        updatedAt: request.updatedAt.toISOString(),
        nom: request.nom,
        reviewNote: request.statut === 'refuse' ? request.reviewNote : null,
      });
    }

    const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Token ou email requis' }, { status: 400 });
    }

    return NextResponse.json({
      found: false,
      message: 'Si une demande existe pour cet email, utilisez le jeton reçu lors de l\'envoi. L\'interrogation par email seule n\'est plus disponible.',
    });
  });
}
