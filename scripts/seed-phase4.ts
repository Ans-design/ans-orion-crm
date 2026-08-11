import { PrismaClient } from '@prisma/client';
import { backfillCommandeLignes } from './backfill-commande-lignes';
import { seedDemoNotifications } from '../lib/services/notification-service';

export async function seedPhase4(prisma: PrismaClient) {
  await backfillCommandeLignes(prisma);
  await seedDemoNotifications(prisma);
}
