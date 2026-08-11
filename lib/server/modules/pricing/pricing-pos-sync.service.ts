import { publishBaseMaterialsPricing } from './pricing-publication.service';
import { syncBaseMaterialsFromCatalog } from './base-material.service';
import { propagateAllPublishedMaterialPrices } from '@/lib/services/admin-data-sync.service';

/** Sync POS : matières catalogue → BaseMaterial + propagation prix → articles/POS. */
export async function syncPricingMaterialsToPos(options?: {
  publish?: boolean;
  userId?: string;
  userName?: string;
}): Promise<{
  sync: { created: number; updated: number };
  publish?: { materialsPublished: number; basePrintingPublished: number };
  propagations?: number;
}> {
  const sync = await syncBaseMaterialsFromCatalog();
  let publish;
  if (options?.publish) {
    publish = await publishBaseMaterialsPricing(options.userId);
  }
  const propagations = await propagateAllPublishedMaterialPrices({
    userId: options?.userId,
    userName: options?.userName,
  });
  return { sync, publish, propagations: propagations.length };
}
