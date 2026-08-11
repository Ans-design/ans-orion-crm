export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { requireApiAccess } from '@/lib/auth-utils';
import { logAudit } from '@/lib/audit';
import { ApiError } from '@/lib/server/http/errors';
import { created, ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { createPaiementInputSchema } from '@/lib/server/modules/paiements/paiements.validation';
import { createNotification } from '@/lib/services/notification-service';
import { syncCockpitOnPaiementComplete } from '@/lib/services/commande-module-sync';
import {
  createPaiementRecord,
  listPaiements,
  paiementErrorStatus,
  parsePaiementListQuery,
} from '@/lib/server/modules/paiements/paiements.service';
import { fromError } from '@/lib/server/http/api-response';

export const GET = withAuthApi(
  'paiements GET',
  async (_auth, req: NextRequest) => {
    const query = parsePaiementListQuery(new URL(req.url).searchParams);
    const paiements = await listPaiements(query);
    return ok(paiements);
  },
  {
    permission: 'paiements:read',
    fallbackResponse: { ok: true, data: [] },
  },
);

export async function POST(req: NextRequest) {
  return withAuthApi(
    'paiements POST',
    async (auth: AuthApiContext, request) => {
      const access = await requireApiAccess('paiements:write', request);
      if ('error' in access) return access.error;

      const parsed = parseBody(createPaiementInputSchema, await request.json(), 'paiements POST');
      if (!parsed.ok) return parsed.response;

      try {
        const result = await createPaiementRecord(parsed.data, {
          userId: auth.userId,
          userName: auth.userName,
        });

        if (!result.ok) {
          throw new ApiError(result.message, {
            status: paiementErrorStatus(result.code),
            code: 'BAD_REQUEST',
          });
        }

        const { paiement, devisConversion, commandeId, printFormat, factureId } = result;

        await logAudit({
          userId: auth.userId,
          userName: auth.userName,
          action: 'CREATE',
          entity: 'Paiement',
          entityId: paiement.id,
          entityLabel: `${paiement.numero} (${paiement.mode})`,
          details: { montant: paiement.montant, type: paiement.type, printFormat },
        });

        await createNotification({
          title: 'Paiement enregistré',
          message: `${paiement.numero} — ${paiement.montant.toLocaleString('fr-FR')} Ar (${paiement.mode})`,
          link: commandeId ? `/commandes/${commandeId}?tab=finance` : '/paiements',
          type: 'success',
          category: 'paiements',
        });

        if (commandeId) {
          await syncCockpitOnPaiementComplete(commandeId).catch(() => {});
        }

        return created({
          ...paiement,
          devisConversion,
          printFormat,
          factureId: factureId || paiement.factureId || null,
        });
      } catch (error) {
        return fromError(error);
      }
    },
    { permission: 'paiements:write' },
  )(req);
}
