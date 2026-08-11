export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePermission } from '@/lib/auth-utils';
import { apiError, safeErrorMessage } from '@/lib/api-response';
import { parseOr400 } from '@/lib/validators/parse';
import { resolveParams } from '@/lib/api/route-params';
import {
  createNextVersion,
  getStudioBrief,
  togglePrepressCheck,
  updateStudioBrief,
  updateVersionStatut,
} from '@/lib/services/studio-service';
import { syncGpaoOnStudioLivrerProduction } from '@/lib/services/bat-gpao-sync';
import { syncCommandeOnGpaoEtapeComplete } from '@/lib/services/commande-module-sync';

const patchSchema = z.object({
  titre: z.string().min(1).max(200).optional(),
  briefText: z.string().max(5000).optional().nullable(),
  statut: z.string().optional(),
  assignedToName: z.string().max(80).optional().nullable(),
  fichiersManquants: z.boolean().optional(),
  tempsPasseMin: z.number().int().min(0).optional(),
  notesInternes: z.string().max(2000).optional().nullable(),
  versionId: z.string().optional(),
  versionStatut: z.string().optional(),
  versionComment: z.string().max(1000).optional().nullable(),
  checkId: z.string().optional(),
  checked: z.boolean().optional(),
  action: z.enum(['new_version', 'demander_fichiers', 'livrer_production']).optional(),
});

export async function GET(_req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('bat:read');
  if ('error' in auth) return auth.error;

  try {
    const brief = await getStudioBrief(id);
    if (!brief) return apiError('Brief introuvable', 404);
    return NextResponse.json(brief);
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur brief'), 500);
  }
}

export async function PATCH(req: NextRequest, ctx: { params: { id: string } | Promise<{ id: string }> }) {
  const { id } = await resolveParams(ctx.params);
  const auth = await requirePermission('bat:write');
  if ('error' in auth) return auth.error;

  try {
    const parsed = parseOr400(patchSchema, await req.json());
    if ('error' in parsed) return parsed.error;

    const { action, versionId, versionStatut, versionComment, checkId, checked, ...data } = parsed.data;

    if (action === 'new_version') {
      const version = await createNextVersion(id, auth.userName);
      return NextResponse.json(version);
    }

    if (action === 'demander_fichiers') {
      await updateStudioBrief(id, { fichiersManquants: true, statut: 'En attente fichiers' });
      return NextResponse.json(await getStudioBrief(id));
    }

    if (action === 'livrer_production') {
      await updateStudioBrief(id, { statut: 'Livré production' });
      const brief = await getStudioBrief(id);
      if (brief?.commandeId) {
        await syncGpaoOnStudioLivrerProduction(brief.commandeId).catch((err) => {
          console.error('[studio/briefs] syncGpaoOnStudioLivrerProduction:', err);
        });
        await syncCommandeOnGpaoEtapeComplete(brief.commandeId, 'Planification production', {
          userId: auth.userId,
          userName: auth.userName,
        }).catch((err) => {
          console.error('[studio/briefs] syncCommandeOnGpaoEtapeComplete:', err);
        });
      }
      return NextResponse.json(brief ?? (await getStudioBrief(id)));
    }

    if (versionId && versionStatut) {
      const brief = await updateVersionStatut(id, versionId, {
        statut: versionStatut,
        commentaire: versionComment,
      });
      return NextResponse.json(brief);
    }

    if (checkId !== undefined && checked !== undefined) {
      const brief = await togglePrepressCheck(id, checkId, checked, auth.userName);
      return NextResponse.json(brief);
    }

    if (Object.keys(data).length > 0) {
      await updateStudioBrief(id, data);
    }

    return NextResponse.json(await getStudioBrief(id));
  } catch (error) {
    return apiError(safeErrorMessage(error, 'Erreur mise à jour'), 500);
  }
}
