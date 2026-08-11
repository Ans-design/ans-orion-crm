/**
 * Enregistrement des handlers outbox V12 (idempotents / reconcile).
 * Importé par le cron outbox avant processOutboxBatch.
 */

import { registerOutboxHandler } from '@/lib/server/outbox-worker';

let registered = false;

export function ensureOutboxHandlersRegistered(): void {
  if (registered) return;
  registered = true;

  registerOutboxHandler('DevisAccepted', async (event) => {
    const commandeId = String(event.payload.commandeId ?? '');
    if (!commandeId) return;
    const { bootstrapCommandeWorkflow } = await import('@/lib/services/commande-workflow-service');
    await bootstrapCommandeWorkflow(commandeId, {
      userId: typeof event.payload.userId === 'string' ? event.payload.userId : undefined,
      userName: typeof event.payload.userName === 'string' ? event.payload.userName : undefined,
    });
    const { advanceKpiWatermark } = await import('@/lib/kpi/invalidation-map');
    advanceKpiWatermark();
  });

  registerOutboxHandler('PricingReleasePublished', async (event) => {
    console.info(
      '[outbox] PricingReleasePublished',
      event.aggregateId,
      event.payload.version,
    );
    const { invalidateAdminCaches } = await import('@/lib/services/admin-data-sync.service');
    const { rebuildPOSPriceIndex } = await import('@/lib/services/pricing-data-sync.service');
    const { invalidateSyncDiagnosticsCache } = await import('@/lib/services/sync.service');
    const { advanceKpiWatermark } = await import('@/lib/kpi/invalidation-map');
    await invalidateAdminCaches();
    await rebuildPOSPriceIndex();
    invalidateSyncDiagnosticsCache();
    advanceKpiWatermark();
  });

  registerOutboxHandler('PaiementRecorded', async (event) => {
    console.info('[outbox] PaiementRecorded', event.aggregateId);
    const { advanceKpiWatermark } = await import('@/lib/kpi/invalidation-map');
    advanceKpiWatermark();
  });

  registerOutboxHandler('LivraisonCompleted', async (event) => {
    const commandeId = String(event.payload.commandeId ?? '');
    if (!commandeId) return;
    console.info('[outbox] LivraisonCompleted', event.aggregateId, commandeId);
    const { advanceKpiWatermark } = await import('@/lib/kpi/invalidation-map');
    advanceKpiWatermark();
  });

  registerOutboxHandler('PermissionPolicyChanged', async (event) => {
    console.info('[outbox] PermissionPolicyChanged v', event.payload.version);
  });

  registerOutboxHandler('TalkMessageCreated', async (event) => {
    console.info('[outbox] TalkMessageCreated', event.aggregateId, event.payload.conversationId);
  });

  registerOutboxHandler('NotificationEmailFanout', async (event) => {
    const onlyUserIds = Array.isArray(event.payload.onlyUserIds)
      ? event.payload.onlyUserIds.filter((id): id is string => typeof id === 'string')
      : [];
    if (!onlyUserIds.length) return;
    const { dispatchEmailAlerts } = await import('@/lib/services/notification-service');
    await dispatchEmailAlerts(
      {
        title: String(event.payload.title ?? 'Notification'),
        message: String(event.payload.message ?? ''),
        link: typeof event.payload.link === 'string' ? event.payload.link : undefined,
        category: typeof event.payload.category === 'string'
          ? (event.payload.category as 'devis' | 'commandes' | 'factures' | 'paiements' | 'production' | 'livraisons' | 'audit')
          : undefined,
      },
      { onlyUserIds },
    );
  });
}
