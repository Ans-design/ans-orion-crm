export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FactureStatut } from '@prisma/client';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { logAudit } from '@/lib/audit';
import { isEmailConfigured, sendFactureEmail } from '@/lib/services/email-service';
import { generateFacturePdfBuffer } from '@/lib/services/facture-document-service';
import { z } from 'zod';
import { resolveParams } from '@/lib/api/route-params';

const bodySchema = z.object({
  to: z.string().email().optional(),
  message: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('factures:write');
  if ('error' in auth) return auth.error;

  if (!isEmailConfigured()) {
    return apiError('Email non configuré (RESEND_API_KEY, EMAIL_FROM)', 503);
  }

  try {
    const parsed = parseOr400(bodySchema, await req.json().catch(() => ({})));
    if ('error' in parsed) return parsed.error;

    const facture = await prisma.facture.findUnique({
      where: { id: id },
      include: { client: true },
    });
    if (!facture) return apiError('Facture introuvable', 404);

    const to = parsed.data.to || facture.client?.email;
    if (!to) return apiError('Aucune adresse email (client ou paramètre to)', 400);

    const pdf = await generateFacturePdfBuffer(facture.id);

    const result = await sendFactureEmail({
      to,
      clientName: facture.client?.name || 'Client',
      factureNumero: facture.numero,
      totalTTC: facture.totalTTC,
      factureId: facture.id,
      message: parsed.data.message,
      pdfBuffer: pdf.ok ? pdf.buffer : undefined,
    });

    if (!result.ok) {
      return apiError(result.error || 'Échec envoi email', result.skipped ? 503 : 502);
    }

    const updated = await prisma.facture.update({
      where: { id: facture.id },
      data: {
        statut: facture.statut === FactureStatut.Brouillon ? FactureStatut.Emise : facture.statut,
        dateEmission: facture.dateEmission ?? new Date(),
      },
      include: { commande: true, client: true, paiements: true },
    });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'EMAIL_SENT',
      entity: 'Facture',
      entityId: facture.id,
      entityLabel: facture.numero,
      details: { to, channel: 'resend' },
    });

    return NextResponse.json({ ok: true, facture: updated, sentTo: to });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur envoi facture'), 500);
  }
}
