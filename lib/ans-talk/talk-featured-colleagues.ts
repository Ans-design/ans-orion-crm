import type { TalkConversation, TalkMessage } from '@/lib/ans-talk/talk-types';

/** Au-delà, les membres Talk sont considérés « diffusion » (tous les rôles), pas participants actifs. */
export const TALK_BROADCAST_MEMBER_THRESHOLD = 6;

/** Nombre max de collègues mis en avant dans le roster. */
export const TALK_FEATURED_COLLEAGUES_MAX = 8;

/**
 * Participants réellement liés au dossier / conversation :
 * - expéditeurs de messages (actifs)
 * - assignés tâches (si fournis)
 * - membres Talk seulement si le groupe est petit (pas une diffusion large)
 */
export function resolveTalkFeaturedUserIds(opts: {
  conversation: TalkConversation;
  messages?: TalkMessage[];
  taskAssigneeIds?: string[];
  currentUserId?: string | null;
}): string[] {
  const { conversation, messages = [], taskAssigneeIds = [], currentUserId } = opts;
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (id: string | null | undefined) => {
    if (!id || id === currentUserId || seen.has(id)) return;
    seen.add(id);
    ordered.push(id);
  };

  for (const id of taskAssigneeIds) push(id);

  for (const m of messages) {
    push(m.senderId);
  }

  const members = conversation.members ?? [];
  const isBroadcast = members.length > TALK_BROADCAST_MEMBER_THRESHOLD;
  if (!isBroadcast) {
    for (const mb of members) push(mb.userId);
  } else if (ordered.length === 0 && conversation.lastMessage?.senderName) {
    // Fallback : retrouver l’auteur du dernier message parmi les membres
    const match = members.find((mb) => mb.name === conversation.lastMessage?.senderName);
    push(match?.userId);
  }

  return ordered.slice(0, TALK_FEATURED_COLLEAGUES_MAX);
}
