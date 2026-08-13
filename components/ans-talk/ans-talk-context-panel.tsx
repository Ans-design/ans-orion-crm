'use client';

import { useEffect, useMemo, useState } from 'react';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';
import Link from 'next/link';
import {
  Factory, FileCheck, Truck, Printer, Receipt, Banknote,
  Package, Calendar, MessageCircle, UserRound,
} from 'lucide-react';
import type { TalkConversation, TalkMessage, TalkUser } from '@/lib/hooks/use-ans-talk';
import { resolveTalkFeaturedUserIds } from '@/lib/ans-talk/talk-featured-colleagues';
import type { ConvFilterTab } from './talk-filters';
import { avatarColor, initials, orderStatusBadge, roleLabel } from './ans-talk-utils';
import { AnsTalkMediaGallery } from './ans-talk-media-gallery';
import { TalkColleagueRoster } from './talk-colleague-roster';

type OrderCtx = {
  numero: string;
  article: string;
  statut: string;
  quantite?: number;
  dimensions?: string;
  clientName?: string;
} | null;

type CtxTab = 'info' | 'files' | 'actions';

type Props = {
  conv: TalkConversation;
  messages?: TalkMessage[];
  galleryRefreshKey?: number;
  orderCtx: OrderCtx;
  userRole: string;
  users: TalkUser[];
  currentUserId?: string | null;
  /** Filtre inbox actif (Clients / Interne…) — pilote le roster Équipe ANS */
  inboxFilter?: ConvFilterTab;
  onStatusChange: (id: string, status: string) => void;
  onMessageUser: (userId: string) => void | Promise<void>;
};

const TABS: { id: CtxTab; label: string }[] = [
  { id: 'info', label: 'Contexte' },
  { id: 'files', label: 'Fichiers' },
  { id: 'actions', label: 'Actions' },
];

