'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Lightbulb,
  ThumbsUp,
  Loader2,
  Send,
  MessageSquare,
  Briefcase,
  Factory,
  Palette,
  Users,
} from 'lucide-react';
import {
  AppPageHeader,
  AppButton,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';
import { SUGGESTION_STATUSES, type SuggestionStatus } from '@/lib/constants/team-communication';

type Suggestion = {
  id: string;
  authorName: string;
  title: string;
  content: string;
  status: string;
  votes: number;
  createdAt: string;
};

type DeptKey = 'commercial' | 'production' | 'studio' | 'equipe';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function detectDept(author: string): DeptKey {
  const a = author.toLowerCase();
  if (a.includes('commercial') || a.includes('vente') || a.includes('crm')) return 'commercial';
  if (a.includes('production') || a.includes('atelier') || a.includes('gpao')) return 'production';
  if (a.includes('studio') || a.includes('design') || a.includes('prépresse') || a.includes('prepresse')) {
    return 'studio';
  }
  return 'equipe';
}

const DEPT_ICON = {
  commercial: Briefcase,
  production: Factory,
  studio: Palette,
  equipe: Users,
} as const;

export default function EquipeSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<string>('tous');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/equipe/suggestions')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSuggestions(Array.isArray(d) ? d : []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    if (!title.trim() || !content.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/equipe/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        load();
      }
    } finally {
      setPosting(false);
    }
  };

  const vote = async (id: string) => {
    const res = await fetch(`/api/equipe/suggestions/${id}/vote`, { method: 'POST' });
    if (res.ok) {
      const updated = await res.json();
      setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, votes: updated.votes } : s)));
    }
  };

  const filtered =
    filter === 'tous' ? suggestions : suggestions.filter((s) => s.status === filter);

  return (
    <div className="suggestions-page dashboard-full">
      <AppPageHeader
        title="Suggestions & idées"
        description="Proposez · votez · priorisez les idées équipe"
        icon={Lightbulb}
        actions={
          <AppButton asChild variant="outline" size="sm">
            <Link href="/messagerie">
              <MessageSquare size={14} />
              Messages équipe
            </Link>
          </AppButton>
        }
      />

      <div className="suggestions-layout">
        <form
          className="suggestions-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="suggestions-composer__label">Nouvelle suggestion</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre court"
            aria-label="Titre de la suggestion"
            maxLength={120}
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Idée en quelques lignes…"
            aria-label="Description de la suggestion"
            maxLength={500}
          />
          <div className="suggestions-composer__actions">
            <AppButton
              type="submit"
              size="sm"
              disabled={!title.trim() || !content.trim() || posting}
            >
              {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Soumettre
            </AppButton>
          </div>
        </form>

        <section className="suggestions-feed">
          <div className="suggestions-filters" role="tablist" aria-label="Filtrer par statut">
            {['tous', ...SUGGESTION_STATUSES].map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={filter === s}
                onClick={() => setFilter(s)}
                className={`suggestions-filter${filter === s ? ' is-active' : ''}`}
              >
                {s === 'tous' ? 'Toutes' : s}
              </button>
            ))}
          </div>

          {loading ? (
            <AppListSkeleton rows={4} />
          ) : filtered.length === 0 ? (
            <AppEmptyState
              icon={Lightbulb}
              title="Aucune suggestion"
              description={
                filter !== 'tous'
                  ? `Rien avec le statut « ${filter} ».`
                  : 'Soyez le premier à proposer une idée.'
              }
            />
          ) : (
            <div className="suggestions-grid">
              {filtered.map((s) => {
                const dept = detectDept(s.authorName);
                const DeptIcon = DEPT_ICON[dept];
                return (
                  <article key={s.id} className="suggestions-card" data-status={s.status}>
                    <div className="suggestions-card__top">
                      <div className="suggestions-card__title-wrap">
                        <span className="suggestions-card__icon" data-dept={dept} aria-hidden>
                          <DeptIcon size={14} strokeWidth={2} />
                        </span>
                        <h2 className="suggestions-card__title">{s.title}</h2>
                      </div>
                      <span className="suggestions-pill" data-status={s.status}>
                        {s.status as SuggestionStatus}
                      </span>
                    </div>
                    <p className="suggestions-card__body">{s.content}</p>
                    <div className="suggestions-card__foot">
                      <span className="suggestions-card__meta">
                        {s.authorName} · {formatDate(s.createdAt)}
                      </span>
                      <button
                        type="button"
                        className="suggestions-vote"
                        onClick={() => vote(s.id)}
                        aria-label={`Voter pour ${s.title}`}
                      >
                        <ThumbsUp size={12} /> {s.votes}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
