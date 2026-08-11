/**
 * Seed / backfill Admin FinishingPrice depuis le catalogue canonique.
 * Idempotent : ne crée que les lignes manquantes, ne écrase jamais un prix Admin > 0.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { listCanonicalFinishingCatalog } from '@/lib/finition/finition-price-catalog';
import { spiralPriceForMm } from '@/lib/finition/finition-price-catalog';
import { SPIRALES } from '@/lib/data/catalogue';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';

export type FinishingBackfillReport = {
  scanned: number;
  created: number;
  preserved: number;
  restored: number;
  pricesMissing: number;
  errors: number;
  anomalies: string[];
  createdIds: string[];
};

export async function backfillFinishingAdminFromCatalog(opts?: {
  userId?: string;
  userName?: string;
  dryRun?: boolean;
  /** Écrase les prix Admin existants avec le catalogue PRIX 2026. */
  forceOverwritePrices?: boolean;
}): Promise<FinishingBackfillReport> {
  const rows = [
    ...listCanonicalFinishingCatalog(),
    ...SPIRALES.map((s) => ({
      excelId: `FIN-SPIRALE-${s.mm}`,
      name: `Reliure spirale ${s.mm} mm`,
      category: 'reliure_spirale',
      type: 'Spirale',
      reference: `spirale-${s.mm}`,
      formatRef: null as string | null,
      unit: 'exemplaire',
      unitPrice: s.px ?? spiralPriceForMm(s.mm),
      formulaType: 'fixed' as const,
      rule: 'PRIX 2026 RELIURE — prix unifié spirale',
      details: `Réf. ${s.ref}`,
    })),
  ];

  const report: FinishingBackfillReport = {
    scanned: rows.length,
    created: 0,
    preserved: 0,
    restored: 0,
    pricesMissing: 0,
    errors: 0,
    anomalies: [],
    createdIds: [],
  };

  for (const row of rows) {
    try {
      const existing = await prisma.finishingPrice.findFirst({
        where: {
          OR: [
            { excelId: row.excelId },
            { reference: row.reference },
          ],
        },
        orderBy: { updatedAt: 'desc' },
      });

      const priceOk = existing != null && existing.unitPrice > 0;
      if (existing && !priceOk && row.unitPrice <= 0) {
        report.pricesMissing += 1;
        report.anomalies.push(`${row.excelId}: prix à compléter`);
      }

      if (existing) {
        const wasArchived = existing.status === 'archived' || existing.active === false;
        if (opts?.dryRun) {
          if (wasArchived) report.restored += 1;
          else report.preserved += 1;
          continue;
        }
        const patch: Record<string, unknown> = {};
        if (!existing.excelId) patch.excelId = row.excelId;
        if (!existing.reference) patch.reference = row.reference;
        if (!existing.category) patch.category = row.category;
        if (!existing.unit) patch.unit = row.unit;
        if (!existing.formulaType) patch.formulaType = row.formulaType;
        if (!existing.details && row.details) patch.details = row.details;
        if (opts?.forceOverwritePrices && row.unitPrice > 0 && existing.unitPrice !== row.unitPrice) {
          patch.unitPrice = row.unitPrice;
          patch.rule = row.rule;
        } else if (!(existing.unitPrice > 0) && row.unitPrice > 0) {
          // Compléter prix manquant uniquement
          patch.unitPrice = row.unitPrice;
        }
        if (wasArchived) {
          patch.active = true;
          patch.status = (existing.unitPrice > 0 || row.unitPrice > 0) ? 'published' : 'a_completer';
          patch.visiblePOS = true;
          report.restored += 1;
        } else {
          report.preserved += 1;
        }
        if (Object.keys(patch).length) {
          await prisma.finishingPrice.update({
            where: { id: existing.id },
            data: patch as Parameters<typeof prisma.finishingPrice.update>[0]['data'],
          });
        }
        continue;
      }

      if (row.unitPrice <= 0) {
        report.pricesMissing += 1;
        report.anomalies.push(`${row.excelId}: prix à compléter`);
      }

      if (opts?.dryRun) {
        report.created += 1;
        report.createdIds.push(row.excelId);
        continue;
      }

      await prisma.finishingPrice.create({
        data: {
          excelId: row.excelId,
          name: row.name,
          category: row.category,
          unit: row.unit,
          unitPrice: row.unitPrice,
          formulaType: row.formulaType,
          reference: row.reference,
          details: [row.rule, row.details, row.formatRef ? `Format réf. ${row.formatRef}` : '']
            .filter(Boolean)
            .join(' — '),
          active: true,
          visiblePOS: row.unitPrice > 0 || row.formulaType === 'manual',
          status: row.unitPrice > 0 || row.formulaType === 'manual' ? 'published' : 'a_completer',
          sortOrder: report.created,
        },
      });
      report.created += 1;
      report.createdIds.push(row.excelId);
    } catch (e) {
      report.errors += 1;
      report.anomalies.push(`${row.excelId}: ${e instanceof Error ? e.message : 'erreur'}`);
    }
  }

  if (!opts?.dryRun && (report.created > 0 || report.restored > 0)) {
    await logAudit({
      userId: opts?.userId,
      userName: opts?.userName,
      action: 'BACKFILL',
      entity: 'FinishingPrice',
      entityLabel: 'Compléter Finitions depuis catalogue',
      details: report as unknown as Record<string, unknown>,
    });
    await notifyAdminModuleMutation('finishing-backfill', {
      userId: opts?.userId,
      userName: opts?.userName,
      details: { created: report.created, restored: report.restored, preserved: report.preserved },
    });
  }

  return report;
}
