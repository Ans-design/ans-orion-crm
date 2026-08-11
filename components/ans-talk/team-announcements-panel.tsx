'use client';

import { useCallback, useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { Pin, Send, Loader2, Megaphone } from 'lucide-react';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { avatarColor, initials } from './ans-talk-utils';

type Reply = { id: string; authorName: string; content: string; createdAt: string };
type Message = {
  id: string;
  authorName: string;
  authorRole: string | null;
  content: string;
  pinned: boolean;
  createdAt: string;
  replies: Reply[];
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleLabel(role: string | null) {
  if (!role) return null;
  return ROLE_LABELS[role as keyof typeof ROLE_LABELS] ?? role;
}

/** Fil d'annonces équipe — style ANS Talk. */
export function TeamAnnouncementsPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetch('/api/equipe/messages', { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('Chargement impossible');
        return r.json();
      })
      .then((d) => setMessages(Array.isArray(d) ? d : []))
      .catch(() => setLoadError('Impossible de charger les annonces'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const postMessage = async () => {
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/equipe/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        setContent('');
        load();
        uxToast.success('Annonce publiée');
      } else uxToast.error('Publication refusée');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="talk-announce-shell">
      <section className="talk-announce-composer">
        <div className="talk-announce-composer-head">
          <span className="talk-announce-composer-ico" aria-hidden>
            <Megaphone size={15} strokeWidth={1.9} />
          </span>
          <div>
            <h2 className="talk-announce-composer-title">Nouvelle annonce</h2>
            <p className="talk-announce-composer-sub">Visible par toute l’équipe ANS</p>
          </div>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Partagez une info officielle, un rappel atelier, une consigne…"
          className="talk-announce-textarea"
          aria-label="Contenu de l’annonce"
        />
        <div className="talk-announce-composer-foot">
          <span className="talk-announce-hint">{content.trim().length}/2000</span>
          <button
            type="button"
            disabled={!content.trim() || posting}
            onClick={postMessage}
            className="talk-btn-primary talk-announce-publish disabled:opacity-40"
          >
            {posting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} strokeWidth={1.8} />}
            Publier
          </button>
        </div>
      </section>

      <div className="talk-announce-feed">
        <div className="talk-announce-feed-label">
          <span>Fil d’actualité</span>
          {!loading && <span>{messages.length} annonce{messages.length !== 1 ? 's' : ''}</span>}
        </div>

        {loadError && <p className="talk-announce-error">{loadError}</p>}

        {loading ? (
          <div className="talk-announce-loading">
            <Loader2 size={22} className="animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="talk-announce-empty">
            <Megaphone size={28} strokeWidth={1.5} />
            <p className="talk-announce-empty-title">Aucune annonce</p>
            <p className="talk-announce-empty-sub">
              Publiez la première information officielle pour toute l’équipe.
            </p>
          </div>
        ) : (
          <div className="talk-announce-list">
            {messages.map((m) => (
              <article key={m.id} className={`talk-announce-card${m.pinned ? ' is-pinned' : ''}`}>
                <div
                  className="talk-avatar talk-announce-avatar"
                  style={{ background: avatarColor(m.authorName) }}
                >
                  {initials(m.authorName)}
                </div>
                <div className="talk-announce-card-body">
                  <header className="talk-announce-card-head">
                    <div className="min-w-0">
                      <div className="talk-announce-author-row">
                        <strong className="talk-announce-author">{m.authorName}</strong>
                        {m.authorRole && (
                          <span className="talk-announce-role">{roleLabel(m.authorRole)}</span>
                        )}
                        {m.pinned && (
                          <span className="talk-announce-pin">
                            <Pin size={10} strokeWidth={2} /> Épinglé
                          </span>
                        )}
                      </div>
                    </div>
                    <time className="talk-announce-date" dateTime={m.createdAt}>
                      {formatDate(m.createdAt)}
                    </time>
                  </header>
                  <p className="talk-announce-content">{m.content}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
