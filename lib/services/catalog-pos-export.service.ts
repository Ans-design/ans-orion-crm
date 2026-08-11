import { getPosCatalogue, type PosCatalogueItem } from '@/lib/services/catalogue-service';

export type CatalogPosExportPayload = {
  exportedAt: string;
  source: string;
  coverage: unknown;
  itemCount: number;
  items: Array<{
    id: string;
    name: string;
    category: string;
    prixDepart: number | null;
    unit: string;
    priceSource: PosCatalogueItem['priceSource'];
    profileStatus?: string;
    visiblePos: boolean;
  }>;
};

/** Export JSON du catalogue POS tel qu'exposé opérationnellement (profils publiés). */
export async function buildCatalogPosExport(role = 'admin'): Promise<CatalogPosExportPayload> {
  const payload = await getPosCatalogue(role);
  const items = payload.items
    .filter((i) => i.visiblePos)
    .map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      prixDepart: i.prixDepart,
      unit: i.unit,
      priceSource: i.priceSource,
      profileStatus: i.profileStatus,
      visiblePos: i.visiblePos,
    }));

  return {
    exportedAt: new Date().toISOString(),
    source: payload.source,
    coverage: payload.coverage,
    itemCount: items.length,
    items,
  };
}
