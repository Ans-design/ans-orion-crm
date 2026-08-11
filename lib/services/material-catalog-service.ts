import { prisma } from '@/lib/prisma';
import { OFFICIAL_MATERIAL_COMPAT } from '@/lib/data/material-compat-official';
import type { MaterialEntry } from '@/lib/data/materials-config';

export type MaterialWithGrammages = {
  key: string;
  label: string;
  family: string;
  grammages: string[];
  actif: boolean;
};

/** Charge matières depuis DB, fallback code officiel */
export async function loadMaterialCatalog(): Promise<MaterialWithGrammages[]> {
  try {
    const rows = await prisma.materialCatalog.findMany({
      where: { actif: true },
      include: { grammages: { where: { actif: true }, orderBy: { value: 'asc' } } },
      orderBy: { label: 'asc' },
    });
    if (rows.length > 0) {
      return rows.map((m) => ({
        key: m.key,
        label: m.label,
        family: m.family,
        grammages: m.grammages.map((g) => g.value),
        actif: m.actif,
      }));
    }
  } catch (err) {
    console.warn('[material-catalog] DB fallback:', err);
  }
  return OFFICIAL_MATERIAL_COMPAT.map((m) => ({
    key: m.key,
    label: m.label,
    family: m.family,
    grammages: m.grammages,
    actif: true,
  }));
}

/** Compatibilité POS — grammages filtrés par matière (jamais chip combinée) */
export function grammagesForMaterialLabel(
  materials: MaterialWithGrammages[],
  materialLabel: string,
): string[] {
  const norm = materialLabel.trim().toLowerCase();
  const m = materials.find(
    (x) => x.label.toLowerCase() === norm || x.key.toLowerCase() === norm,
  );
  return m?.grammages ?? [];
}

/** Legacy bridge pour hooks existants */
export function toMaterialEntries(materials: MaterialWithGrammages[]): MaterialEntry[] {
  return materials.map((m) => ({
    id: m.key,
    label: m.label,
    category: m.family === 'Carte' ? 'carte' : m.family === 'Grand format' ? 'autre' : 'print',
    actif: m.actif,
    grammages: m.grammages,
  }));
}

export async function upsertMaterialCatalogFromEntries(entries: MaterialEntry[]): Promise<number> {
  let count = 0;
  for (const entry of entries) {
    const family =
      entry.category === 'carte' ? 'Carte'
        : entry.category === 'print' ? 'Petit format'
          : 'Autre';
    const row = await prisma.materialCatalog.upsert({
      where: { key: entry.id },
      update: { label: entry.label, family, actif: entry.actif, source: 'admin:parametres/matieres' },
      create: {
        key: entry.id,
        label: entry.label,
        family,
        actif: entry.actif,
        source: 'admin:parametres/matieres',
      },
    });
    const activeValues = new Set(entry.grammages.map((g) => g.trim()).filter(Boolean));
    for (const g of activeValues) {
      await prisma.grammageCatalog.upsert({
        where: { materialId_value: { materialId: row.id, value: g } },
        update: { actif: true },
        create: { materialId: row.id, value: g, actif: true },
      });
    }
    const existing = await prisma.grammageCatalog.findMany({ where: { materialId: row.id } });
    for (const g of existing) {
      if (!activeValues.has(g.value)) {
        await prisma.grammageCatalog.update({ where: { id: g.id }, data: { actif: false } });
      }
    }
    count++;
  }
  return count;
}

export async function seedOfficialMaterialCatalog(): Promise<number> {
  let count = 0;
  for (const m of OFFICIAL_MATERIAL_COMPAT) {
    const row = await prisma.materialCatalog.upsert({
      where: { key: m.key },
      update: { label: m.label, family: m.family, actif: true, source: m.source ?? null },
      create: {
        key: m.key,
        label: m.label,
        family: m.family,
        source: m.source ?? null,
        actif: true,
      },
    });
    for (const g of m.grammages) {
      await prisma.grammageCatalog.upsert({
        where: { materialId_value: { materialId: row.id, value: g } },
        update: { actif: true },
        create: { materialId: row.id, value: g, actif: true },
      });
    }
    count++;
  }
  return count;
}
