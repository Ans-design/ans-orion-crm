/**
 * Publie profils tarifaires brouillon + formules associées (préparation POS local).
 * Usage: npm run publish:local-pricing
 */
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();

const prisma = new PrismaClient();

async function main() {
  const drafts = await prisma.articlePricingProfile.findMany({
    where: {
      status: 'draft',
      active: true,
      OR: [
        { prixBase: { gt: 0 } },
        { prixM2: { gt: 0 } },
        { prixCm2: { gt: 0 } },
        { calculationType: 'formula' },
      ],
    },
    select: { articleId: true, articleLabel: true, calculationType: true },
  });

  let profilesPublished = 0;
  if (drafts.length > 0) {
    const result = await prisma.articlePricingProfile.updateMany({
      where: {
        articleId: { in: drafts.map((d) => d.articleId) },
        status: 'draft',
      },
      data: { status: 'published' },
    });
    profilesPublished = result.count;
  }

  const publishedIds = (
    await prisma.articlePricingProfile.findMany({
      where: { status: 'published', active: true },
      select: { articleId: true },
    })
  ).map((p) => p.articleId);

  const formulaResult = await prisma.formulaVersion.updateMany({
    where: {
      articleId: { in: publishedIds },
      status: 'draft',
    },
    data: { status: 'published' },
  });

  const published = await prisma.articlePricingProfile.count({
    where: { status: 'published', active: true },
  });
  const formulasPublished = await prisma.formulaVersion.count({
    where: { articleId: { in: publishedIds }, status: 'published' },
  });

  console.log(`\n✅ Profils publiés : +${profilesPublished} (total actifs : ${published})`);
  console.log(`✅ Formules publiées : +${formulaResult.count} (total publiées : ${formulasPublished})\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