export function AnsTalkContextPanel({
  conv,
  messages = [],
  galleryRefreshKey = 0,
  orderCtx,
  onStatusChange,
  userRole,
  users,
  currentUserId,
  inboxFilter = 'all',
  onMessageUser,
}: Props) {
  const [tab, setTab] = useState<CtxTab>('info');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([]);
  const liveTick = useOrionLiveRevision(['commandes', 'production', 'nav'], { debounceMs: 400 });
  const badge = orderCtx ? orderStatusBadge(orderCtx.statut) : null;
  const showActions = Boolean(conv.commandeId);

  useEffect(() => {
    if (!conv.commandeId) {
      setTaskAssigneeIds([]);
      return;
    }
    const ac = new AbortController();
    fetch(`/api/equipe/taches?commandeId=${encodeURIComponent(conv.commandeId)}`, {
      credentials: 'include',
      signal: ac.signal,
      cache: 'no-store',
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body) return;
        const tasks = Array.isArray(body)
          ? body
          : Array.isArray((body as { data?: unknown }).data)
            ? ((body as { data: { assigneeId?: string | null }[] }).data)
            : [];
        const ids = [
          ...new Set(
            tasks
              .map((t: { assigneeId?: string | null }) => t.assigneeId)
              .filter((id): id is string => Boolean(id)),
          ),
        ];
        setTaskAssigneeIds(ids);
      })
      .catch(() => {
        if (!ac.signal.aborted) setTaskAssigneeIds([]);
      });
    return () => ac.abort();
  }, [conv.commandeId, liveTick]);

  const featuredUserIds = useMemo(
    () =>
      resolveTalkFeaturedUserIds({
        conversation: conv,
        messages,
        taskAssigneeIds,
        currentUserId,
      }),
    [conv, messages, taskAssigneeIds, currentUserId],
  );

  /** Participants de cette commande / conversation (pas la diffusion large). */
  const orderParticipants = useMemo(() => {
    const byId = new Map(users.map((u) => [u.id, u]));
    const memberById = new Map(conv.members.map((m) => [m.userId, m]));
    const ids =
      featuredUserIds.length > 0
        ? featuredUserIds
        : conv.members.length <= 6
          ? conv.members.map((m) => m.userId)
          : [];

    return ids
      .map((id) => {
        const u = byId.get(id);
        const m = memberById.get(id);
        if (!u && !m) return null;
        return {
          id,
          name: u?.name || m?.name || u?.email || 'Collaborateur',
          role: u?.role || m?.role || 'member',
          image: u?.image ?? null,
        };
      })
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
  }, [users, conv.members, featuredUserIds]);

  const handleMessage = async (userId: string) => {
    setBusyUserId(userId);
    try {
      await onMessageUser(userId);
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <aside className="talk-context-panel w-full shrink-0 flex flex-col overflow-hidden h-full" aria-label="Détails de la conversation">
      <div className="talk-context-head">
        <div>
          <div className="eyebrow">Espace lié</div>
          <h3>{orderCtx ? 'Dossier commande' : 'Contexte'}</h3>
        </div>
      </div>

      <div className="talk-context-tabs" role="tablist">
        {TABS.filter((t) => t.id !== 'actions' || showActions).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`talk-context-tab${tab === t.id ? ' is-active' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="talk-context-body">
        <div className="talk-context-main">
        {tab === 'info' && (
          <>
            {orderCtx ? (
              <article className="talk-order-card">
                {badge && (
                  <span className="talk-order-status">
                    <i className="dot" aria-hidden />
                    {badge.label}
                  </span>
                )}
                <h4>{orderCtx.article}</h4>
                <p>Commande #{orderCtx.numero}</p>
                <div className="talk-progress">
                  <div className="talk-progress-top">
                    <span>Avancement atelier</span>
                    <strong>—</strong>
                  </div>
                  <div className="talk-progress-bar">
                    <span style={{ width: '40%' }} />
                  </div>
                </div>
              </article>
            ) : (
              <article className="talk-order-card">
                <h4>{conv.name}</h4>
                <p>
                  {conv.type === 'devis'
                    ? 'Canal commercial lié au devis.'
                    : conv.description ?? 'Discussion interne ANS ORION.'}
                </p>
              </article>
            )}

            <section className="talk-info-section">
              <div className="talk-info-title">
                <span>Informations</span>
                {conv.commandeId && (
                  <Link href={`/commandes/${conv.commandeId}`} className="text-[var(--talk-primary)] hover:underline normal-case tracking-normal font-bold">
                    Fiche 360°
                  </Link>
                )}
              </div>
              <div className="talk-info-grid">
                {orderCtx?.clientName && (
                  <div className="talk-info-box">
                    <div className="talk-info-label">Client</div>
                    <div className="talk-info-value">{orderCtx.clientName}</div>
                  </div>
                )}
                {orderCtx?.quantite != null && (
                  <div className="talk-info-box">
                    <div className="talk-info-label">Quantité</div>
                    <div className="talk-info-value">{orderCtx.quantite.toLocaleString('fr-FR')} ex.</div>
                  </div>
                )}
                {orderCtx?.dimensions && (
                  <div className="talk-info-box">
                    <div className="talk-info-label">Format</div>
                    <div className="talk-info-value">{orderCtx.dimensions}</div>
                  </div>
                )}
                {orderCtx?.numero && (
                  <div className="talk-info-box">
                    <div className="talk-info-label">N° commande</div>
                    <div className="talk-info-value font-mono">{orderCtx.numero}</div>
                  </div>
                )}
                {!orderCtx && (
                  <div className="talk-info-box" style={{ gridColumn: '1 / -1' }}>
                    <div className="talk-info-label">Canal</div>
                    <div className="talk-info-value">{conv.name}</div>
                  </div>
                )}
              </div>
            </section>

            {orderParticipants.length > 0 ? (
              <section className="talk-info-section" aria-label="Participants de la commande">
                <div className="talk-info-title">
                  <span>Participants</span>
                  <span>
                    {orderParticipants.length} membre{orderParticipants.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="talk-participant-list">
                  {orderParticipants.map((p) => (
                    <div key={p.id} className="talk-colleague-row talk-colleague-row--featured">
                      <Link
                        href={`/rh/employes/${p.id}`}
                        className="talk-colleague-profile talk-colleague-profile--featured"
                        title={`Profil — ${p.name}`}
                      >
                        <span className="talk-colleague-avatar-wrap">
                          <span
                            className="talk-avatar talk-colleague-avatar"
                            style={{ background: avatarColor(p.id) }}
                          >
                            {p.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.image} alt="" className="talk-colleague-avatar-img" />
                            ) : (
                              initials(p.name)
                            )}
                          </span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <strong className="talk-colleague-name">{p.name}</strong>
                          <small className="talk-colleague-role">
                            Sur ce dossier · {roleLabel(p.role)}
                          </small>
                        </span>
                        <UserRound size={13} className="talk-colleague-profile-ico" strokeWidth={1.9} aria-hidden />
                      </Link>
                      <button
                        type="button"
                        className="talk-colleague-msg"
                        disabled={busyUserId === p.id}
                        title={`Discuter avec ${p.name}`}
                        aria-label={`Discuter avec ${p.name}`}
                        onClick={() => void handleMessage(p.id)}
                      >
                        <MessageCircle size={15} strokeWidth={1.9} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            ) : conv.commandeId ? (
              <section className="talk-info-section" aria-label="Participants de la commande">
                <div className="talk-info-title">
                  <span>Participants</span>
                  <span>0</span>
                </div>
                <p className="talk-colleagues-hint">
                  Aucun intervenant actif sur cette commande pour l’instant (messages ou tâches assignées).
                </p>
              </section>
            ) : null}

            {conv.commandeId && (
              <Link href={`/commandes/${conv.commandeId}`} className="talk-context-action">
                <Package size={14} strokeWidth={1.8} />
                Ouvrir la fiche 360°
              </Link>
            )}
            {conv.devisId && !conv.commandeId && (
              <Link href={`/devis?highlight=${conv.devisId}`} className="talk-context-action">
                <Receipt size={14} strokeWidth={1.8} />
                Voir le devis
              </Link>
            )}
          </>
        )}

        {tab === 'files' && (
          <AnsTalkMediaGallery
            conversationId={conv.id}
            refreshKey={galleryRefreshKey}
            onStatusChange={onStatusChange}
            userRole={userRole}
            embedded
          />
        )}

        {tab === 'actions' && showActions && conv.commandeId && (
          <section>
            <div className="talk-info-title">
              <span>Raccourcis métier</span>
              <span>6 actions</span>
            </div>
            <div className="talk-action-grid">
              <Link href={`/commandes/${conv.commandeId}`} className="talk-action-tile">
                <span className="talk-action-icon"><Factory size={16} strokeWidth={1.8} /></span>
                <strong>Commande</strong>
                <small>Fiche 360°</small>
              </Link>
              <Link href={`/bat?commande=${conv.commandeId}`} className="talk-action-tile">
                <span className="talk-action-icon" style={{ color: 'var(--talk-accent)', background: 'var(--talk-accent-soft)' }}>
                  <FileCheck size={16} strokeWidth={1.8} />
                </span>
                <strong>BAT</strong>
                <small>Validation</small>
              </Link>
              <Link href={`/planning?commande=${conv.commandeId}`} className="talk-action-tile">
                <span className="talk-action-icon" style={{ color: 'var(--talk-warning)', background: 'var(--talk-warning-soft)' }}>
                  <Calendar size={16} strokeWidth={1.8} />
                </span>
                <strong>Planning</strong>
                <small>Créneaux</small>
              </Link>
              <Link href={`/production?commande=${conv.commandeId}`} className="talk-action-tile">
                <span className="talk-action-icon" style={{ color: 'var(--talk-success)', background: 'var(--talk-success-soft)' }}>
                  <Printer size={16} strokeWidth={1.8} />
                </span>
                <strong>Production</strong>
                <small>GPAO</small>
              </Link>
              <Link href={`/livraisons?commande=${conv.commandeId}`} className="talk-action-tile">
                <span className="talk-action-icon"><Truck size={16} strokeWidth={1.8} /></span>
                <strong>Livraisons</strong>
                <small>Expédition</small>
              </Link>
              <Link href={`/factures?commande=${conv.commandeId}`} className="talk-action-tile">
                <span className="talk-action-icon" style={{ color: 'var(--talk-primary)', background: 'var(--talk-primary-soft)' }}>
                  <Banknote size={16} strokeWidth={1.8} />
                </span>
                <strong>Finance</strong>
                <small>Facture</small>
              </Link>
            </div>
          </section>
        )}
        </div>

        <TalkColleagueRoster
          users={users}
          currentUserId={currentUserId}
          busyUserId={busyUserId}
          featuredUserIds={featuredUserIds}
          inboxFilter={inboxFilter}
          onMessage={handleMessage}
        />
      </div>
    </aside>
  );
}
