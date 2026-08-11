'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, MessageCircle, UserRound } from 'lucide-react';
import type { TalkUser } from '@/lib/hooks/use-ans-talk';
import type { ConvFilterTab } from './talk-filters';
import { avatarColor, initials, roleLabel } from './ans-talk-utils';

type Props = {
  users: TalkUser[];
  currentUserId?: string | null;
  busyUserId?: string | null;
  /** Vrais participants (messages / tâches) — pas toute la diffusion Talk */
  featuredUserIds?: string[];
  /** Filtre inbox : Interne = liste complète ; Clients = participants + Voir plus */
  inboxFilter?: ConvFilterTab;
  onMessage: (userId: string) => void;
};

function ColleagueRow({
  user,
  featured,
  busy,
  onMessage,
}: {
  user: TalkUser;
  featured?: boolean;
  busy: boolean;
  onMessage: (userId: string) => void;
}) {
  const name = user.name || user.email || 'Collaborateur';
  return (
    <div className={`talk-colleague-row${featured ? ' talk-colleague-row--featured' : ''}`}>
      <Link
        href={`/rh/employes/${user.id}`}
        className={`talk-colleague-profile${featured ? ' talk-colleague-profile--featured' : ''}`}
        title={`Profil — ${name}`}
      >
        <span className="talk-colleague-avatar-wrap">
          <span className="talk-avatar talk-colleague-avatar" style={{ background: avatarColor(user.id) }}>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="talk-colleague-avatar-img" />
            ) : (
              initials(name)
            )}
          </span>
          <span className="talk-colleague-online" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <strong className="talk-colleague-name">{name}</strong>
          <small className="talk-colleague-role">
            {featured ? 'Sur ce dossier · ' : ''}
            {roleLabel(user.role)}
          </small>
        </span>
        <UserRound size={13} className="talk-colleague-profile-ico" strokeWidth={1.9} aria-hidden />
      </Link>
      <button
        type="button"
        className="talk-colleague-msg"
        disabled={busy}
        title={`Discuter avec ${name}`}
        aria-label={`Discuter avec ${name}`}
        onClick={() => onMessage(user.id)}
      >
        <MessageCircle size={15} strokeWidth={1.9} />
      </button>
    </div>
  );
}

export function TalkColleagueRoster({
  users,
  currentUserId,
  busyUserId,
  featuredUserIds = [],
  inboxFilter = 'all',
  onMessage,
}: Props) {
  const [showAll, setShowAll] = useState(false);
  /** Interne : toute l’équipe visible en permanence (pas de « Voir plus ») */
  const showFullTeam = inboxFilter === 'team';
  /** Clients (et filtres dossier) : participants d’abord, reste derrière Voir plus */
  const collapseOthers = inboxFilter === 'client' || inboxFilter === 'order' || !showFullTeam;

  const featuredKey = `${inboxFilter}:${featuredUserIds.join('|')}`;

  const { featured, others, flat } = useMemo(() => {
    const list = users.filter((u) => u.id && u.id !== currentUserId);
    if (showFullTeam) {
      return { featured: [] as TalkUser[], others: [] as TalkUser[], flat: list };
    }
    const featuredSet = new Set(featuredUserIds.filter(Boolean));
    const feat = list.filter((u) => featuredSet.has(u.id));
    feat.sort((a, b) => featuredUserIds.indexOf(a.id) - featuredUserIds.indexOf(b.id));
    const rest = list.filter((u) => !featuredSet.has(u.id));
    return { featured: feat, others: rest, flat: [] as TalkUser[] };
  }, [users, currentUserId, featuredUserIds, showFullTeam]);

  useEffect(() => {
    setShowAll(false);
  }, [featuredKey]);

  const total = showFullTeam ? flat.length : featured.length + others.length;

  if (total === 0) {
    return (
      <section className="talk-colleagues" aria-label="Collègues">
        <div className="talk-info-title">
          <span>Équipe ANS</span>
          <span>0</span>
        </div>
        <p className="talk-colleagues-empty">Aucun collègue disponible pour le moment.</p>
      </section>
    );
  }

  const visibleOthers = collapseOthers && !showAll ? [] : others;

  return (
    <section className="talk-colleagues" aria-label="Collègues">
      <div className="talk-info-title">
        <span>Équipe ANS</span>
        <span>
          {showFullTeam
            ? `${total} collègue${total > 1 ? 's' : ''}`
            : featured.length > 0
              ? `${featured.length} sur dossier · ${total}`
              : `${total} collègue${total > 1 ? 's' : ''}`}
        </span>
      </div>

      <div className="talk-colleague-list">
        {showFullTeam ? (
          <>
            <p className="talk-colleague-section-label">Équipe interne</p>
            {flat.map((u) => (
              <ColleagueRow
                key={u.id}
                user={u}
                busy={busyUserId === u.id}
                onMessage={onMessage}
              />
            ))}
          </>
        ) : (
          <>
            {featured.length > 0 && (
              <p className="talk-colleague-section-label">
                {featured.length === 1 ? 'Participant / tâche' : 'Participants / tâches'}
              </p>
            )}
            {featured.length === 0 && (
              <p className="talk-colleagues-hint">
                Aucun intervenant actif sur ce dossier. Ouvrez « Voir plus » pour écrire à un collègue.
              </p>
            )}
            {featured.map((u) => (
              <ColleagueRow
                key={u.id}
                user={u}
                featured
                busy={busyUserId === u.id}
                onMessage={onMessage}
              />
            ))}

            {visibleOthers.length > 0 && (
              <>
                <p className="talk-colleague-section-label">Autres collègues</p>
                {visibleOthers.map((u) => (
                  <ColleagueRow
                    key={u.id}
                    user={u}
                    busy={busyUserId === u.id}
                    onMessage={onMessage}
                  />
                ))}
              </>
            )}

            {collapseOthers && others.length > 0 && (
              <button
                type="button"
                className="talk-colleague-more"
                aria-expanded={showAll}
                onClick={() => setShowAll((v) => !v)}
              >
                <ChevronDown
                  size={14}
                  strokeWidth={2.2}
                  className={showAll ? 'talk-colleague-more-ico is-open' : 'talk-colleague-more-ico'}
                  aria-hidden
                />
                {showAll ? 'Réduire' : `Voir plus (${others.length})`}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}
