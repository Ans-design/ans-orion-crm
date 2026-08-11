import { IMPRESSION_SF_MATERIALS } from '@/lib/data/impression-sf-material-catalog';
import { OFFICIAL_MATERIAL_COMPAT } from '@/lib/data/material-compat-official';
import { SUPPLEMENTARY_MATERIAL_COMPAT } from '@/lib/data/material-supplementary';
import { prisma } from '@/lib/prisma';
import { normalizeMaterialName, parseMaterialKey } from '@/lib/server/modules/materials/material-key';

export type MaterialPriceBackfillResult = {
  updated: number;
  skipped: number;
  remaining: number;
  sources: Record<string, number>;
};

type BppIndexRow = {
  materialKey: string;
  grammage: string;
  price: number;
  source: 'materialCost' | 'basePrice';
};

function normKey(value: string): string {
  return normalizeMaterialName(value);
}

function normGrammage(value: string | null | undefined): string {
  if (!value?.trim()) return '';
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

/** Libellés BasePrintingPrice pour une clé matière catalogue. */
export function resolvePrintingPriceLabels(baseKey: string, label: string): string[] {
  const aliases: Record<string, string[]> = {
    offset: ['Standard / Offset · Couleur', 'Standard / Offset · N&B'],
    journal: ['Papier journal · Couleur', 'Papier journal · N&B'],
    pcb: ['PCB'],
    pcm: ['PCM'],
    glossy: ['Glossy'],
    'pcb-pellicule': ['PCB'],
    bristol: ['Bristol'],
    texture: ['Texturé'],
    'texture-motif': ['Texturé'],
    'toile-fin': ['Toile fin'],
    'invitation-luxe': ['Spécial invitation'],
    invitation: ['Spécial invitation'],
    contre_colle: ['Papier contre-collé'],
    autocollant: ['Papier autocollant'],
    collant_glossy: ['Papier collant glossy'],
    adestor: ['Papier adhestor', 'Autocollant Adestor'],
    'satine-mat': ['Papier satiné mat'],
    mat: ['Papier mat'],
    'pvc-transl': ['PVC translucide'],
    'pvc-opaque': ['PVC opaque'],
    sublimation: ['Papier sublimation'],
    'pvc-transl-carte': ['PVC translucide'],
    'pvc-opaque-carte': ['PVC opaque'],
  };

  const isf = IMPRESSION_SF_MATERIALS.find((m) => m.id === baseKey);
  const compat = [...OFFICIAL_MATERIAL_COMPAT, ...SUPPLEMENTARY_MATERIAL_COMPAT].find((m) => m.key === baseKey);

  const candidates = new Set<string>();
  for (const v of aliases[baseKey] ?? []) candidates.add(v);
  if (isf?.label) candidates.add(isf.label);
  if (compat?.label) candidates.add(compat.label);
  if (label.trim()) candidates.add(label.trim());

  return [...candidates];
}

function buildBppIndex(
  rows: Array<{
    materialKey: string;
    grammage: string;
    basePrice: number;
    materialCost: number | null;
  }>,
): Map<string, BppIndexRow[]> {
  const map = new Map<string, BppIndexRow[]>();
  for (const row of rows) {
    const key = normKey(row.materialKey);
    if (!key) continue;
    const grammage = normGrammage(row.grammage);
    const price = row.materialCost != null && row.materialCost > 0 ? row.materialCost : row.basePrice;
    if (price <= 0) continue;
    const source = row.materialCost != null && row.materialCost > 0 ? 'materialCost' : 'basePrice';
    const bucket = map.get(key) ?? [];
    bucket.push({ materialKey: row.materialKey, grammage, price, source });
    map.set(key, bucket);
  }
  return map;
}

function pickBppPrice(
  index: Map<string, BppIndexRow[]>,
  labels: string[],
  grammage: string | null,
): BppIndexRow | null {
  const g = normGrammage(grammage);
  for (const label of labels) {
    const bucket = index.get(normKey(label));
    if (!bucket?.length) continue;
    if (g) {
      const exact = bucket.find((b) => b.grammage === g);
      if (exact) return exact;
      const partial = bucket.find((b) => g.startsWith(b.grammage) || b.grammage.startsWith(g));
      if (partial) return partial;
    }
    const sorted = [...bucket].sort((a, b) => a.price - b.price);
    return sorted[0] ?? null;
  }
  return null;
}

export async function backfillMissingBaseMaterialPrices(options?: {
  dryRun?: boolean;
}): Promise<MaterialPriceBackfillResult> {
  const dryRun = options?.dryRun ?? false;
  const sources: Record<string, number> = {
    basePrintingPrice: 0,
    materialPrice: 0,
    stockItem: 0,
  };

  const [materials, bppRows, materialPrices, stockItems] = await Promise.all([
    prisma.baseMaterial.findMany({
      where: {
        active: true,
        archived: false,
        impactsPrice: true,
        OR: [{ basePrintPrice: null }, { basePrintPrice: { lte: 0 } }],
      },
    }),
    prisma.basePrintingPrice.findMany({
      where: { active: true, OR: [{ basePrice: { gt: 0 } }, { materialCost: { gt: 0 } }] },
      select: { materialKey: true, grammage: true, basePrice: true, materialCost: true },
    }),
    prisma.materialPrice.findMany({
      where: {
        active: true,
        OR: [{ prixM2: { gt: 0 } }, { prixCm2: { gt: 0 } }],
      },
      select: { materialKey: true, grammage: true, prixM2: true, prixCm2: true },
    }),
    prisma.stockItem.findMany({
      where: { actif: true, archived: false },
      select: {
        id: true,
        materialKey: true,
        label: true,
        unitCost: true,
        salePrice: true,
      },
    }),
  ]);

  const bppIndex = buildBppIndex(bppRows);
  const mpByKey = new Map<string, number>();
  for (const mp of materialPrices) {
    if (!mp.materialKey) continue;
    const price = mp.prixM2 ?? mp.prixCm2 ?? 0;
    if (price <= 0) continue;
    mpByKey.set(normKey(mp.materialKey), price);
  }

  const stockById = new Map(stockItems.map((s) => [s.id, s]));
  const stockByKey = new Map<string, typeof stockItems[0]>();
  for (const s of stockItems) {
    if (s.materialKey) stockByKey.set(normKey(s.materialKey), s);
    stockByKey.set(normKey(s.label), s);
  }

  function pickStockPrice(material: (typeof materials)[0]): number | null {
    const linked = material.stockItemId ? stockById.get(material.stockItemId) : null;
    const candidates = [
      linked,
      stockByKey.get(normKey(material.materialKey)),
      stockByKey.get(normKey(parseMaterialKey(material.materialKey).baseKey)),
      stockByKey.get(normKey(material.label)),
    ].filter(Boolean) as typeof stockItems;

    for (const s of candidates) {
      if (s.salePrice != null && s.salePrice > 0) return s.salePrice;
      if (s.unitCost != null && s.unitCost > 0) return s.unitCost;
    }
    return null;
  }

  let updated = 0;
  let skipped = 0;

  for (const material of materials) {
    const { baseKey } = parseMaterialKey(material.materialKey);
    const labels = resolvePrintingPriceLabels(baseKey, material.label);
    let price: number | null = null;
    let source: string | null = null;

    const bpp = pickBppPrice(bppIndex, labels, material.grammage);
    if (bpp) {
      price = bpp.price;
      source = 'basePrintingPrice';
    }

    if (price == null) {
      for (const candidate of [baseKey, material.materialKey, material.label]) {
        const hit = mpByKey.get(normKey(candidate));
        if (hit != null && hit > 0) {
          price = hit;
          source = 'materialPrice';
          break;
        }
      }
    }

    if (price == null) {
      const stockPrice = pickStockPrice(material);
      if (stockPrice != null && stockPrice > 0) {
        price = stockPrice;
        source = 'stockItem';
      }
    }

    if (price == null || price <= 0) {
      skipped++;
      continue;
    }

    if (!dryRun) {
      await prisma.baseMaterial.update({
        where: { id: material.id },
        data: {
          basePrintPrice: price,
          anomalyNotes: material.anomalyNotes?.includes('backfill')
            ? material.anomalyNotes
            : [material.anomalyNotes, `Prix base auto (${source})`].filter(Boolean).join(' · '),
        },
      });
    }
    if (source) sources[source] = (sources[source] ?? 0) + 1;
    updated++;
  }

  const remaining = await prisma.baseMaterial.count({
    where: {
      active: true,
      archived: false,
      impactsPrice: true,
      OR: [{ basePrintPrice: null }, { basePrintPrice: { lte: 0 } }],
    },
  });

  return { updated, skipped, remaining, sources };
}
