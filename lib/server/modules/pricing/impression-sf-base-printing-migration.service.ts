import { IMPRESSION_SF_FORMATS } from '@/lib/data/impression-sf-material-catalog';
import { IMPRESSION_SF_PAPER_TARIFFS } from '@/lib/data/impression-sf-paper-tariffs';
import { prisma } from '@/lib/prisma';
import { IMPRESSION_SF_CANONICAL_ID } from '@/lib/pos/impression-sf-catalog';
import {
  computeImpressionSfPrice,
  resolveImpressionSfPaperPriceKey,
  storageMaterialKeyForIsfConfig,
} from '@/lib/pricing/impression-sf-pricing';
import { hasBasePrintingPriceDelegate } from './prisma-delegate-check';
import { isPrismaMissingTableError } from './prisma-safe';

/** Pilotes migration grilles statiques ISF → BasePrintingPrice (DB source de vérité). */
export type ImpressionSfMigrationPilot = keyof typeof IMPRESSION_SF_PAPER_TARIFFS;

type MaterialPilotConfig = { matiere: string; grammage: string; type: string };

/** Configs représentatives par grille — plusieurs matières pour PCB/PCM/Glossy. */
export const IMPRESSION_SF_MIGRATION_CONFIGS: Partial<
  Record<ImpressionSfMigrationPilot, MaterialPilotConfig[]>
> = {
  nb80: [{ matiere: 'Standard / Offset', grammage: '80g', type: 'Impression numérique N&B' }],
  q80la: [{ matiere: 'Standard / Offset', grammage: '80g', type: 'Impression numérique couleur' }],
  pcb90: [
    { matiere: 'PCB', grammage: '90g', type: 'Impression numérique couleur' },
    { matiere: 'PCM', grammage: '90g', type: 'Impression numérique couleur' },
    { matiere: 'Glossy', grammage: '120g', type: 'Impression numérique couleur' },
  ],
  pcb135: [
    { matiere: 'PCB', grammage: '135g', type: 'Impression numérique couleur' },
    { matiere: 'PCM', grammage: '135g', type: 'Impression numérique couleur' },
    { matiere: 'Glossy', grammage: '160g', type: 'Impression numérique couleur' },
  ],
  pcb170: [
    { matiere: 'PCB', grammage: '170g', type: 'Impression numérique couleur' },
    { matiere: 'PCM', grammage: '170g', type: 'Impression numérique couleur' },
    { matiere: 'Glossy', grammage: '250g', type: 'Impression numérique couleur' },
    { matiere: 'Texturé', grammage: '250g', type: 'Impression numérique couleur' },
  ],
  pcb350: [
    { matiere: 'PCB', grammage: '350g', type: 'Impression numérique couleur' },
    { matiere: 'PCM', grammage: '350g', type: 'Impression numérique couleur' },
  ],
  pcb600: [{ matiere: 'PCB', grammage: '600g', type: 'Impression numérique couleur' }],
  pcb700: [{ matiere: 'PCB', grammage: '700g', type: 'Impression numérique couleur' }],
  pcb900: [{ matiere: 'PCB', grammage: '900g', type: 'Impression numérique couleur' }],
  toile: [{ matiere: 'Toile fin', grammage: '270g', type: 'Impression numérique couleur' }],
  invitation: [{ matiere: 'Spécial invitation', grammage: '300g', type: 'Impression numérique couleur' }],
  autocollant: [
    { matiere: 'Papier autocollant', grammage: '', type: 'Impression numérique couleur' },
    { matiere: 'Papier collant glossy', grammage: '', type: 'Impression numérique couleur' },
    { matiere: 'Papier adhestor', grammage: '', type: 'Impression numérique couleur' },
  ],
  pvc_transl: [{ matiere: 'PVC translucide', grammage: '', type: 'Impression numérique couleur' }],
  pvc_opaque: [{ matiere: 'PVC opaque', grammage: '', type: 'Impression numérique couleur' }],
  sublimation: [{ matiere: 'Papier sublimation', grammage: '', type: 'Impression numérique couleur' }],
  pellicule320: [
    { matiere: 'Papier pelliculé', grammage: '320g', type: 'Impression numérique couleur' },
  ],
  pellicule370: [
    { matiere: 'Papier pelliculé', grammage: '370g', type: 'Impression numérique couleur' },
  ],
};

