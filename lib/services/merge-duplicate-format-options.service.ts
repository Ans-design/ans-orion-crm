/**
 * Fusion intelligente des chips Format en doublon (Admin ProductOptionValue).
 * Zéro suppression : archive + transfert priceModifier / forcePrice + audit.
 */
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { notifyAdminModuleMutation } from '@/lib/services/admin-data-sync.service';
import {
  dedupeFormatOptionRecords,
  formatIdentityKey,
  normalizeFormatOption,
  extractIsoFormatCode,
  type FormatOptionRecord,
} from '@/lib/pos/normalize-format-options';
import { buildFormatAdminMetadata } from '@/lib/pos/format-commercial-aliases';
import { isGrandFormatArticleId } from '@/lib/grand-format/article-meta';
import type { Prisma } from '@prisma/client';

const SYNC_SOURCE = 'format-option-dedupe';

const FORMAT_FIELD_RE = /format|dimension|taille|^dim$/i;

export type MergeDuplicateFormatsReport = {
  groupsScanned: number;
  merges: number;
  archived: number;
  labelsNormalized: number;
  articlesTouched: string[];
  details: Array<{
    articleId: string;
    fieldKey: string;
    keptLabel: string;
    archivedLabels: string[];
  }>;
};

function isFormatGroup(fieldKey: string): boolean {
  return FORMAT_FIELD_RE.test(fieldKey) && !/grammage/i.test(fieldKey);
}

