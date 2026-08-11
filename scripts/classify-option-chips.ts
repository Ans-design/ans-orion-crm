/**
 * Inventaire + classification des options/chips (idempotent, lecture seule).
 * Usage: npm run classify:option-chips
 *        npm run classify:option-chips -- --limit=5000
 */
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

async function main() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';
  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
    process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
  }

  await import('@/lib/init-server-env');
  const { prisma } = await import('@/lib/prisma');
  const { resolveBlockKey } = await import(
    '../lib/server/modules/backoffice-v2/admin-backoffice-chips.service'
  );
  const {
    classifyOptionChips,
    BUCKET_LABELS,
  } = await import('../lib/server/modules/backoffice-v2/option-chip-classification');

  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = Math.min(20_000, Number(limitArg?.split('=')[1] ?? 10_000) || 10_000);

  const groups = await prisma.productOptionGroup.findMany({
    take: limit,
    orderBy: [{ articleId: 'asc' }, { sortOrder: 'asc' }],
    include: {
      values: { orderBy: { sortOrder: 'asc' } },
      profile: { select: { articleLabel: true, family: true } },
    },
  });

  type Row = {
    id: string;
    label: string;
    blockKey: string;
    blockLabel: string;
    fieldKey: string;
    fieldType?: string;
    impactsPrice: boolean;
    impactsStock: boolean;
    impactsProduction: boolean;
    isInformational: boolean;
    archived: boolean;
    priceModifier: number;
    articleId: string;
  };

  const rows: Row[] = [];
  for (const g of groups) {
    const blockLabel = g.sectionTitle || 'Général';
    const blockKey = resolveBlockKey(blockLabel);
    if (!g.values.length) {
      rows.push({
        id: g.id,
        label: g.label,
        blockKey,
        blockLabel,
        fieldKey: g.fieldKey,
        fieldType: g.fieldType ?? undefined,
        impactsPrice: g.impactsPrice && !g.isInformational,
        impactsStock: g.impactsStock,
        impactsProduction: g.impactsProduction,
        isInformational: g.isInformational,
        archived: !g.active,
        priceModifier: 0,
        articleId: g.articleId,
      });
      continue;
    }
    for (const v of g.values) {
      rows.push({
        id: v.id,
        label: v.label,
        blockKey,
        blockLabel,
        fieldKey: g.fieldKey,
        fieldType: g.fieldType ?? undefined,
        impactsPrice: g.impactsPrice && !g.isInformational,
        impactsStock: g.impactsStock,
        impactsProduction: g.impactsProduction,
        isInformational: g.isInformational,
        archived: !g.active || !v.active,
        priceModifier: Number(v.priceModifier ?? 0),
        articleId: g.articleId,
      });
    }
  }

  const result = classifyOptionChips(rows);
  const outDir = join(process.cwd(), 'data');
  mkdirSync(outDir, { recursive: true });
  const jsonPath = join(outDir, 'option-chips-classification.json');
  const mdPath = join(outDir, 'option-chips-classification.md');

  const byBucketSamples: Record<string, { id: string; label: string; blockKey: string }[]> = {};
  for (const it of result.items) {
    const list = (byBucketSamples[it.bucket] ??= []);
    if (list.length < 8) {
      list.push({ id: it.id, label: it.label, blockKey: it.blockKey });
    }
  }

  writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        groupsLoaded: groups.length,
        total: result.total,
        articleCount: result.articleIds.length,
        counts: result.counts,
        samples: byBucketSamples,
        // items allégés (pas tout le détail pour chaque ligne en console)
        items: result.items.map((i) => ({
          id: i.id,
          label: i.label,
          blockKey: i.blockKey,
          bucket: i.bucket,
          reason: i.reason,
          articleId: i.articleId,
        })),
      },
      null,
      2,
    ),
    'utf8',
  );

  const md = [
    '# Classification options / chips',
    '',
    `Généré : ${new Date().toISOString()}`,
    '',
    `| Métrique | Valeur |`,
    `|---|---|`,
    `| Groupes chargés | ${groups.length} |`,
    `| Entrées classées | ${result.total} |`,
    `| Articles distincts | ${result.articleIds.length} |`,
    '',
    '## Répartition',
    '',
    ...Object.entries(result.counts).map(
      ([k, n]) => `- **${BUCKET_LABELS[k as keyof typeof BUCKET_LABELS] ?? k}** : ${n}`,
    ),
    '',
    '## Échantillons',
    '',
    ...Object.entries(byBucketSamples).flatMap(([bucket, samples]) => [
      `### ${BUCKET_LABELS[bucket as keyof typeof BUCKET_LABELS] ?? bucket}`,
      ...samples.map((s) => `- \`${s.blockKey}\` — ${s.label}`),
      '',
    ]),
    '',
    '> Rapport lecture seule — aucune migration de données. Prochaine étape : fusion / rattachement canonique.',
    '',
  ].join('\n');

  writeFileSync(mdPath, md, 'utf8');

  console.log(`✅ classify:option-chips — ${result.total} entrées · ${result.articleIds.length} articles`);
  console.log('  counts:', result.counts);
  console.log(`  → ${jsonPath}`);
  console.log(`  → ${mdPath}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
