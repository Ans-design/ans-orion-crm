'use client';

import {
  Pin, Reply, Trash2, Edit2, CheckCheck, Download, ListTodo,
} from 'lucide-react';
import type { TalkMessage } from '@/lib/hooks/use-ans-talk';
import {
  avatarColor, formatBytes, fileIcon, initials, renderMessageBody, roleLabel, TALK_SHELL,
} from './ans-talk-utils';

type Props = {
  message: TalkMessage;
  sessionUserId?: string;
  canModerate: boolean;
  editingId: string | null;
  editText: string;
  onEditTextChange: (v: string) => void;
  onSaveEdit: (id: string) => void;
  onStartEdit: (id: string, body: string) => void;
  onDelete: (id: string) => void;
  onReply: (msg: { id: string; body: string; senderName: string }) => void;
  onAck: (id: string) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleReaction: (id: string, emoji: string) => void;
  onCreateTask: (id: string, title: string) => void;
  commandeId?: string | null;
};

export function TalkMessageBubble({
  message: msg,
  sessionUserId,
  canModerate,
  editingId,
  editText,
  onEditTextChange,
  onSaveEdit,
  onStartEdit,
  onDelete,
  onReply,
  onAck,
  onTogglePin,
  onToggleReaction,
  onCreateTask,
  commandeId,
}: Props) {
  return (
    <div className={`talk-msg-group flex gap-2.5 ${msg.isMine ? 'flex-row-reverse' : ''}`}>
      {!msg.isMine && (
        <div
          className="talk-avatar shrink-0 flex items-center justify-center text-[9px] font-extrabold text-white mt-1"
          style={{ background: avatarColor(msg.senderName), width: 31, height: 31, borderRadius: 11 }}
        >
          {initials(msg.senderName)}
        </div>
      )}
      <div className={`max-w-[min(100%,520px)] ${msg.isMine ? 'items-end' : ''}`}>
        {!msg.isMine && (
          <p className="text-xs font-semibold text-muted-foreground mb-1 px-0.5">
            {msg.senderName}
            {msg.senderRole && (
              <span className="font-normal opacity-70"> · {roleLabel(msg.senderRole)}</span>
            )}
          </p>
        )}
        <div className={`talk-bubble px-3.5 py-2.5 text-sm ${msg.isMine ? 'talk-bubble-mine' : 'talk-bubble-other'}`}>
          {msg.replyTo && (
            <div className="talk-reply-quote orion-text-meta border-l-2 pl-2 mb-2 opacity-70" style={{ borderColor: TALK_SHELL.red }}>
              {msg.replyTo.senderName}: {msg.replyTo.body.slice(0, 100)}
            </div>
          )}
          {msg.pinned && <Pin size={10} className="inline mr-1 text-amber-400" />}
          {editingId === msg.id ? (
            <div className="space-y-1">
              <textarea value={editText} onChange={(e) => onEditTextChange(e.target.value)} className="talk-input w-full text-xs p-2 rounded-md" rows={2} />
              <button type="button" className="text-xs font-semibold text-[var(--orion-red-vivid)]" onClick={() => onSaveEdit(msg.id)}>Enregistrer</button>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words leading-relaxed text-foreground/95">{renderMessageBody(msg.body)}</p>
          )}

          {msg.attachments.map((a) => (
            <a
              key={a.id}
              href={`/api/messaging/attachments/${a.id}/download`}
              className="talk-attachment mt-2 flex items-center gap-3 p-2.5 rounded-lg group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="w-10 h-10 flex items-center justify-center text-xs font-bold shrink-0 rounded-md bg-[var(--orion-red-vivid)]/15 text-[var(--orion-red-vivid)]">
                {fileIcon(a.extension)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-xs truncate group-hover:text-foreground">{a.originalFileName}</p>
                <p className="text-[9px] text-muted-foreground">{formatBytes(a.sizeBytes)} · {a.status}</p>
              </div>
              <Download size={14} className="text-muted-foreground group-hover:text-foreground shrink-0" />
            </a>
          ))}

          <div className="flex items-center justify-between mt-2 gap-2 flex-wrap talk-bubble-actions">
            <span className="orion-text-meta tabular-nums">
              {new Date(msg.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              {msg.editedAt && ' · modifié'}
            </span>
            <div className="flex items-center gap-0.5 opacity-90">
              {Object.entries(msg.reactions).map(([emoji, count]) => (
                <button key={emoji} type="button" onClick={() => onToggleReaction(msg.id, emoji)} className="talk-reaction text-xs px-1.5 py-0.5 rounded-full">
                  {emoji} {count}
                </button>
              ))}
              <button type="button" onClick={() => onToggleReaction(msg.id, '❤️')} title="Réagir" className="p-0.5 hover:scale-110 transition">❤️</button>
              <button type="button" onClick={() => onReply({ id: msg.id, body: msg.body, senderName: msg.senderName })} title="Répondre" className="p-1 text-muted-foreground hover:text-foreground"><Reply size={12} /></button>
              {!msg.isMine && !msg.ackedBy.includes(sessionUserId ?? '') && (
                <button type="button" onClick={() => onAck(msg.id)} title="Accusé" className="p-1"><CheckCheck size={12} className="text-muted-foreground hover:text-[var(--orion-red-vivid)]" /></button>
              )}
              {canModerate && (
                <button type="button" onClick={() => onTogglePin(msg.id, !msg.pinned)} title="Épingler" className="p-1">
                  <Pin size={12} className={msg.pinned ? 'text-amber-400' : 'text-muted-foreground'} />
                </button>
              )}
              <button type="button" onClick={() => onCreateTask(msg.id, `Suite: ${msg.body.slice(0, 40)}`)} title="Tâche" className="p-1"><ListTodo size={12} className="text-muted-foreground" /></button>
              {(msg.isMine || canModerate) && (
                <>
                  <button type="button" onClick={() => onDelete(msg.id)} title="Supprimer" className="p-1"><Trash2 size={12} className="text-muted-foreground" /></button>
                  <button type="button" onClick={() => onStartEdit(msg.id, msg.body)} title="Modifier" className="p-1"><Edit2 size={12} className="text-muted-foreground" /></button>
                </>
              )}
              {msg.isMine && msg.ackedBy.length > 0 && <CheckCheck size={12} className="text-[var(--orion-red-vivid)]" />}
              {msg.tasks.map((t) => (
                <a
                  key={t.id}
                  href={t.taskId ? `/equipe/taches?tache=${t.taskId}` : commandeId ? `/equipe/taches?commande=${commandeId}` : '/equipe/taches'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] text-[var(--orion-red-vivid)] hover:underline"
                >
                  📋 {t.title}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
