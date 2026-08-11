import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const all = await p.articlePricingProfile.findMany({
  select: { articleId: true, articleLabel: true, family: true },
});

const interesting = all.filter((a) =>
  /^(fin-|rel-|gf-|tx-|goo-|pkg-|imp-|cv-|ph-|plv-|evt-|bk-|bn-|flyer|ds-)/i.test(a.articleId)
  || /pellicul|reliure|plastif|bâche|bache|vinyle|t-shirt|mug|flyer|impression/i.test(a.articleLabel || ''),
);

for (const h of interesting.sort((a, b) => a.articleId.localeCompare(b.articleId))) {
  console.log(`${h.articleId} | ${h.articleLabel} | ${h.family}`);
}
console.log('total interesting', interesting.length, 'all', all.length);
await p.$disconnect();
