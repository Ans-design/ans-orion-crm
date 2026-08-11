export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { logAuditChange } from '@/lib/audit';
import { ApiError } from '@/lib/server/http/errors';
import { ok } from '@/lib/server/http/api-response';
import { withAuthApi, type AuthApiContext } from '@/lib/server/auth/with-auth-api';
import { parseBody } from '@/lib/server/validation/common';
import { updateDevisInputSchema } from '@/lib/server/modules/devis/devis.validation';
import { resolveParams } from '@/lib/api/route-params';
import {
  deleteDevisRecord,
  getDevisDetail,
  updateDevisRecord,
} from '@/lib/server/modules/devis/devis.service';

export async function GET(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'devis/[id] GET',
    async () => {
      const devis = await getDevisDetail(id);
      if (!devis) throw ApiError.notFound('Devis introuvable');
      return ok(devis);
    },
    { permission: 'devis:read' },
  )(req);
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'devis/[id] PUT',
    async (auth: AuthApiContext, request) => {
      const parsed = parseBody(updateDevisInputSchema, await request.json(), 'devis/[id] PUT');
      if (!parsed.ok) return parsed.response;

      const outcome = await updateDevisRecord(id, parsed.data);
      if (outcome.status === 'not_found') {
        throw ApiError.notFound('Devis introuvable');
      }
      if (outcome.status === 'blocked_accept') {
        throw ApiError.conflict(outcome.message);
      }

      const { devis, existing, updateData } = outcome;

      await logAuditChange({
        userId: auth.userId,
        userName: auth.userName,
        action: Object.keys(updateData).length > 0 ? 'VERSION_SNAPSHOT' : 'UPDATE',
        entity: 'Devis',
        entityId: devis.id,
        entityLabel: devis.numero,
        oldValue: {
          statut: existing.statut,
          remise: existing.remise,
          totalHT: existing.totalHT,
          totalTTC: existing.totalTTC,
          notes: existing.notes,
          clientId: existing.clientId,
        },
        newValue: {
          statut: devis.statut,
          remise: devis.remise,
          totalHT: devis.totalHT,
          totalTTC: devis.totalTTC,
          notes: devis.notes,
          clientId: devis.clientId,
        },
        details: {
          snapshot: {
            statut: devis.statut,
            remise: devis.remise,
            totalHT: devis.totalHT,
            totalTTC: devis.totalTTC,
            ligneCount: devis.lignes.length,
            updatedFields: Object.keys(updateData),
          },
        },
      });

      return ok(devis);
    },
    { permission: 'devis:write' },
  )(req);
}

export async function DELETE(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  return withAuthApi(
    'devis/[id] DELETE',
    async (auth: AuthApiContext) => {
      const outcome = await deleteDevisRecord(id, auth.userId);
      if (outcome.status === 'not_found') {
        throw ApiError.notFound('Devis introuvable');
      }
      if (outcome.status === 'blocked') {
        throw ApiError.conflict(outcome.reason);
      }
      return ok({ archived: true, id });
    },
    { permission: 'devis:write' },
  )(req);
}
