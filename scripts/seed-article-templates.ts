/**
 * Seed modèles d'articles en DB (idempotent).
 * Usage : npm run seed:article-templates
 */
import { ensureArticleTemplatesSeeded } from '../lib/services/article-template-service';
import { prisma } from '../lib/prisma';

async function main() {
  const n = await ensureArticleTemplatesSeeded();
  console.log(`✓ ${n} modèle(s) article en base`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
