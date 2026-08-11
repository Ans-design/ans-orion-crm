/**
 * Sync Admin Textile → POS (audit + rebuild index catalogue).
 * Les prix sont lus directement depuis les tables Textile* par le moteur.
 */
import { TEXTILE_CATALOGUE_IDS } from '@/lib/pricing/textile-ids';
import { logAudit } from '@/lib/audit';
import { syncArticleOptionsToPOS } from '@/lib/services/catalog-options-sync.service';

export async function syncTextileAdminToPos(
  articleId: string | null,
  opts?: { userId?: string; userName?: string },
) {
  const errors: string[] = [];
  let modelsSynced = 0;

  try {
    if (articleId && articleId !== '*') {
      await syncArticleOptionsToPOS(articleId, opts);
      modelsSynced = 1;
    } else {
      await syncArticleOptionsToPOS(undefined, opts);
      modelsSynced = TEXTILE_CATALOGUE_IDS.length;
    }
  } catch (e) {
    errors.push(e instanceof Error ? e.message : 'synchronisation POS échouée');
  }

  await logAudit({
    userId: opts?.userId,
    userName: opts?.userName,
    action: 'SYNC',
    entity: 'TextileAdmin',
    entityId: articleId ?? 'all',
    details: { modelsSynced, errors },
  });

  return {
    modelsSynced,
    techniquesSynced: modelsSynced,
    errors,
    ok: errors.length === 0,
  };
}
