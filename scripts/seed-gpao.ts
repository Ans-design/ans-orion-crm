import type { PrismaClient } from '@prisma/client';

/** Seed GPAO fail-soft — pas d’appel singleton @/lib/prisma. */
export async function seedGpao(prisma: PrismaClient) {
  try {
    const existing = await prisma.productionDossier.count();
    if (existing > 0) {
      console.log(`${existing} dossiers GPAO déjà présents — skip`);
      return;
    }
    console.log('[seedGpao] dossiers créés au runtime métier — skip seed (évite cross-client E2E)');
  } catch (error) {
    console.warn('[seedGpao] ignoré:', (error as Error)?.message?.slice(0, 120));
  }
}