export const IMPRESSION_SF_MIGRATION_GROUPS = [
  {
    id: 'offset80',
    label: 'Offset 80g (N&B + Couleur)',
    pilots: ['nb80', 'q80la'] as ImpressionSfMigrationPilot[],
  },
  {
    id: 'pcb_pcm',
    label: 'PCB / PCM / Glossy',
    pilots: ['pcb90', 'pcb135', 'pcb170', 'pcb350', 'pcb600', 'pcb700', 'pcb900'] as ImpressionSfMigrationPilot[],
  },
  {
    id: 'special',
    label: 'Matières spéciales',
    pilots: ['toile', 'invitation', 'autocollant', 'pvc_transl', 'pvc_opaque', 'sublimation', 'pellicule320', 'pellicule370'] as ImpressionSfMigrationPilot[],
  },
] as const;

export type ImpressionSfMigrationGroupId = (typeof IMPRESSION_SF_MIGRATION_GROUPS)[number]['id'] | 'all';

export function listImpressionSfMigrationPilots(): {
  id: ImpressionSfMigrationPilot;
  label: string;
  configurable: boolean;
}[] {
  return (Object.keys(IMPRESSION_SF_PAPER_TARIFFS) as ImpressionSfMigrationPilot[]).map((id) => ({
    id,
    label: IMPRESSION_SF_PAPER_TARIFFS[id].label,
    configurable: Boolean(IMPRESSION_SF_MIGRATION_CONFIGS[id]?.length),
  }));
}

export function resolveMigrationPilots(input: {
  pilot?: ImpressionSfMigrationPilot;
  pilots?: ImpressionSfMigrationPilot[];
  group?: ImpressionSfMigrationGroupId;
}): ImpressionSfMigrationPilot[] {
  if (input.group === 'all') {
    return Object.keys(IMPRESSION_SF_PAPER_TARIFFS) as ImpressionSfMigrationPilot[];
  }
  if (input.group) {
    const g = IMPRESSION_SF_MIGRATION_GROUPS.find((x) => x.id === input.group);
    return g ? [...g.pilots] : [];
  }
  if (input.pilots?.length) return input.pilots;
  if (input.pilot) return [input.pilot];
  return ['nb80'];
}

export type ImpressionSfMigrationRow = {
  articleId: string;
  materialKey: string;
  grammage: string;
  formatLabel: string;
  face: 'recto' | 'recto_verso';
  saleUnit: string;
  referenceQty: number;
  basePrice: number;
  maxSafetyPrice: number;
  printCost: number;
  priceKey: ImpressionSfMigrationPilot;
};

/** Génère les lignes DB à partir de la grille legacy (parité computeImpressionSfPrice). */
export function buildImpressionSfMigrationRows(
  pilot: ImpressionSfMigrationPilot,
  referenceQty = 100,
): ImpressionSfMigrationRow[] {
  const configs = IMPRESSION_SF_MIGRATION_CONFIGS[pilot];
  if (!configs?.length || !IMPRESSION_SF_PAPER_TARIFFS[pilot]) return [];

  const formats = IMPRESSION_SF_FORMATS.filter((f) => f !== 'Format personnalisé');
  const rows: ImpressionSfMigrationRow[] = [];

  for (const materialCfg of configs) {
    const priceKey = resolveImpressionSfPaperPriceKey(
      materialCfg.matiere,
      materialCfg.grammage,
      materialCfg.type,
    );
    if (priceKey !== pilot) continue;

    const storageKey = storageMaterialKeyForIsfConfig(materialCfg);

    for (const format of formats) {
      for (const faceLabel of ['Recto', 'Recto-verso'] as const) {
        const config = { ...materialCfg, format, face: faceLabel };
        const res = computeImpressionSfPrice(config, referenceQty);
        if (!res.calculable || res.prixUnitaire <= 0) continue;

        rows.push({
          articleId: IMPRESSION_SF_CANONICAL_ID,
          materialKey: storageKey,
          grammage: materialCfg.grammage,
          formatLabel: format,
          face: faceLabel.toLowerCase().includes('verso') ? 'recto_verso' : 'recto',
          saleUnit: 'page',
          referenceQty,
          basePrice: res.prixUnitaire,
          maxSafetyPrice: Math.round(res.prixUnitaire * 1.15),
          printCost: res.prixUnitaire,
          priceKey: pilot,
        });
      }
    }
  }

  return rows;
}

