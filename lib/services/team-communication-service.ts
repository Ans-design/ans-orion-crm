import { prisma } from '@/lib/prisma';
import { SUGGESTION_STATUSES, type SuggestionStatus } from '@/lib/constants/team-communication';

export { SUGGESTION_STATUSES, type SuggestionStatus };

export async function listTeamMessages(limit = 50) {
  return prisma.teamMessage.findMany({
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    include: {
      replies: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function createTeamMessage(data: {
  authorId?: string | null;
  authorName: string;
  authorRole?: string | null;
  content: string;
  pinned?: boolean;
}) {
  return prisma.teamMessage.create({
    data: {
      authorId: data.authorId ?? null,
      authorName: data.authorName.trim(),
      authorRole: data.authorRole ?? null,
      content: data.content.trim(),
      pinned: data.pinned ?? false,
    },
    include: { replies: true },
  });
}

export async function replyToTeamMessage(
  messageId: string,
  data: { authorId?: string | null; authorName: string; content: string },
) {
  return prisma.teamMessageReply.create({
    data: {
      messageId,
      authorId: data.authorId ?? null,
      authorName: data.authorName.trim(),
      content: data.content.trim(),
    },
  });
}

export async function toggleMessagePin(messageId: string, pinned: boolean) {
  return prisma.teamMessage.update({
    where: { id: messageId },
    data: { pinned },
  });
}

export async function listTeamSuggestions(limit = 50) {
  return prisma.teamSuggestion.findMany({
    orderBy: [{ votes: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}

export async function createTeamSuggestion(data: {
  authorId?: string | null;
  authorName: string;
  title: string;
  content: string;
}) {
  return prisma.teamSuggestion.create({
    data: {
      authorId: data.authorId ?? null,
      authorName: data.authorName.trim(),
      title: data.title.trim(),
      content: data.content.trim(),
    },
  });
}

export async function updateTeamSuggestion(
  id: string,
  data: { status?: SuggestionStatus; votes?: number },
) {
  const patch: { status?: string; votes?: number } = {};
  if (data.status !== undefined) patch.status = data.status;
  if (data.votes !== undefined) patch.votes = data.votes;
  return prisma.teamSuggestion.update({ where: { id }, data: patch });
}

export async function voteTeamSuggestion(id: string) {
  return prisma.teamSuggestion.update({
    where: { id },
    data: { votes: { increment: 1 } },
  });
}

export async function getTeamCommunicationStats() {
  const [messages, suggestions, pendingSuggestions] = await Promise.all([
    prisma.teamMessage.count(),
    prisma.teamSuggestion.count(),
    prisma.teamSuggestion.count({ where: { status: 'En étude' } }),
  ]);
  return { messages, suggestions, pendingSuggestions };
}
