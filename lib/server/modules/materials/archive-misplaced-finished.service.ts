/**
 * Archive hors-liste Matières : produits finis + services/reliures (sans supprimer les routes).
 */

import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { archiveBaseMaterial, listBaseMaterials } from '@/lib/server/modules/pricing/base-material.repository';
import { shouldListAsMaterial } from '@/lib/backoffice/material-vs-article';

export async function archiveMisplacedFinishedProductsFromMaterials(opts?: {
  userId?: string;
  userName?: string;
}): Promise<{ archived: number; labels: string[] }> {
  const { rows } = await listBaseMaterials({ archivedOnly: false });
  const labels: string[] = [];

  for (const m of rows) {
    if (shouldListAsMaterial({ label: m.label, family: m.family })) continue;
    await archiveBaseMaterial(m.id, opts?.userId ?? null);
    labels.push(`${m.excelRowId ?? m.id}: ${m.label}`);
    try {
      await prisma.baseMaterial.update({
        where: { id: m.id },
        data: {
          anomalyNotes: [
            m.anomalyNotes,
            'NOT_SUBSTRATE_MATERIAL — hors liste Matières (support / service) → Prix articles, Formules ou Corbeille',
          ]
            .filter(Boolean)
            .join(' | ')
            .slice(0, 500),
          visiblePos: false,
        },
      });
    } catch {
      /* ignore */
    }
  }

  if (labels.length) {
    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'ARCHIVE',
      entity: 'BaseMaterial',
      entityLabel: 'non-substrate-materials',
      details: { count: labels.length, labels: labels.slice(0, 40) },
    });
  }

  return { archived: labels.length, labels: labels.slice(0, 50) };
}
