import type { PrismaClient } from '@prisma/client';
import { backfillBriefs } from '@/lib/services/studio-service';

export async function seedStudio(prisma: PrismaClient) {
  const existing = await prisma.studioBrief.count();
  if (existing > 0) {
    console.log(`${existing} briefs studio déjà présents — skip`);
    return;
  }

  const result = await backfillBriefs(12);
  console.log(`Studio: ${result.briefsCreated} briefs créés sur ${result.commandes} commandes`);

  const brief = await prisma.studioBrief.findFirst({
    include: { versions: true },
  });
  if (brief) {
    await prisma.studioBrief.update({
      where: { id: brief.id },
      data: { statut: 'BAT envoyé', assignedToName: 'Studio ANS' },
    });
    const v1 = brief.versions.find((v) => v.version === 'V1');
    if (v1) {
      await prisma.studioCreativeVersion.update({
        where: { id: v1.id },
        data: { statut: 'Envoyé', sentAt: new Date() },
      });
    }
    const checks = await prisma.studioPrepressCheck.findMany({
      where: { briefId: brief.id },
      take: 4,
    });
    for (const c of checks) {
      await prisma.studioPrepressCheck.update({
        where: { id: c.id },
        data: { checked: true, checkedBy: 'Studio ANS', checkedAt: new Date() },
      });
    }
  }
}
