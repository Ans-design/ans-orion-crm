import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const count = await p.articlePricingProfile.count();
  const tierCount = await p.discountTier.count();
  const withTiers = await p.articlePricingProfile.count({
    where: { discountTiers: { some: {} } },
  });
  console.log({ count, tierCount, withTiers });

  const samples = await p.articlePricingProfile.findMany({
    select: { articleId: true, articleLabel: true, family: true },
    take: 80,
    orderBy: { articleId: 'asc' },
  });
  for (const x of samples) {
    console.log(`${x.articleId} | ${x.articleLabel} | ${x.family}`);
  }

  const withT = await p.articlePricingProfile.findMany({
    where: { discountTiers: { some: {} } },
    select: {
      articleId: true,
      articleLabel: true,
      discountTiers: {
        select: { minQty: true, maxQty: true, discountPercent: true, unitPrice: true },
        orderBy: { minQty: 'asc' },
      },
    },
  });
  console.log('--- with tiers ---');
  for (const h of withT) {
    console.log(
      h.articleId,
      '|',
      h.articleLabel,
      '|',
      h.discountTiers
        .map((t) => `${t.minQty}-${t.maxQty ?? '∞'}:pct${t.discountPercent}/pu${t.unitPrice ?? '-'}`)
        .join(', '),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => p.$disconnect());
