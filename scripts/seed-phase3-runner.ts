import { PrismaClient } from '@prisma/client';
import { seedPhase3 } from './seed-phase3';

const prisma = new PrismaClient();

seedPhase3(prisma)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
