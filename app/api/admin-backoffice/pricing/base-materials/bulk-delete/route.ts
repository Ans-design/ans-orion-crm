export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { withAuthApi } from '@/lib/server/auth/with-auth-api';
import { safeErrorMessage } from '@/lib/api-response';
import {
  archiveBaseMaterial,
  getBaseMaterialById,
  purgeArchivedBaseMaterial,
} from '@/lib/server/modules/pricing/base-material.repository';
import { invalidateKpiCaches } from '@/lib/services/kpi-cache-invalidation';

export const POST = withAuthApi(
  'base-materials bulk-delete',
  async (_auth, req: NextRequest) => {
    try {
      const body = (await req.json()) as { ids?: string[]; permanent?: boolean };
      const ids = Array.isArray(body.ids) ? [...new Set(body.ids.filter(Boolean))] : [];
      const forcePermanent = body.permanent === true;
      if (!ids.length) {
        return NextResponse.json(
          { ok: false, error: { message: 'Aucune matière sélectionnée', code: 'EMPTY_SELECTION' } },
          { status: 400 },
        );
      }

      let deleted = 0;
      let archived = 0;
      const errors: Array<{ id: string; reason: string }> = [];

      for (const id of ids) {
        try {
          const existing = await getBaseMaterialById(id);
          if (!existing) {
            errors.push({ id, reason: 'Matière introuvable' });
            continue;
          }

          // Depuis la corbeille (déjà archivée) ou demande explicite → purge
          if (forcePermanent || existing.archived) {
            await purgeArchivedBaseMaterial(id);
            deleted += 1;
            continue;
          }

          // Liste active → soft-delete (corbeille)
          try {
            await archiveBaseMaterial(id);
            try {
              const { withdrawMaterialFromPos } = await import(
                '@/lib/services/admin-data-sync.service'
              );
              await withdrawMaterialFromPos(id);
            } catch {
              /* best-effort */
            }
            archived += 1;
          } catch (archiveErr) {
            errors.push({
              id,
              reason: archiveErr instanceof Error ? archiveErr.message : 'Archivage impossible',
            });
          }
        } catch (error) {
          errors.push({
            id,
            reason: safeErrorMessage(error, 'Suppression impossible'),
          });
        }
      }

      await invalidateKpiCaches();

      return NextResponse.json({
        ok: true,
        data: { deleted, archived, errors, total: ids.length },
      });
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            message: safeErrorMessage(error, 'Suppression multiple impossible'),
            code: 'BULK_DELETE_ERROR',
          },
        },
        { status: 500 },
      );
    }
  },
  { anyPermissions: ['tarifs:write', 'config:edit_price', 'config:publish'] },
);
