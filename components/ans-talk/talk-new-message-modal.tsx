'use client';

import { useEffect, useState } from 'react';
import {
  Megaphone, Users, User, Package, X, ChevronLeft, Search, Check,
} from 'lucide-react';
import type { TalkUser } from '@/lib/hooks/use-ans-talk';
import { unwrapListItems } from '@/lib/api-client';
import { avatarColor, initials, roleLabel } from './ans-talk-utils';

type View = 'pick' | 'private' | 'group' | 'order';

type Props = {
  open: boolean;
  initialView?: View;
  users: TalkUser[];
  onClose: () => void;
  onCreatePrivate: (userId: string) => Promise<string | null>;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<string | null>;
  onCreateOrder: (commandeId: string) => Promise<string | null>;
  onOpenAnnonces: () => void;
};

type CommandeRow = { id: string; numero?: string; clientName?: string };

const PICK_OPTIONS: {
  id: View | 'annonces';
  title: string;
  desc: string;
  icon: typeof User;
  tone: 'brand' | 'info' | 'gold' | 'accent';
}[] = [
  { id: 'private', title: 'Message privé', desc: 'Discussion directe avec un collègue', icon: User, tone: 'brand' },
  { id: 'group', title: 'Groupe', desc: 'Canal partagé pour une équipe', icon: Users, tone: 'info' },
  { id: 'order', title: 'Dossier commande', desc: 'Lier le chat à une commande', icon: Package, tone: 'gold' },
  { id: 'annonces', title: 'Annonce interne', desc: 'Publier sur le fil d’actualité', icon: Megaphone, tone: 'accent' },
];

