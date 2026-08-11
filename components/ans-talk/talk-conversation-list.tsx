'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Loader2, Megaphone, Building2, Users } from 'lucide-react';
import type { TalkConversation } from '@/lib/hooks/use-ans-talk';
import { TalkConversationItem } from './talk-conversation-item';
import { matchesTalkFilter, type ConvFilterTab } from './talk-filters';
import { convPriority, convVisual } from '@/lib/ans-talk/talk-visual';
import { playTalkUrgentChime } from '@/lib/ans-talk/talk-alert-sound';

export type { ConvFilterTab };

const PRIMARY_FILTERS: { id: ConvFilterTab; label: string }[] = [
  { id: 'all', label: 'Toutes' },
  { id: 'client', label: 'Clients' },
  { id: 'team', label: 'Interne' },
  { id: 'unread', label: 'Non lues' },
];

type Props = {
  conversations: TalkConversation[];
  activeConvId: string | null;
  loading: boolean;
  filter: ConvFilterTab;
  search: string;
  compact?: boolean;
  onFilterChange: (f: ConvFilterTab) => void;
  onSearchChange: (s: string) => void;
  onSelectConv: (id: string) => void;
  onNewGroup: () => void;
};

export function TalkConversationList({
  conversations,
  activeConvId,
  loading,
  filter,
  search,
  compact,
  onFilterChange,
  onSearchChange,
  onSelectConv,
  onNewGroup,
}: Props) {
  const q = search.trim().toLowerCase();
  const filteredConvs = conversations.filter((c) => {
    if (q && !c.name.toLowerCase().includes(q) && !c.lastMessage?.body.toLowerCase().includes(q)) return false;
    return matchesTalkFilter(c, filter);
  });

  const unreadTotal = conversations.reduce((n, c) => n + (c.unreadCount || 0), 0);
  const pinned = filteredConvs.filter((c) => c.pinned);
  const regular = filteredConvs.filter((c) => !c.pinned);
  const clientConvs = regular.filter((c) => convVisual(c).kind === 'client');
  const teamConvs = regular.filter((c) => convVisual(c).kind !== 'client');
  const showKindSections = filter === 'all' && !q && (clientConvs.length > 0 || teamConvs.length > 0);

  const urgentCount = conversations.filter(
    (c) => convVisual(c).kind === 'client' && convPriority(c) === 'urgent',
  ).length;
  const prevUrgent = useRef<number | null>(null);
  useEffect(() => {
    if (prevUrgent.current === null) {
      prevUrgent.current = urgentCount;
      return;
    }
    if (urgentCount > prevUrgent.current) {
      playTalkUrgentChime();
    }
    prevUrgent.current = urgentCount;
  }, [urgentCount]);
  const countLabel =
    filter === 'all'
      ? conversations.length
      : filter === 'unread'
        ? unreadTotal
        : filteredConvs.length;

  const renderItems = (items: TalkConversation[]) =>
    items.map((c) => (
      <TalkConversationItem
        key={c.id}
        conversation={c}
        isActive={activeConvId === c.id}
        onSelect={() => onSelectConv(c.id)}
      />
    ));

  return (
    <aside className="talk-inbox flex flex-col w-full h-full shrink-0" aria-label="Boîte de réception">
      <div className="talk-inbox-head">
        <div className="talk-inbox-title-row">
          <div>
            <div className="talk-inbox-eyebrow">Messagerie interne</div>
            <h1 className="talk-inbox-title">ANS Talk</h1>
          </div>
        </div>

        <label className="talk-search">
          <Search size={15} strokeWidth={1.8} aria-hidden />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher une conversation…"
            aria-label="Rechercher une conversation"
          />
        </label>

        <div className="talk-filter-row" role="tablist" aria-label="Filtres des conversations">
          {PRIMARY_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={`talk-filter-chip${filter === f.id ? ' is-active' : ''}`}
              onClick={() => onFilterChange(f.id)}
            >
              {f.label}
              {f.id === 'all' ? ` ${countLabel}` : ''}
              {f.id === 'unread' && unreadTotal > 0 ? (
                <span className="talk-filter-count">{unreadTotal > 99 ? '99+' : unreadTotal}</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="talk-inbox-head-fade" aria-hidden />
      </div>

      <div className="talk-inbox-body">
        <Link href="/messagerie?tab=annonces" className="talk-announce-row text-inherit">
          <div className="talk-announce-icon shrink-0">
            <Megaphone size={14} strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <span className="talk-announce-title">Annonces</span>
            <p className="talk-announce-sub">Fil d’actualité interne</p>
          </div>
        </Link>

        <div className="talk-conv-scroll">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-[var(--talk-muted)]" size={18} />
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center px-3 py-8">
              <p className="text-xs text-[var(--talk-muted)] leading-5">
                {q || filter !== 'all' ? 'Aucune conversation pour ce filtre.' : 'Aucune conversation.'}
              </p>
              {!q && filter === 'all' && (
                <button type="button" onClick={onNewGroup} className="mt-2 text-xs font-bold text-[var(--talk-primary)] hover:underline">
                  Créer un groupe
                </button>
              )}
            </div>
          ) : (
            <>
              {pinned.length > 0 && (
                <div className="mb-0.5">
                  <p className="talk-conv-section-label">Épinglée</p>
                  {renderItems(pinned)}
                </div>
              )}
              {showKindSections ? (
                <>
                  {clientConvs.length > 0 && (
                    <div className="talk-conv-kind-block">
                      <p className="talk-conv-section-label talk-conv-section-label--client">
                        <Building2 size={11} strokeWidth={2.2} /> Dossiers clients
                      </p>
                      {renderItems(clientConvs)}
                    </div>
                  )}
                  {teamConvs.length > 0 && (
                    <div className="talk-conv-kind-block">
                      <p className="talk-conv-section-label talk-conv-section-label--team">
                        <Users size={11} strokeWidth={2.2} /> Discussions internes
                      </p>
                      {renderItems(teamConvs)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  {regular.length > 0 && pinned.length > 0 && (
                    <p className="talk-conv-section-label" style={{ marginTop: 14 }}>Récentes</p>
                  )}
                  {renderItems(regular)}
                </>
              )}
            </>
          )}
        </div>
        {!compact && (
          <div className="talk-inbox-foot">
            <button type="button" onClick={onNewGroup} className="talk-btn-ghost talk-btn-new-group">
              Nouveau groupe
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
