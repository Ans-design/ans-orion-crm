import { prisma } from '@/lib/prisma';
import { publishDraftConfig } from '@/lib/services/admin-config';
import type { BackofficeSyncStatus } from './backoffice.types';

export async function getBackofficeSyncStatus(): Promise<BackofficeSyncStatus> {
  const [latestVersion, draftProfiles, publishedProfiles] = await Promise.all([
    prisma.configVersion.findFirst({
      where: { status: 'published' },
      orderBy: { publishedAt: 'desc' },
      select: { publishedAt: true, publishedBy: true, label: true },
    }),
    prisma.articlePricingProfile.count({ where: { status: { not: 'published' } } }),
    prisma.articlePricingProfile.count({ where: { status: 'published' } }),
  ]);

  const pendingChanges = draftProfiles;
  let status: BackofficeSyncStatus['status'] = 'synced';
  let message = 'Catalogue synchronisé avec le POS publié';

  if (pendingChanges > 0) {
    status = 'modified_unpublished';
    message = `${pendingChanges} profil(s) modifié(s) non publié(s)`;
  } else if (publishedProfiles === 0) {
    status = 'incomplete';
    message = 'Aucun profil publié — POS sur tarifs legacy';
  }

  return {
    posUpToDate: pendingChanges === 0 && publishedProfiles > 0,
    pendingChanges,
    lastPublishedAt: latestVersion?.publishedAt?.toISOString() ?? null,
    lastPublishedBy: latestVersion?.publishedBy ?? null,
    status,
    message,
  };
}

export async function publishBackofficeConfig(userId: string, userName: string) {
  return publishDraftConfig(userId, userName);
}

export async function syncBackofficeCatalog(opts?: { userId?: string; userName?: string }) {
  const { syncAdminToPOS } = await import('@/lib/services/admin-to-commercial-sync.service');
  return syncAdminToPOS({
    userId: opts?.userId,
    userName: opts?.userName,
    full: true,
  });
}