export async function mergeDuplicateFormatOptions(opts?: {
  articleId?: string;
  userId?: string;
  userName?: string;
  dryRun?: boolean;
}): Promise<MergeDuplicateFormatsReport> {
  const report: MergeDuplicateFormatsReport = {
    groupsScanned: 0,
    merges: 0,
    archived: 0,
    labelsNormalized: 0,
    articlesTouched: [],
    details: [],
  };

  const groups = await prisma.productOptionGroup.findMany({
    where: {
      ...(opts?.articleId ? { articleId: opts.articleId } : {}),
      active: true,
    },
    include: {
      values: true,
    },
  });

  const formatGroups = groups.filter((g) => isFormatGroup(g.fieldKey));
  report.groupsScanned = formatGroups.length;
  const touched = new Set<string>();

  for (const group of formatGroups) {
    const keepCm = isGrandFormatArticleId(group.articleId);
    const records: FormatOptionRecord[] = group.values.map((v) => ({
      id: v.id,
      label: v.label,
      valueKey: v.valueKey,
      active: v.active,
      sortOrder: v.sortOrder,
      priceModifier: v.priceModifier,
      forcePrice: v.forcePrice,
      metadata: (v.metadata as Record<string, unknown> | null) ?? null,
    }));

    const { kept, merges } = dedupeFormatOptionRecords(records, { keepCm });
    if (!merges.length) {
      // Normaliser les libellés actifs même sans fusion
      for (const k of kept) {
        const original = group.values.find((v) => v.id === k.id);
        if (!original) continue;
        const nextLabel = normalizeFormatOption(original.label, { keepCm });
        if (nextLabel !== original.label && !opts?.dryRun) {
          await prisma.productOptionValue.update({
            where: { id: original.id },
            data: {
              label: nextLabel,
              metadata: {
                ...((original.metadata as object) ?? {}),
                normalizedFrom: original.label,
                source: SYNC_SOURCE,
              } as Prisma.InputJsonValue,
            },
          });
          report.labelsNormalized += 1;
          touched.add(group.articleId);
        } else if (nextLabel !== original.label) {
          report.labelsNormalized += 1;
        }
      }
      continue;
    }

    const archivedLabels: string[] = [];
    const keepRec = kept.find((k) =>
      merges.some((m) => m.keep.id === k.id || formatIdentityKey(m.keep.label) === formatIdentityKey(k.label)),
    ) ?? kept[0]!;

    let transferredModifier = keepRec.priceModifier ?? 0;
    let transferredForce = keepRec.forcePrice ?? false;
    for (const m of merges) {
      if (Math.abs(m.archive.priceModifier ?? 0) > Math.abs(transferredModifier)) {
        transferredModifier = m.archive.priceModifier ?? 0;
      }
      if (m.archive.forcePrice) transferredForce = true;
      archivedLabels.push(m.archive.label);
    }

    if (!opts?.dryRun) {
      const keepId = keepRec.id!;
      const keepDb = group.values.find((v) => v.id === keepId);
      const canonicalLabel = normalizeFormatOption(keepRec.label, { keepCm });
      const isoCode = extractIsoFormatCode(canonicalLabel);
      const adminMeta = isoCode ? buildFormatAdminMetadata(isoCode) : null;

      await prisma.productOptionValue.update({
        where: { id: keepId },
        data: {
          label: canonicalLabel,
          priceModifier: transferredModifier,
          forcePrice: transferredForce,
          active: true,
          metadata: {
            ...((keepDb?.metadata as object) ?? {}),
            ...(adminMeta ?? {}),
            source: SYNC_SOURCE,
            mergedDuplicates: archivedLabels,
            normalizedFrom: keepDb?.label !== canonicalLabel ? keepDb?.label : undefined,
          } as Prisma.InputJsonValue,
        },
      });
      report.labelsNormalized += keepDb?.label !== canonicalLabel ? 1 : 0;

      for (const m of merges) {
        if (!m.archive.id || m.archive.id === keepId) continue;
        await prisma.productOptionValue.update({
          where: { id: m.archive.id },
          data: {
            active: false,
            metadata: {
              ...((m.archive.metadata as object) ?? {}),
              archivedReason: 'format-duplicate-merge',
              mergedIntoLabel: canonicalLabel,
              mergedIntoId: keepId,
              archivedAt: new Date().toISOString(),
              source: SYNC_SOURCE,
            } as Prisma.InputJsonValue,
          },
        });
        report.archived += 1;
        report.merges += 1;
      }

      await logAudit({
        userId: opts?.userId,
        userName: opts?.userName,
        action: 'format_options_dedupe',
        entity: 'ProductOptionGroup',
        entityId: group.id,
        entityLabel: `${group.articleId}/${group.fieldKey}`,
        details: {
          keptLabel: canonicalLabel,
          archivedLabels,
          identityKey: formatIdentityKey(canonicalLabel),
        },
      });
    } else {
      report.merges += merges.length;
      report.archived += merges.length;
    }

    report.details.push({
      articleId: group.articleId,
      fieldKey: group.fieldKey,
      keptLabel: normalizeFormatOption(keepRec.label, { keepCm }),
      archivedLabels,
    });
    touched.add(group.articleId);
  }

  report.articlesTouched = [...touched];

  if (!opts?.dryRun && touched.size) {
    await notifyAdminModuleMutation('format-options-dedupe', {
      userId: opts?.userId,
      userName: opts?.userName,
      details: { articleIds: [...touched], merges: report.merges, archived: report.archived },
    });
  }

  return report;
}

/** Scan léger : groupes format avec doublons actifs encore présents. */
export async function scanFormatOptionDuplicates(limit = 200): Promise<
  Array<{ articleId: string; fieldKey: string; labels: string[] }>
> {
  const groups = await prisma.productOptionGroup.findMany({
    where: { active: true },
    include: { values: { where: { active: true } } },
    take: limit * 2,
  });

  const out: Array<{ articleId: string; fieldKey: string; labels: string[] }> = [];
  for (const g of groups) {
    if (!isFormatGroup(g.fieldKey)) continue;
    const keepCm = isGrandFormatArticleId(g.articleId);
    const byKey = new Map<string, string[]>();
    for (const v of g.values) {
      const key = formatIdentityKey(normalizeFormatOption(v.label, { keepCm }));
      const list = byKey.get(key) ?? [];
      list.push(v.label);
      byKey.set(key, list);
    }
    for (const labels of byKey.values()) {
      if (new Set(labels.map((l) => l.trim().toLowerCase())).size > 1) {
        out.push({ articleId: g.articleId, fieldKey: g.fieldKey, labels });
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}
