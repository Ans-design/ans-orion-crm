import path from 'path';
import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import {
  TALK_ALLOWED_EXTENSIONS,
  TALK_BLOCKED_EXTENSIONS,
  detectMimeType,
  maxTalkUploadBytes,
} from '@/lib/messaging/constants';
import { requireTalkMember, canChangeAttachmentStatus } from '@/lib/messaging/permissions';
import { ensureTalkMembership } from '@/lib/messaging/messaging-service';
import { readTalkFileBytes, sha256Buffer, storeTalkFileBytes } from '@/lib/messaging/file-store';
import { assertMagicBytes } from '@/lib/messaging/magic-bytes';

function parseExtension(fileName: string): string {
  const ext = path.extname(fileName).replace(/^\./, '').toLowerCase();
  return ext || 'bin';
}

export async function uploadTalkFiles(params: {
  conversationId: string;
  userId: string;
  userName: string;
  userRole: string;
  files: { buffer: Buffer; originalFileName: string }[];
  commandeId?: string;
  version?: string;
}) {
  await ensureTalkMembership(params.conversationId, params.userId, params.userRole);

  const conv = await prisma.talkConversation.findUnique({
    where: { id: params.conversationId },
    include: { commande: { select: { id: true, clientId: true } } },
  });
  if (!conv) throw new Error('NOT_FOUND');

  const commandeId = conv.commandeId || undefined;
  const maxBytes = maxTalkUploadBytes();
  const created = [];

  for (const file of params.files) {
    if (file.buffer.length > maxBytes) {
      throw new Error(`FILE_TOO_LARGE:${file.originalFileName}`);
    }
    const extension = parseExtension(file.originalFileName);
    if (TALK_BLOCKED_EXTENSIONS.has(extension)) {
      throw new Error(`BLOCKED_EXT:${extension}`);
    }
    if (!TALK_ALLOWED_EXTENSIONS.has(extension)) {
      throw new Error(`UNSUPPORTED_EXT:${extension}`);
    }

    const magic = assertMagicBytes(file.buffer, extension);
    if (!magic.ok) {
      throw new Error(`MAGIC_BYTES:${magic.reason}`);
    }

    // V14 P0-26 : garde BAT — PDF/image uniquement si conversation liée commande + version BAT
    const isBatish = extension === 'pdf' || ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
    if (params.version?.toUpperCase().startsWith('BAT') && !isBatish) {
      throw new Error('BAT_GUARD:format');
    }
    if (params.version?.toUpperCase().startsWith('BAT') && !commandeId && !params.commandeId) {
      throw new Error('BAT_GUARD:commande');
    }

    const mimeType = magic.detectedMime || detectMimeType(extension);
    const attachmentId = `talk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const { storageKey, checksumSha256 } = await storeTalkFileBytes(file.buffer, {
      attachmentId,
      originalFileName: file.originalFileName,
      clientId: conv.commande?.clientId,
      mimeType,
    });

    const verify = sha256Buffer(file.buffer);
    if (verify !== checksumSha256) throw new Error('CHECKSUM_MISMATCH');

    const att = await prisma.talkAttachment.create({
      data: {
        id: attachmentId,
        conversationId: params.conversationId,
        commandeId: commandeId || null,
        fileName: file.originalFileName,
        originalFileName: file.originalFileName,
        extension,
        mimeType,
        sizeBytes: file.buffer.length,
        storageKey,
        checksumSha256,
        version: params.version || 'V1',
        status: 'reçu',
        uploadedById: params.userId,
        uploadedByName: params.userName,
        versions: {
          create: {
            version: params.version || 'V1',
            storageKey,
            checksumSha256,
            uploadedById: params.userId,
          },
        },
      },
    });

    if (commandeId) {
      await syncAttachmentToFileAsset(att, commandeId, conv.commande?.clientId, params.userId);
    }

    await logAudit({
      userId: params.userId,
      userName: params.userName,
      action: 'TALK_UPLOAD',
      entity: 'TalkAttachment',
      entityId: att.id,
      entityLabel: att.originalFileName,
      details: {
        sizeBytes: att.sizeBytes,
        checksumSha256: att.checksumSha256,
        version: att.version,
        commandeId,
      },
    });

    created.push(att);
  }

  return created;
}

async function syncAttachmentToFileAsset(
  att: { id: string; originalFileName: string; mimeType: string; sizeBytes: number; storageKey: string | null; version: string; extension: string },
  commandeId: string,
  clientId?: string | null,
  uploadedBy?: string,
) {
  const category = att.mimeType.startsWith('image/') || att.extension === 'pdf' ? 'bat' : 'source';
  const asset = await prisma.fileAsset.create({
    data: {
      commandeId,
      clientId: clientId || null,
      name: att.originalFileName,
      mimeType: att.mimeType,
      sizeBytes: att.sizeBytes,
      category,
      versionLabel: att.version,
      storageKey: att.storageKey,
      uploadedBy: uploadedBy || null,
    },
  });
  await prisma.talkAttachment.update({
    where: { id: att.id },
    data: { fileAssetId: asset.id },
  });
  return asset;
}

export async function downloadTalkAttachment(
  attachmentId: string,
  userId: string,
  userName: string,
) {
  const att = await prisma.talkAttachment.findUnique({
    where: { id: attachmentId },
    include: { conversation: true },
  });
  if (!att || !att.storageKey) throw new Error('NOT_FOUND');
  await requireTalkMember(att.conversationId, userId);

  const buffer = await readTalkFileBytes(att.storageKey);
  const checksum = sha256Buffer(buffer);
  if (checksum !== att.checksumSha256) {
    throw new Error('INTEGRITY_FAIL');
  }

  await prisma.talkAttachmentDownload.create({
    data: { attachmentId, userId, userName },
  });

  await logAudit({
    userId,
    userName,
    action: 'TALK_DOWNLOAD',
    entity: 'TalkAttachment',
    entityId: att.id,
    entityLabel: att.originalFileName,
    details: { checksumSha256: att.checksumSha256 },
  });

  return { buffer, att };
}

export async function updateAttachmentStatus(
  attachmentId: string,
  status: string,
  userId: string,
  userName: string,
  role: string,
) {
  if (!canChangeAttachmentStatus(role, status)) throw new Error('FORBIDDEN');

  const att = await prisma.talkAttachment.findUnique({ where: { id: attachmentId } });
  if (!att) throw new Error('NOT_FOUND');
  await requireTalkMember(att.conversationId, userId);

  const updated = await prisma.talkAttachment.update({
    where: { id: attachmentId },
    data: { status, version: status === 'final' ? 'final' : att.version },
  });

  if (att.fileAssetId && (status === 'validé' || status === 'final')) {
    await prisma.fileAsset.update({
      where: { id: att.fileAssetId },
      data: { category: 'print_ready', versionLabel: status === 'final' ? 'final' : att.version },
    });
  }

  await logAudit({
    userId,
    userName,
    action: 'TALK_ATTACHMENT_STATUS',
    entity: 'TalkAttachment',
    entityId: att.id,
    entityLabel: att.originalFileName,
    details: { status },
  });

  return updated;
}

export async function listConversationAttachments(conversationId: string, userId: string, role: string) {
  await ensureTalkMembership(conversationId, userId, role);
  const rows = await prisma.talkAttachment.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { _count: { select: { downloads: true } } },
  });
  return rows.map(serializeGalleryAttachment);
}

export type GalleryAttachment = ReturnType<typeof serializeGalleryAttachment>;
export type GalleryLink = {
  id: string;
  url: string;
  senderName: string;
  messageId: string;
  createdAt: string;
};

export function categorizeTalkAttachment(mimeType: string, extension: string): 'photo' | 'document' | 'media' {
  if (mimeType.startsWith('image/')) return 'photo';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'media';
  const mediaExt = ['mp4', 'mov', 'avi', 'webm', 'mp3', 'wav', 'ogg', 'm4a'];
  if (mediaExt.includes(extension.toLowerCase())) return 'media';
  return 'document';
}

function serializeGalleryAttachment(a: {
  id: string;
  conversationId: string;
  messageId: string | null;
  fileName: string;
  originalFileName: string;
  extension: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  version: string;
  status: string;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { downloads: number };
}) {
  return {
    id: a.id,
    conversationId: a.conversationId,
    messageId: a.messageId,
    fileName: a.fileName,
    originalFileName: a.originalFileName,
    extension: a.extension,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    checksumSha256: a.checksumSha256,
    version: a.version,
    status: a.status,
    uploadedById: a.uploadedById,
    uploadedByName: a.uploadedByName,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    downloadCount: a._count?.downloads ?? 0,
    category: categorizeTalkAttachment(a.mimeType, a.extension),
  };
}

const URL_IN_MESSAGE_RE = /https?:\/\/[^\s<>"')\]]+/gi;

export async function getConversationGallery(conversationId: string, userId: string, role: string) {
  const attachments = await listConversationAttachments(conversationId, userId, role);

  const messages = await prisma.talkMessage.findMany({
    where: { conversationId, deletedAt: null },
    select: { id: true, body: true, senderName: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const links: GalleryLink[] = [];
  const seen = new Set<string>();
  for (const m of messages) {
    const matches = m.body.match(URL_IN_MESSAGE_RE);
    if (!matches) continue;
    for (const url of matches) {
      const key = `${m.id}:${url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({
        id: key,
        url,
        senderName: m.senderName,
        messageId: m.id,
        createdAt: m.createdAt.toISOString(),
      });
    }
  }

  return {
    attachments,
    links,
    stats: {
      photos: attachments.filter((a) => a.category === 'photo').length,
      documents: attachments.filter((a) => a.category === 'document').length,
      media: attachments.filter((a) => a.category === 'media').length,
      links: links.length,
      total: attachments.length,
    },
  };
}
