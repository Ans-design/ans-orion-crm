/**
 * PricingRelease — publication immuable + pointeur actif (V12 Lot 2).
 * Rollback = nouvelle version monotone (jamais réutiliser un n°).
 */

import { createHash } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { enqueueOutbox } from '@/lib/server/outbox';

type Db = Prisma.TransactionClient | typeof prisma;

export type PricingReleaseSnapshot = Record<string, unknown>;

export function hashPricingSnapshot(snapshot: PricingReleaseSnapshot): string {
  return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
}

/**
 * Snapshot certifié à partir des profils / formules publiés (publication groupée).
 * JSON libre V12 Lot 2 — hashé pour immutabilité ; enfants complets = évolution.
 */
export async function buildCertifiedPricingSnapshot(
  db: Db = prisma,
): Promise<PricingReleaseSnapshot> {
  const [profiles, formulas, materialPrices] = await Promise.all([
    db.articlePricingProfile.findMany({
      where: { status: 'published', active: true },
      select: {
        articleId: true,
        articleLabel: true,
        calculationType: true,
        prixBase: true,
        prixM2: true,
        prixCm2: true,
        updatedAt: true,
      },
      orderBy: { articleId: 'asc' },
      take: 5000,
    }),
    db.formulaVersion.findMany({
      where: { status: 'published' },
      select: { articleId: true, version: true, updatedAt: true },
      orderBy: [{ articleId: 'asc' }, { version: 'desc' }],
      take: 5000,
    }),
    db.materialContextPrice.findMany({
      where: { active: true },
      select: {
        id: true,
        materialKey: true,
        priceContext: true,
        priceUnit: true,
        priceHT: true,
        updatedAt: true,
      },
      orderBy: { materialKey: 'asc' },
      take: 5000,
    }),
  ]);

  return {
    kind: 'certified-pricing-v1',
    capturedAt: new Date().toISOString(),
    counts: {
      profiles: profiles.length,
      formulas: formulas.length,
      materialContextPrices: materialPrices.length,
    },
    profiles,
    formulas,
    materialContextPrices: materialPrices,
  };
}

export async function getActivePricingRelease(db: Db = prisma) {
  const pointer = await db.pricingActivePointer.findUnique({
    where: { id: 'singleton' },
    include: { release: true },
  });
  if (!pointer || pointer.release.status !== 'active') return null;
  return pointer.release;
}

export async function getActivePricingReleaseId(db: Db = prisma): Promise<string | null> {
  const release = await getActivePricingRelease(db);
  return release?.id ?? null;
}

/**
 * Publie une nouvelle release depuis un snapshot certifié.
 * Archive l’éventuelle active, pointe singleton, écrit outbox PricingReleasePublished.
 */
export async function publishPricingRelease(input: {
  snapshot: PricingReleaseSnapshot;
  createdBy?: string;
  approvedBy?: string;
  restoredFromVersion?: number | null;
}): Promise<{ releaseId: string; version: number; hash: string }> {
  const hash = hashPricingSnapshot(input.snapshot);

  return prisma.$transaction(async (tx) => {
    const last = await tx.pricingRelease.findFirst({
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    const version = (last?.version ?? 0) + 1;

    await tx.pricingRelease.updateMany({
      where: { status: 'active' },
      data: { status: 'archived' },
    });

    const release = await tx.pricingRelease.create({
      data: {
        version,
        hash,
        status: 'active',
        publishedAt: new Date(),
        createdBy: input.createdBy ?? null,
        approvedBy: input.approvedBy ?? null,
        restoredFromVersion: input.restoredFromVersion ?? null,
        snapshotJson: JSON.stringify(input.snapshot),
      },
    });

    await tx.pricingActivePointer.upsert({
      where: { id: 'singleton' },
      create: { id: 'singleton', releaseId: release.id },
      update: { releaseId: release.id },
    });

    await enqueueOutbox({
      tx,
      type: 'PricingReleasePublished',
      aggregateType: 'PricingRelease',
      aggregateId: release.id,
      aggregateVersion: version,
      idempotencyKey: `pricing-release-published:${release.id}`,
      correlationId: release.id,
      payload: {
        releaseId: release.id,
        version,
        hash,
        restoredFromVersion: input.restoredFromVersion ?? null,
      },
    });

    return { releaseId: release.id, version, hash };
  }).then(async (result) => {
    try {
      const { invalidatePricingRuntimeCache, setPricingCacheReleaseId } = await import(
        '@/lib/pricing/pricing-runtime-cache'
      );
      setPricingCacheReleaseId(result.releaseId);
      invalidatePricingRuntimeCache(`pricing-release:${result.version}`);
    } catch {
      /* best-effort */
    }
    return result;
  });
}

/** Rollback = republier le snapshot d’une version antérieure sous un nouveau n°. */
export async function rollbackPricingRelease(toVersion: number, opts?: { approvedBy?: string }) {
  const previous = await prisma.pricingRelease.findUnique({ where: { version: toVersion } });
  if (!previous) throw new Error(`PricingRelease version ${toVersion} introuvable`);
  let snapshot: PricingReleaseSnapshot = {};
  try {
    snapshot = JSON.parse(previous.snapshotJson) as PricingReleaseSnapshot;
  } catch {
    snapshot = { raw: previous.snapshotJson };
  }
  return publishPricingRelease({
    snapshot,
    approvedBy: opts?.approvedBy,
    restoredFromVersion: toVersion,
  });
}
