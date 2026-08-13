export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { acceptDevisToCommande } from '@/lib/services/devis-accept-service';
import { resolveParams } from '@/lib/api/route-params';
import { createPaiementInputSchema } from '@/lib/server/modules/paiements/paiements.validation';
import { createPaiementRecord } from '@/lib/server/modules/paiements/paiements.service';

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('devis:accept');
  if ('error' in auth) return auth.error;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      payment?: {
        montant?: number;
        mode?: string;
        reference?: string | null;
        type?: string;
        notes?: string | null;
        clientId?: string | null;
        mobileMoneyProvider?: string | null;
        bankName?: string | null;
        paymentTime?: string | null;
      };
    };

    const pay = body?.payment;
    const payMontant = Number(pay?.montant ?? 0);
    if (pay && Number.isFinite(payMontant) && payMontant > 0) {
      const rawMode = String(pay.mode ?? 'Espèces');
      const mode = rawMode.startsWith('Virement')
        ? 'Virement'
        : rawMode === 'Especes'
          ? 'Espèces'
          : rawMode === 'Cheque'
            ? 'Chèque'
            : rawMode;
      const parsedPay = createPaiementInputSchema.safeParse({
        devisId: id,
        clientId: pay.clientId ?? null,
        montant: payMontant,
        mode,
        reference: pay.reference ?? null,
        type: pay.type === 'Solde' ? 'Solde' : 'Acompte',
        notes: pay.notes ?? null,
        mobileMoneyProvider: pay.mobileMoneyProvider ?? null,
        bankName: pay.bankName ?? null,
        paymentTime: pay.paymentTime ?? null,
      });
      if (!parsedPay.success) {
        return apiError(parsedPay.error.issues[0]?.message || 'Paiement invalide', 400);
      }
      const payResult = await createPaiementRecord(parsedPay.data, {
        userId: auth.userId,
        userName: auth.userName,
      });
      if (!payResult.ok) {
        return apiError(payResult.message, 400);
      }
    }

    const result = await acceptDevisToCommande(id, {
      userId: auth.userId,
      userName: auth.userName,
    });

    if (!result.ok) {
      if (result.code === 'NOT_FOUND') return apiError('Devis introuvable', 404);
      if (result.code === 'ALREADY_ACCEPTED') return apiError('Devis déjà accepté', 409);
      if (result.code === 'NO_LIGNES') return apiError('Devis sans lignes', 400);
      if (result.code === 'EXPIRED') return apiError(result.message, 409);
      if (result.code === 'REFUSED') return apiError(result.message, 409);
      return apiError('Acceptation impossible', 400);
    }

    await logAudit({
      userId: auth.userId,
      userName: auth.userName,
      action: 'ACCEPT',
      entity: 'Devis',
      entityId: id,
      entityLabel: result.devis.numero,
      details: {
        commandeNumero: result.commande.numero,
        commandeId: result.commande.id,
        ligneCount: result.ligneCount,
        stockReservations: result.stockReservations,
      },
    });

    const { attachLiveDomains } = await import('@/lib/live/live-response');
    return attachLiveDomains(
      NextResponse.json({
        success: true,
        commandesCreated: 1,
        commande: result.commande,
        ligneCount: result.ligneCount,
        stockReservations: result.stockReservations,
      }),
      ['commandes', 'devis', 'production', 'paiements', 'stock', 'nav'],
    );
  } catch (error) {
    console.error('Accept devis error:', error);
    return apiError(safeErrorMessage(error, 'Erreur lors de l\'acceptation'), 500);
  }
}