async function upsertMigrationRow(
  row: ImpressionSfMigrationRow,
  publicationStatus: 'draft' | 'published',
) {
  const existing = await prisma.basePrintingPrice.findFirst({
    where: {
      articleId: row.articleId,
      materialKey: row.materialKey,
      grammage: row.grammage,
      formatLabel: row.formatLabel,
      face: row.face,
    },
  });

  const data = {
    basePrice: row.basePrice,
    maxSafetyPrice: row.maxSafetyPrice,
    printCost: row.printCost,
    saleUnit: row.saleUnit,
    referenceQty: row.referenceQty,
    publicationStatus,
    active: true,
    materialCost: null as number | null,
  };

  if (existing) {
    await prisma.basePrintingPrice.update({ where: { id: existing.id }, data });
    return { id: existing.id, created: false };
  }

  const created = await prisma.basePrintingPrice.create({
    data: {
      articleId: row.articleId,
      materialKey: row.materialKey,
      grammage: row.grammage,
      formatLabel: row.formatLabel,
      face: row.face,
      ...data,
    },
  });
  return { id: created.id, created: true };
}

export async function migrateImpressionSfPilotToDb(options: {
  pilot: ImpressionSfMigrationPilot;
  publish?: boolean;
  referenceQty?: number;
}): Promise<{
  pilot: ImpressionSfMigrationPilot;
  rows: number;
  created: number;
  updated: number;
  publicationStatus: 'draft' | 'published';
}> {
  const batch = await migrateImpressionSfBatchToDb({
    pilots: [options.pilot],
    publish: options.publish,
    referenceQty: options.referenceQty,
  });
  const one = batch.results[0];
  if (!one) {
    throw new Error(`Pilote ${options.pilot} — aucune ligne générée`);
  }
  return one;
}

export async function migrateImpressionSfBatchToDb(options: {
  pilots: ImpressionSfMigrationPilot[];
  publish?: boolean;
  referenceQty?: number;
}): Promise<{
  publicationStatus: 'draft' | 'published';
  totalRows: number;
  created: number;
  updated: number;
  results: {
    pilot: ImpressionSfMigrationPilot;
    rows: number;
    created: number;
    updated: number;
    publicationStatus: 'draft' | 'published';
  }[];
  skipped: ImpressionSfMigrationPilot[];
}> {
  if (!hasBasePrintingPriceDelegate(prisma)) {
    throw new Error('Table BasePrintingPrice indisponible — exécutez npx prisma db push && npx prisma generate');
  }

  const publicationStatus = options.publish !== false ? 'published' : 'draft';
  const results: {
    pilot: ImpressionSfMigrationPilot;
    rows: number;
    created: number;
    updated: number;
    publicationStatus: 'draft' | 'published';
  }[] = [];
  const skipped: ImpressionSfMigrationPilot[] = [];
  let totalRows = 0;
  let created = 0;
  let updated = 0;

  try {
    for (const pilot of options.pilots) {
      const planned = buildImpressionSfMigrationRows(pilot, options.referenceQty ?? 100);
      if (!planned.length) {
        skipped.push(pilot);
        continue;
      }

      let pCreated = 0;
      let pUpdated = 0;
      for (const row of planned) {
        const result = await upsertMigrationRow(row, publicationStatus);
        if (result.created) pCreated += 1;
        else pUpdated += 1;
      }

      totalRows += planned.length;
      created += pCreated;
      updated += pUpdated;
      results.push({
        pilot,
        rows: planned.length,
        created: pCreated,
        updated: pUpdated,
        publicationStatus,
      });
    }
  } catch (err) {
    if (isPrismaMissingTableError(err)) {
      throw new Error('Table BasePrintingPrice indisponible');
    }
    throw err;
  }

  if (!results.length) {
    throw new Error('Aucune grille migrée — vérifiez les pilotes sélectionnés');
  }

  return { publicationStatus, totalRows, created, updated, results, skipped };
}
