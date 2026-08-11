/**
 * V14 — sync memberships hors GET (jobs / events rôle / commande).
 * Appeler depuis cron ou hooks métier — jamais depuis listConversationsForUser.
 */

import { prisma } from '@/lib/prisma';
import {
  addUserToServiceGroups,
  syncUserToOrderConversations,
  ensureServiceConversations,
} from '@/lib/messaging/messaging-service';

export async function syncTalkMembershipsForUser(userId: string, role: string) {
  await ensureServiceConversations();
  await addUserToServiceGroups(userId, role);
  await syncUserToOrderConversations(userId, role);
}

export async function syncTalkMembershipsAllActiveUsers(limit = 200) {
  const users = await prisma.user.findMany({
    select: { id: true, role: true },
    take: limit,
    orderBy: { updatedAt: 'desc' },
  });
  for (const u of users) {
    if (!u.role) continue;
    try {
      await syncTalkMembershipsForUser(u.id, u.role);
    } catch (e) {
      console.warn('[talk-sync] user', u.id, e);
    }
  }
  return { processed: users.length };
}
