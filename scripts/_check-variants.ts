import { PrismaClient } from '@prisma/client';
import { join } from 'path';

async function main() {
  const absDb = join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${absDb}`;
  const p = new PrismaClient();
  for (const id of ['gf-plexi', 'fin-reliure', 'cv-std', 'fly-std', 'gf-pp']) {
    const n = await p.discountTier.count({ where: { articleId: id } });
    const v = await p.discountTier.groupBy({
      by: ['variantKey'],
      where: { articleId: id },
      _count: true,
    });
    console.log(
      id,
      'tiers',
      n,
      'variants',
      v.length,
      v.slice(0, 6).map((x) => `${x.variantKey || '(def)'}:${x._count}`),
    );
  }
  await p.$disconnect();
}
main();