export function TalkNewMessageModal({
  open,
  initialView = 'pick',
  users,
  onClose,
  onCreatePrivate,
  onCreateGroup,
  onCreateOrder,
  onOpenAnnonces,
}: Props) {
  const [view, setView] = useState<View>(initialView);
  const [groupName, setGroupName] = useState('');
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [orderQuery, setOrderQuery] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [orderResults, setOrderResults] = useState<CommandeRow[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setView(initialView);
      setUserQuery('');
    }
  }, [open, initialView]);

  useEffect(() => {
    if (!open || view !== 'order') return;
    const q = orderQuery.trim();
    if (q.length < 2) {
      setOrderResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setOrderLoading(true);
      try {
        const r = await fetch(
          `/api/commandes?search=${encodeURIComponent(q)}&paginated=1&pageSize=12`,
          { credentials: 'include', cache: 'no-store' },
        );
        if (!r.ok) return;
        setOrderResults(unwrapListItems<CommandeRow>(await r.json()));
      } finally {
        setOrderLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [open, view, orderQuery]);

  if (!open) return null;

  const resetAndClose = () => {
    setView('pick');
    setGroupName('');
    setGroupMembers([]);
    setOrderQuery('');
    setOrderResults([]);
    setUserQuery('');
    setBusy(false);
    onClose();
  };

  const createGroup = async () => {
    if (!groupName.trim() || busy) return;
    setBusy(true);
    try {
      const id = await onCreateGroup(groupName.trim(), groupMembers);
      if (id) resetAndClose();
    } finally {
      setBusy(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      roleLabel(u.role).toLowerCase().includes(q)
    );
  });

  const titles: Record<View, string> = {
    pick: 'Nouveau message',
    private: 'Message privé',
    group: 'Créer un groupe',
    order: 'Dossier commande',
  };

  return (
    <div className="talk-modal-backdrop" onClick={resetAndClose} role="presentation">
      <div
        className="talk-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="talk-new-msg-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="talk-modal-head">
          <div className="min-w-0">
            {view !== 'pick' && (
              <button type="button" className="talk-modal-back" onClick={() => setView('pick')}>
                <ChevronLeft size={14} strokeWidth={2.2} />
                Retour
              </button>
            )}
            <div className="talk-modal-eyebrow">ANS Talk</div>
            <h3 id="talk-new-msg-title">{titles[view]}</h3>
            {view === 'pick' && (
              <p className="talk-modal-sub">Choisissez le type de conversation à ouvrir</p>
            )}
          </div>
          <button type="button" className="talk-icon-btn" onClick={resetAndClose} aria-label="Fermer">
            <X size={15} />
          </button>
        </header>

        <div className="talk-modal-body">
          {view === 'pick' && (
            <div className="talk-new-type-grid">
              {PICK_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`talk-new-type-card talk-new-type-card--${opt.tone}`}
                    onClick={() => {
                      if (opt.id === 'annonces') {
                        onOpenAnnonces();
                        resetAndClose();
                        return;
                      }
                      setView(opt.id);
                    }}
                  >
                    <span className="talk-new-type-icon" aria-hidden>
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <span className="talk-new-type-copy">
                      <strong>{opt.title}</strong>
                      <small>{opt.desc}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {view === 'private' && (
            <>
              <label className="talk-search talk-modal-search">
                <Search size={15} strokeWidth={1.8} aria-hidden />
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Rechercher un collègue…"
                  aria-label="Rechercher un collègue"
                />
              </label>
              <div className="talk-modal-list">
                {filteredUsers.length === 0 && (
                  <p className="talk-modal-empty">Aucun utilisateur trouvé</p>
                )}
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="talk-modal-person"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const id = await onCreatePrivate(u.id);
                        if (id) resetAndClose();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <span
                      className="talk-avatar"
                      style={{ background: avatarColor(u.id), width: 36, height: 36, fontSize: 11, borderRadius: 7 }}
                    >
                      {initials(u.name || u.email || '?')}
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <strong className="block truncate text-[12px] font-extrabold text-[var(--talk-ink)]">
                        {u.name || u.email}
                      </strong>
                      <small className="text-[10px] text-[var(--talk-muted)]">{roleLabel(u.role)}</small>
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {view === 'group' && (
            <>
              <input
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nom du groupe"
                className="talk-input talk-modal-field"
              />
              <p className="talk-modal-section-label">Membres ({groupMembers.length})</p>
              <div className="talk-modal-list talk-modal-list--short">
                {users.map((u) => {
                  const checked = groupMembers.includes(u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      className={`talk-modal-person${checked ? ' is-selected' : ''}`}
                      onClick={() =>
                        setGroupMembers((prev) =>
                          checked ? prev.filter((id) => id !== u.id) : [...prev, u.id],
                        )
                      }
                    >
                      <span
                        className="talk-avatar"
                        style={{ background: avatarColor(u.id), width: 36, height: 36, fontSize: 11, borderRadius: 7 }}
                      >
                        {initials(u.name || u.email || '?')}
                      </span>
                      <span className="min-w-0 flex-1 text-left">
                        <strong className="block truncate text-[12px] font-extrabold text-[var(--talk-ink)]">
                          {u.name || u.email}
                        </strong>
                        <small className="text-[10px] text-[var(--talk-muted)]">{roleLabel(u.role)}</small>
                      </span>
                      <span className={`talk-modal-check${checked ? ' is-on' : ''}`} aria-hidden>
                        {checked ? <Check size={12} strokeWidth={2.4} /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={createGroup}
                disabled={!groupName.trim() || busy}
                className="talk-btn-primary talk-modal-cta disabled:opacity-40"
              >
                Créer le groupe
              </button>
            </>
          )}

          {view === 'order' && (
            <>
              <label className="talk-search talk-modal-search">
                <Search size={15} strokeWidth={1.8} aria-hidden />
                <input
                  value={orderQuery}
                  onChange={(e) => setOrderQuery(e.target.value)}
                  placeholder="Rechercher CMD ou client…"
                  aria-label="Rechercher une commande"
                />
              </label>
              <div className="talk-modal-list">
                {orderLoading && <p className="talk-modal-empty">Recherche…</p>}
                {!orderLoading && orderQuery.trim().length >= 2 && orderResults.length === 0 && (
                  <p className="talk-modal-empty">Aucune commande trouvée</p>
                )}
                {!orderLoading && orderQuery.trim().length < 2 && (
                  <p className="talk-modal-empty">Saisissez au moins 2 caractères</p>
                )}
                {orderResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="talk-modal-person"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        const id = await onCreateOrder(c.id);
                        if (id) resetAndClose();
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <span className="talk-new-type-icon talk-new-type-icon--gold" aria-hidden>
                      <Package size={16} strokeWidth={1.9} />
                    </span>
                    <span className="min-w-0 flex-1 text-left">
                      <strong className="block truncate text-[12px] font-extrabold text-[var(--talk-ink)]">
                        {c.numero || c.id}
                      </strong>
                      {c.clientName ? (
                        <small className="text-[10px] text-[var(--talk-muted)]">{c.clientName}</small>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
