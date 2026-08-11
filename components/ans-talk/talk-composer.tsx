'use client';

import { useRef } from 'react';
import { Send, Paperclip, Smile, Mic, MicOff, X, Plus } from 'lucide-react';

type Props = {
  input: string;
  pendingFiles: File[];
  uploadPct: number | null;
  recording: boolean;
  replyTo: { senderName: string } | null;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onClearReply: () => void;
  onToggleVoice: () => void;
  onMentionGraphistes: () => void;
  onNewMessage?: () => void;
};

export function TalkComposer({
  input,
  pendingFiles,
  uploadPct,
  recording,
  replyTo,
  onInputChange,
  onSend,
  onFilesSelected,
  onRemoveFile,
  onClearReply,
  onToggleVoice,
  onMentionGraphistes,
  onNewMessage,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <footer className="talk-composer shrink-0 flex flex-col gap-2">
      {replyTo && (
        <div className="flex items-center justify-between text-[11px] text-[var(--talk-muted)] px-1">
          <span>
            Réponse à <strong className="text-[var(--talk-ink)]">{replyTo.senderName}</strong>
          </span>
          <button type="button" onClick={onClearReply} className="talk-icon-btn h-7 w-7" aria-label="Annuler la réponse">
            <X size={14} />
          </button>
        </div>
      )}

      {uploadPct !== null && (
        <div className="px-1">
          <div className="h-1 bg-[var(--talk-line)] rounded-full overflow-hidden">
            <div
              className="h-full transition-all rounded-full bg-[var(--talk-accent)]"
              style={{ width: `${uploadPct}%` }}
            />
          </div>
        </div>
      )}

      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {pendingFiles.map((f, i) => (
            <span
              key={`${f.name}-${i}`}
              className="text-[10px] px-2 py-1 rounded-[7px] bg-[var(--talk-surface-soft)] border border-[var(--talk-line)] flex items-center gap-1"
            >
              {f.name}
              <button type="button" onClick={() => onRemoveFile(i)} aria-label="Retirer">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="talk-composer-bar">
        {onNewMessage && (
          <button
            type="button"
            className="talk-new-btn shrink-0"
            title="Nouveau message"
            aria-label="Nouveau message"
            onClick={onNewMessage}
          >
            <Plus size={18} strokeWidth={2.2} />
          </button>
        )}
        <div className="talk-composer-inner">
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif,.webp,.svg,.ai,.psd,.eps,.indd,.cdr,.xd,.fig,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.mp4,.mov,.avi,.webm,.mp3,.wav,.ogg"
            onChange={(e) => {
              if (e.target.files?.length) {
                onFilesSelected(Array.from(e.target.files));
                e.target.value = '';
              }
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="talk-composer-btn shrink-0"
            title="Joindre un fichier"
          >
            <Paperclip size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onMentionGraphistes}
            className="talk-composer-btn shrink-0 hidden sm:grid"
            title="Emoji / mention"
          >
            <Smile size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onToggleVoice}
            className={`talk-composer-btn shrink-0 ${recording ? 'text-[var(--talk-accent)] bg-[var(--talk-accent-soft)] animate-pulse' : ''}`}
            title={recording ? 'Arrêter' : 'Message vocal'}
          >
            {recording ? <MicOff size={18} strokeWidth={1.8} /> : <Mic size={18} strokeWidth={1.8} />}
          </button>
          <textarea
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            rows={1}
            placeholder="Écrire un message…"
            className="talk-input flex-1 text-[12px] px-2 py-1 resize-none min-h-[24px] max-h-[92px] leading-6"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() && !pendingFiles.length}
            className="talk-btn-primary shrink-0 disabled:opacity-40"
            aria-label="Envoyer"
            title="Envoyer"
          >
            <Send size={17} strokeWidth={1.9} />
          </button>
        </div>
      </div>
    </footer>
  );
}
