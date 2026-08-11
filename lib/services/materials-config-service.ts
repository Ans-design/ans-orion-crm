import { prisma } from '@/lib/prisma';
import { DEFAULT_MATERIALS, MATERIALS_CONFIG_KEY, type MaterialEntry } from '@/lib/data/materials-config';
import {
  loadMaterialCatalog,
  toMaterialEntries,
  upsertMaterialCatalogFromEntries,
} from '@/lib/services/material-catalog-service';

export async function getMaterialsConfig(): Promise<MaterialEntry[]> {
  try {
    const fromDb = await loadMaterialCatalog();
    if (fromDb.length > 0) return toMaterialEntries(fromDb);
  } catch {
    /* fallback SystemConfig */
  }
  try {
    const row = await prisma.systemConfig.findUnique({ where: { configKey: MATERIALS_CONFIG_KEY } });
    if (row?.data && Array.isArray(row.data)) {
      return row.data as MaterialEntry[];
    }
  } catch {
    /* fallback */
  }
  return DEFAULT_MATERIALS;
}

export async function saveMaterialsConfig(materials: MaterialEntry[], userId?: string): Promise<MaterialEntry[]> {
  await upsertMaterialCatalogFromEntries(materials);
  await prisma.systemConfig.upsert({
    where: { configKey: MATERIALS_CONFIG_KEY },
    create: { configKey: MATERIALS_CONFIG_KEY, data: materials as object, updatedBy: userId },
    update: { data: materials as object, updatedBy: userId },
  });
  return materials;
}
