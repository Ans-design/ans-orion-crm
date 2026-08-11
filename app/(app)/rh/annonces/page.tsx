'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Newspaper,
  Loader2,
  Send,
  Pin,
  Megaphone,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { RH_ANNOUNCE_PRIORITIES } from '@/lib/constants/rh';
import {
  AppPageHeader,
  AppButton,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';

type Announce = {
  id: string;
  title: string;
  content: string;
  priority: string;
  authorName: string;
  pinned: boolean;
  createdAt: string;
};

function prioTone(p: string) {
  if (p === 'Urgent') return 'urgent';
  if (p === 'Important') return 'important';
  return 'normal';
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function RhAnnoncesPage() {
  const [items, setItems] = useState<Announce[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<string>('Normal');
  const [pinned, setPinned] = useState(false);
  const [filter, setFilter] = useState('tous');
  const [posting, setPosting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/rh/annonces')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'tous') return items;
    if (filter === 'pinned') return items.filter((a) => a.pinned);
    return items.filter((a) => a.priority === filter);
  }, [items, filter]);

  const kpis = useMemo(
    () => ({
      total: items.length,
      pinned: items.filter((a) => a.pinned).length,
      urgent: items.filter((a) => a.priority === 'Urgent').length,
      important: items.filter((a) => a.priority === 'Important').length,
    }),
    [items],
  );

  const submit = async () => {
    if (!title.trim() || !content.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch('/api/rh/annonces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, priority, pinned }),
      });
      if (res.ok) {
        setTitle('');
        setContent('');
        setPriority('Normal');
        setPinned(false);
        load();
      }
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="rh-ann-page dashboard-full">
      <AppPageHeader
        title="Annonces RH"
        description="Communications internes direction"
        icon={Newspaper}
        actions={
          <div className="rh-ann-links">
            <Link href="/rh/employes">← Employés</Link>
            <Link href="/rh/absences">Congés</Link>
          </div>
        }
      />

      <div className="rh-ann-kpi">
        <AppKpiCard label="Annonces" value={kpis.total} icon={Megaphone} tone="info" />
        <AppKpiCard label="Épinglées" value={kpis.pinned} icon={Pin} tone="warning" />
        <AppKpiCard label="Importantes" value={kpis.important} icon={Info} tone="brand" />
        <AppKpiCard
          label="Urgentes"
          value={kpis.urgent}
          icon={AlertTriangle}
          tone={kpis.urgent > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <form
        className="rh-ann-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <div className="rh-ann-composer__head">Publier (direction)</div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Titre"
          aria-label="Titre"
          required
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="Contenu de l'annonce…"
          aria-label="Contenu"
          required
          className="rh-ann-composer__content"
        />
        <div className="rh-ann-composer__row">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Priorité"
          >
            {RH_ANNOUNCE_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <label className="rh-ann-pin">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            <Pin size={12} aria-hidden />
            Épingler
          </label>
          <AppButton
            type="submit"
            size="sm"
            disabled={!title.trim() || !content.trim() || posting}
            className="gap-1 rh-ann-composer__submit"
          >
            {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Publier
          </AppButton>
        </div>
      </form>

      <div className="rh-ann-filters">
        {[
          { id: 'tous', label: 'Toutes' },
          { id: 'pinned', label: 'Épinglées' },
          ...RH_ANNOUNCE_PRIORITIES.map((p) => ({ id: p, label: p })),
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rh-ann-chip${filter === f.id ? ' is-active' : ''}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <AppListSkeleton rows={3} />
      ) : filtered.length === 0 ? (
        <AppEmptyState
          icon={Newspaper}
          title="Aucune annonce"
          description="Publiez une communication ou changez le filtre."
        />
      ) : (
        <div className="rh-ann-grid">
          {filtered.map((a) => {
            const tone = prioTone(a.priority);
            return (
              <article
                key={a.id}
                className="rh-ann-card"
                data-prio={tone}
                data-pinned={a.pinned ? '1' : undefined}
              >
                <div className="rh-ann-card__top">
                  <div className="min-w-0 flex-1">
                    <div className="rh-ann-card__badges">
                      {a.pinned ? (
                        <span className="rh-ann-pin-badge">
                          <Pin size={10} /> Épinglée
                        </span>
                      ) : null}
                      <span className={`rh-ann-prio rh-ann-prio--${tone}`}>{a.priority}</span>
                    </div>
                    <h2 className="rh-ann-card__title">{a.title}</h2>
                  </div>
                </div>
                <p className="rh-ann-card__body">{a.content}</p>
                <p className="rh-ann-card__meta">
                  {a.authorName} · {fmtDate(a.createdAt)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
