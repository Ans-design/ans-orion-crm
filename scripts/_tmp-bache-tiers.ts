import { PrismaClient } from '@prisma/client';
import { join } from 'path';

process.env.DATABASE_URL = `file:${join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/')}`;
const p = new PrismaClient();

async function main() {
  for (const vk of ['180__a4', '180__a0', '240-320__a0']) {
    const t = await p.discountTier.findMany({
      where: { articleId: 'gf-bache', variantKey: vk },
      orderBy: { minQty: 'asc' },
    });
    console.log(vk, t.map((x) => x.unitPrice).join(', '));
  }
}

main().finally(() => p.$disconnect());
