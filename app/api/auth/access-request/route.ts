export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseBody } from '@/lib/validators/common';
import { accessRequestSchema } from '@/lib/validators/access-request';
import { checkRateLimitAsync } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { getBrandingConfig } from '@/lib/branding-config';
import { createAccessRequestStatusToken } from '@/lib/auth/access-request-status-token';
import { created } from '@/lib/server/http/api-response';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = await checkRateLimitAsync(`access-request:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: 'Trop de demandes — réessayez dans une minute' }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = parseBody(accessRequestSchema, body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const { nom, email, telephone, matricule, problemType, roleDemande, service, message, attachmentName, attachmentContent } = parsed.data;
    const normalizedEmail = email.trim().toLowerCase();
    const problemLabel = problemType
      ? ({ connexion: 'Connexion', mot_de_passe: 'Mot de passe', compte_bloque: 'Compte bloqué', acces_refuse: 'Accès refusé', demande_acces: 'Demande accès', autre: 'Autre' } as Record<string, string>)[problemType]
      : null;
    const composedMessage = [
      problemLabel ? `[${problemLabel}]` : null,
      message?.trim() || null,
    ].filter(Boolean).join('\n\n') || null;

    const pending = await prisma.accessRequest.findFirst({
      where: {
        email: normalizedEmail,
        statut: { in: ['envoye', 'en_attente'] },
      },
    });
    if (pending) {
      return NextResponse.json(
        { error: 'Une demande est déjà en attente pour cet email.' },
        { status: 409 },
      );
    }

    const request = await prisma.accessRequest.create({
      data: {
        nom: nom.trim(),
        email: normalizedEmail,
        telephone: telephone?.trim() || null,
        matricule: matricule?.trim().toUpperCase() || null,
        roleDemande: roleDemande?.trim() || null,
        service: service?.trim() || null,
        message: composedMessage,
        attachmentName: attachmentName?.trim() || null,
        attachmentContent: attachmentContent?.trim() || null,
        statut: 'en_attente',
      },
    });

    await logAudit({
      action: 'CREATE',
      entity: 'AccessRequest',
      entityId: request.id,
      entityLabel: `${nom} <${normalizedEmail}>`,
      details: { service, ip },
    });

    const admins = await prisma.user.findMany({
      where: { role: { in: ['admin', 'manager'] } },
      select: { id: true },
      take: 20,
    });
    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          title: "Demande d'accès ORION",
          message: `${nom} (${normalizedEmail}) — ${service || 'service non précisé'}`,
          link: '/admin/pricing?tab=acces',
          type: 'info',
        })),
      });
    }

    const branding = await getBrandingConfig();
    if (process.env.RESEND_API_KEY && branding.contactEmail) {
      // Notification email optionnelle si Resend configuré
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || 'ORION <onboarding@resend.dev>',
            to: branding.contactEmail,
            subject: `[ORION] Demande d'accès — ${nom}`,
            text: `Nouvelle demande d'accès:\nNom: ${nom}\nEmail: ${normalizedEmail}\nTél: ${telephone || '—'}\nService: ${service || '—'}\nMessage: ${message || '—'}\n\nAdmin: /admin/pricing?tab=acces`,
          }),
        });
      } catch {
        /* email optionnel */
      }
    }

    const statusToken = createAccessRequestStatusToken(request.id);

    return NextResponse.json(
      { ok: true, id: request.id, statut: request.statut, statusToken });
  } catch (err) {
    console.error('access-request error:', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
