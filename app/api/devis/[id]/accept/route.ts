export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { acceptDevisToCommande } from '@/lib/services/devis-accept-service';
import { resolveParams } from '@/lib/api/route-params';

export async function POST(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('devis:accept');
  if ('error' in auth) return auth.error;

  try {
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

    return NextResponse.json({
      success: true,
      commandesCreated: 1,
      commande: result.commande,
      ligneCount: result.ligneCount,
      stockReservations: result.stockReservations,
    });
  } catch (error) {
    console.error('Accept devis error:', error);
    return apiError(safeErrorMessage(error, 'Erreur lors de l\'acceptation'), 500);
  }
}
