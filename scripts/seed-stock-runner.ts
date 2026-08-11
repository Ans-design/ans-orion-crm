import { PrismaClient } from '@prisma/client';
import { seedStock } from './seed-stock';

const prisma = new PrismaClient();

seedStock(prisma)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
