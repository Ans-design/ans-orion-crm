'use client';

import { Loader2, Pin } from 'lucide-react';
import type { RefObject } from 'react';
import type { TalkMessage } from '@/lib/hooks/use-ans-talk';
import { TalkMessageBubble } from './talk-message-bubble';

type Props = {
  messages: TalkMessage[];
  pinnedMessages: TalkMessage[];
  regularMessages: TalkMessage[];
  loading: boolean;
  hasOlder?: boolean;
  onLoadOlder?: () => void;
  dragOver: boolean;
  sessionUserId?: string;
  canModerate: boolean;
  editingId: string | null;
  editText: string;
  commandeId?: string | null;
  onEditTextChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onStartEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onReply: (msg: { id: string; body: string; senderName: string }) => void;
  onAck: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onCreateTask: (id: string, title: string) => void;
  scrollRef: RefObject<HTMLDivElement>;
  endRef: RefObject<HTMLDivElement>;
};

export function TalkMessageList({
  messages,
  pinnedMessages,
  regularMessages,
  loading,
  hasOlder,
  onLoadOlder,
  dragOver,
  sessionUserId,
  canModerate,
  editingId,
  editText,
  commandeId,
  onEditTextChange,
  onSaveEdit,
  onStartEdit,
  onDelete,
  onReply,
  onAck,
  onTogglePin,
  onToggleReaction,
  onCreateTask,
  scrollRef,
  endRef,
}: Props) {
  return (
    <div
      ref={scrollRef}
      className={`talk-msg-area flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 relative ${dragOver ? 'talk-drag-over' : ''}`}
    >
      {dragOver && (
        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold z-10 pointer-events-none talk-drag-overlay rounded-lg">
          Déposer les fichiers ici
        </div>
      )}

      {loading && messages.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <p className="orion-text-card-title">Aucun message</p>
          <p className="orion-text-body-muted mt-2 max-w-xs">Soyez le premier à écrire — partagez un fichier, mentionnez @graphistes ou créez une tâche depuis un message.</p>
        </div>
      ) : (
        <>
          {hasOlder && onLoadOlder && (
            <div className="flex justify-center pb-2">
              <button type="button" className="talk-load-more-btn" onClick={onLoadOlder}>
                Charger les messages précédents
              </button>
            </div>
          )}
          {pinnedMessages.length > 0 && (
            <div className="talk-pinned-strip space-y-2">
              <p className="orion-text-meta font-semibold text-[var(--orion-yellow-dark)] flex items-center gap-1">
                <Pin size={12} strokeWidth={1.75} /> Épinglés
              </p>
              {pinnedMessages.map((msg) => (
                <div key={`pin-${msg.id}`} className="talk-pinned-item truncate">
                  <strong className="font-semibold">{msg.senderName} :</strong> {msg.body.slice(0, 120)}
                </div>
              ))}
            </div>
          )}
          {regularMessages.map((msg) => (
            <TalkMessageBubble
              key={msg.id}
              message={msg}
              sessionUserId={sessionUserId}
              canModerate={canModerate}
              editingId={editingId}
              editText={editText}
              onEditTextChange={onEditTextChange}
              onSaveEdit={onSaveEdit}
              onStartEdit={onStartEdit}
              onDelete={onDelete}
              onReply={onReply}
              onAck={onAck}
              onTogglePin={onTogglePin}
              onToggleReaction={onToggleReaction}
              onCreateTask={onCreateTask}
              commandeId={commandeId}
            />
          ))}
        </>
      )}
      <div ref={endRef} />
    </div>
  );
}
