export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DevisStatut } from '@prisma/client';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { logAudit } from '@/lib/audit';
import { isEmailConfigured, sendDevisEmail } from '@/lib/services/email-service';
import { generateDevisPdfBuffer } from '@/lib/services/facture-document-service';
import { formatEmailFrom } from '@/lib/email/address';
import { getBrandingConfig } from '@/lib/branding-config';
import { z } from 'zod';
import { resolveParams } from '@/lib/api/route-params';

const bodySchema = z.object({
  to: z.string().email().optional(),
  from: z.string().email().optional(),
  message: z.string().max(2000).optional(),
  doc: z.enum(['devis', 'proforma']).optional(),
});

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('devis:write');
  if ('error' in auth) return auth.error;

  if (!isEmailConfigured()) {
    return apiError('Email non configuré (RESEND_API_KEY, EMAIL_FROM)', 503);
  }

  try {
    const parsed = parseOr400(bodySchema, await req.json().catch(() => ({})));
    if ('error' in parsed) return parsed.error;

    const devis = await prisma.devis.findUnique({
      where: { id: id },
      include: { client: true },
    });
    if (!devis) return apiError('Devis introuvable', 404);

    const to = parsed.data.to || devis.client?.email;
    if (!to) return apiError('Aucune adresse email (client ou paramètre to)', 400);

    const docKind = parsed.data.doc === 'devis' ? 'devis' : 'proforma';
    const pdf = await generateDevisPdfBuffer(devis.id, { kind: docKind });

    const branding = await getBrandingConfig();
    const fromHeader = parsed.data.from
      ? formatEmailFrom(branding.companyName, parsed.data.from)
      : undefined;

    const result = await sendDevisEmail({
      to,
      clientName: devis.client?.name || 'Client',
      devisNumero: devis.numero,
      totalTTC: devis.totalTTC,
      validUntil: devis.validUntil?.toISOString() ?? null,
      devisId: devis.id,
      message: parsed.data.message,
      docKind,
      from: fromHeader,
      pdfBuffer: pdf.ok ? pdf.buffer : undefined,
      pdfFilename: pdf.ok ? `${pdf.prefix}-${pdf.numero}.pdf` : undefined,
    });

    if (!result.ok) {
      return apiError(result.error || 'Échec envoi email', result.skipped ? 503 : 502);
    }

    const updated = await prisma.devis.update({
      where: { id: devis.id },
      data: { statut: devis.statut === DevisStatut.Brouillon ? DevisStatut.Envoye : devis.statut },
      include: {
        client: { select: { id: true, name: true, code: true } },
        lignes: { orderBy: { sortOrder: 'asc' } },
      },
    });

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'EMAIL_SENT',
      entity: 'Devis',
      entityId: devis.id,
      entityLabel: devis.numero,
      details: { to, channel: 'resend' },
    });

    return NextResponse.json({ ok: true, devis: updated, sentTo: to });
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur envoi devis'), 500);
  }
}
