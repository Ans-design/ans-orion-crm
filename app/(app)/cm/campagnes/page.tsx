'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Megaphone,
  Loader2,
  Plus,
  ChevronDown,
  ChevronUp,
  Instagram,
  Facebook,
  Music2,
  Linkedin,
  Layers,
  CalendarClock,
  Radio,
} from 'lucide-react';
import {
  AppButton,
  AppPageHeader,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';
import { CAMPAIGN_PLATFORMS, CAMPAIGN_STATUTS, POST_STATUTS } from '@/lib/constants/cm';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import type { LucideIcon } from 'lucide-react';

type Post = { id: string; titre: string; platform: string; statut: string; scheduledAt: string | null };
type Campaign = {
  id: string;
  name: string;
  platform: string;
  statut: string;
  objectif: string | null;
  client?: { name: string } | null;
  posts: Post[];
  _count: { posts: number };
};

type CmStats = { campagnesActives: number; postsAPlanifier: number };

const PLATFORM_ICON: Record<string, LucideIcon> = {
  Instagram,
  Facebook,
  TikTok: Music2,
  LinkedIn: Linkedin,
  Multi: Layers,
  YouTube: Radio,
};

function platformIcon(platform: string): LucideIcon {
  return PLATFORM_ICON[platform] ?? Megaphone;
}

export default function CmCampagnesPage() {
  return (
    <Suspense fallback={<AppListSkeleton rows={4} />}>
      <CmCampagnesPageInner />
    </Suspense>
  );
}

function CmCampagnesPageInner() {
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CmStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filtre, setFiltre] = useState('tous');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Campaign | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', platform: 'Multi', objectif: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(false);
    const q = filtre !== 'tous' ? `?statut=${encodeURIComponent(filtre)}` : '';
    Promise.all([
      fetch(`/api/cm/campagnes${q}`).then(async (r) => {
        if (!r.ok) throw new Error('campagnes');
        return r.json();
      }),
      fetch('/api/cm/campagnes?stats=1').then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      }),
    ])
      .then(([list, st]) => {
        setCampaigns(Array.isArray(list) ? list : []);
        if (st) setStats(st);
      })
      .catch(() => {
        setLoadError(true);
        setCampaigns([]);
      })
      .finally(() => setLoading(false));
  }, [filtre]);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = async (id: string) => {
    if (expanded === id) {
      setExpanded(null);
      setDetail(null);
      return;
    }
    setExpanded(id);
    const res = await fetch(`/api/cm/campagnes/${id}`);
    if (res.ok) setDetail(await res.json());
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/cm/campagnes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: '', platform: 'Multi', objectif: '' });
        setShowForm(false);
        load();
      }
    } finally {
      setSaving(false);
    }
  };

  const updatePostStatut = async (campaignId: string, postId: string, statut: string) => {
    await fetch(`/api/cm/campagnes/${campaignId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ postId, statut }),
    });
    const res = await fetch(`/api/cm/campagnes/${campaignId}`);
    if (res.ok) setDetail(await res.json());
    load();
  };

  const planifiees = useMemo(
    () => campaigns.filter((c) => c.statut === 'Planifiée').length,
    [campaigns],
  );
  const brouillons = useMemo(
    () => campaigns.filter((c) => c.statut === 'Brouillon').length,
    [campaigns],
  );

  return (
    <div className="cm-campagnes-page dashboard-full">
      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      {commandeId && (
        <p className="text-xs text-muted-foreground m-0">
          Contexte commande —{' '}
          <Link href={`/commandes/${commandeId}`} className="text-primary font-semibold hover:underline">
            dossier 360° →
          </Link>
          {' · '}
          <Link href={`/cm/notifications?commande=${commandeId}`} className="text-primary hover:underline">
            Notifications
          </Link>
          {' · '}
          <Link href={`/cm/relances?commande=${commandeId}`} className="text-primary hover:underline">
            Relances
          </Link>
        </p>
      )}

      <AppPageHeader
        title="Campagnes CM"
        description="Facebook · Instagram · TikTok — planning social"
        icon={Megaphone}
        actions={
          <AppButton type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus size={14} />
            {showForm ? 'Fermer' : 'Nouvelle campagne'}
          </AppButton>
        }
      />

      <div className="cm-campagnes-kpi">
        <AppKpiCard
          label="Actives"
          value={stats?.campagnesActives ?? 0}
          icon={Megaphone}
          tone="success"
        />
        <AppKpiCard
          label="Posts à planifier"
          value={stats?.postsAPlanifier ?? 0}
          icon={CalendarClock}
          tone="info"
        />
        <AppKpiCard label="Planifiées" value={planifiees} icon={Layers} tone="warning" />
        <AppKpiCard label="Brouillons" value={brouillons} icon={Radio} tone="neutral" />
      </div>

      {showForm && (
        <form onSubmit={submit} className="cm-campagnes-composer">
          <input
            required
            placeholder="Nom campagne"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            aria-label="Nom de la campagne"
          />
          <select
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value })}
            aria-label="Plateforme"
          >
            {CAMPAIGN_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            placeholder="Objectif"
            value={form.objectif}
            onChange={(e) => setForm({ ...form, objectif: e.target.value })}
            aria-label="Objectif"
          />
          <AppButton type="submit" size="sm" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Créer
          </AppButton>
        </form>
      )}

      <div className="cm-campagnes-toolbar">
        <h2>
          {campaigns.length} campagne{campaigns.length > 1 ? 's' : ''}
        </h2>
        <div className="cm-campagnes-filters" role="tablist" aria-label="Filtrer par statut">
          <button
            type="button"
            role="tab"
            aria-selected={filtre === 'tous'}
            className={`cm-campagnes-filter${filtre === 'tous' ? ' is-active' : ''}`}
            onClick={() => setFiltre('tous')}
          >
            Toutes
          </button>
          {CAMPAIGN_STATUTS.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={filtre === s}
              className={`cm-campagnes-filter${filtre === s ? ' is-active' : ''}`}
              onClick={() => setFiltre(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : loadError ? (
        <AppEmptyState
          icon={Megaphone}
          title="Chargement impossible"
          description="Réessayez ou vérifiez la connexion API."
          action={
            <AppButton type="button" size="sm" onClick={load}>
              Réessayer
            </AppButton>
          }
        />
      ) : campaigns.length === 0 ? (
        <AppEmptyState
          icon={Megaphone}
          title="Aucune campagne"
          description="Créez une campagne pour démarrer le planning social."
          action={
            <AppButton type="button" size="sm" onClick={() => setShowForm(true)}>
              <Plus size={14} /> Nouvelle campagne
            </AppButton>
          }
        />
      ) : (
        <div className="cm-campagnes-grid">
          {campaigns.map((c) => {
            const Icon = platformIcon(c.platform);
            const isOpen = expanded === c.id && detail?.id === c.id;
            return (
              <article
                key={c.id}
                className={`cm-campagne-card${isOpen ? ' is-expanded' : ''}`}
                data-statut={c.statut}
              >
                <button
                  type="button"
                  className="cm-campagne-card__btn"
                  onClick={() => openDetail(c.id)}
                  aria-expanded={isOpen}
                >
                  <span className="cm-campagne-card__icon" data-platform={c.platform} aria-hidden>
                    <Icon size={16} strokeWidth={2} />
                  </span>
                  <span className="cm-campagne-card__body">
                    <span className="cm-campagne-card__top">
                      <h3 className="cm-campagne-card__name">{c.name}</h3>
                      {isOpen ? (
                        <ChevronUp size={16} className="cm-campagne-card__chev" />
                      ) : (
                        <ChevronDown size={16} className="cm-campagne-card__chev" />
                      )}
                    </span>
                    <span className="cm-campagne-card__meta">
                      {c._count.posts} post{c._count.posts > 1 ? 's' : ''} ·{' '}
                      {c.client?.name ?? 'Interne ANS'}
                    </span>
                    <span className="cm-campagne-card__chips">
                      <span className="cm-campagne-pill" data-statut={c.statut}>
                        {c.statut}
                      </span>
                      <span className="cm-campagne-pill cm-campagne-pill--plat">{c.platform}</span>
                    </span>
                  </span>
                </button>

                {isOpen && (
                  <div className="cm-campagne-detail">
                    {detail.objectif ? (
                      <p className="cm-campagne-detail__obj">{detail.objectif}</p>
                    ) : null}
                    {detail.posts.map((p) => (
                      <div key={p.id} className="cm-campagne-post">
                        <span className="cm-campagne-post__title">{p.titre}</span>
                        <span className="cm-campagne-post__plat">{p.platform}</span>
                        <select
                          value={p.statut}
                          onChange={(e) => updatePostStatut(c.id, p.id, e.target.value)}
                          aria-label={`Statut du post ${p.titre}`}
                        >
                          {POST_STATUTS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                    {detail.posts.length === 0 ? (
                      <p className="cm-campagne-empty-posts">Aucun post planifié</p>
                    ) : null}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
