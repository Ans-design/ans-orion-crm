/**
 * Assigne les tâches orphelines (assigneeRole sans assigneeId).
 * Usage: npm run backfill:task-assignees
 */
async function main() {
  process.env.APP_ENV = process.env.APP_ENV ?? 'local';
  process.env.LOCAL_DEV = process.env.LOCAL_DEV ?? 'true';
  if (!process.env.DATABASE_URL?.trim().startsWith('file:')) {
    process.env.DATABASE_URL = (process.env.DATABASE_URL_SQLITE || 'file:./prisma/dev.db').trim();
  }
  await import('@/lib/init-server-env');

  const { prisma } = await import('@/lib/prisma');
  const { resolveAssigneeFromRole } = await import('@/lib/metier/resolve-assignee-from-role');
  const { notifyTaskAssignment } = await import('@/lib/metier/task-assignment');

  const orphans = await prisma.metierTask.findMany({
    where: {
      assigneeId: null,
      assigneeRole: { not: null },
      status: { notIn: ['Terminée', 'Annulée'] },
    },
    select: { id: true, title: true, assigneeRole: true, commandeId: true },
  });

  let updated = 0;
  let skipped = 0;

  for (const task of orphans) {
    const assignee = await resolveAssigneeFromRole(task.assigneeRole);
    if (!assignee) {
      skipped++;
      continue;
    }
    await prisma.metierTask.update({
      where: { id: task.id },
      data: {
        assigneeId: assignee.assigneeId,
        assigneeName: assignee.assigneeName,
      },
    });
    await notifyTaskAssignment(
      { id: task.id, title: task.title, commandeId: task.commandeId },
      assignee.assigneeName,
      'backfill:task-assignees',
    ).catch(() => {});
    updated++;
  }

  console.log(`✅ backfill:task-assignees — ${updated} assignées, ${skipped} sans user pour le rôle (${orphans.length} orphelines)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
