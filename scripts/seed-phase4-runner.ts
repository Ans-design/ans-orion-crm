import { PrismaClient } from '@prisma/client';
import { seedPhase4 } from './seed-phase4';

const prisma = new PrismaClient();

seedPhase4(prisma)
  .catch(console.error)
  .finally(() => prisma.$disconnect());
