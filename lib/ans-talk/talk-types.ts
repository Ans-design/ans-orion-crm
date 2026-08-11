/** Types ANS Talk — module partagé sans dépendance React (évite cycles SSR). */

export type TalkConversation = {
  id: string;
  name: string;
  type: string;
  serviceKey?: string | null;
  commandeId?: string | null;
  devisId?: string | null;
  productionDossierId?: string | null;
  description?: string | null;
  label?: string | null;
  pinned: boolean;
  noResponse: boolean;
  unreadCount: number;
  lastMessage?: { id: string; body: string; senderName: string; createdAt: string } | null;
  members: { userId: string; name: string; role: string }[];
  updatedAt: string;
};

export type TalkMessage = {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName: string;
  senderRole: string | null;
  body: string;
  createdAt: string;
  editedAt: string | null;
  pinned: boolean;
  replyToId: string | null;
  replyTo?: { id: string; body: string; senderName: string } | null;
  reads: string[];
  ackedBy: string[];
  isMine: boolean;
  reactions: Record<string, number>;
  attachments: {
    id: string;
    fileName: string;
    originalFileName: string;
    extension: string;
    mimeType: string;
    sizeBytes: number;
    checksumSha256: string;
    version: string;
    status: string;
    uploadedByName: string | null;
    createdAt: string;
  }[];
  tasks: { id: string; title: string; status: string; taskId: string | null }[];
};

export type TalkUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image: string | null;
};
