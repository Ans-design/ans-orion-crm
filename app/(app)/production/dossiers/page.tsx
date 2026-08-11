'use client';

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react';
import {
  Factory, AlertTriangle, ChevronDown, ChevronUp, FileDown, MessageCircle,
  FolderKanban, Play, Ban, Clock,
} from 'lucide-react';
import { DOSSIER_STATUTS, ETAPE_STATUTS, deriveGpaoAuditStatut } from '@/lib/constants/gpao-dossier';
import { CommandeDeepLinkBanner } from '@/components/commandes/commande-deep-link-banner';
import { useCommandeDeepLink } from '@/lib/hooks/use-commande-deep-link';
import { FlowPageBanner } from '@/components/flow/flow-page-banner';
import { AppPageHeader, AppEmptyState, AppRouteLoading, AppKpiCard, AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { GpaoDossierStepper } from '@/components/production/gpao-dossier-stepper';
import { resolveGpaoEtapeModuleLink } from '@/lib/gpao/gpao-module-links';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { cn } from '@/lib/utils';
import { unwrapListItems, unwrapApiData } from '@/lib/api-client';
import { uxToast } from '@/lib/ux/feedback';

type Etape = {
  id: string;
  ordre: number;
  nom: string;
  statut: string;
  dureeMin: number | null;
};

type Dossier = {
  id: string;
  statutGlobal: string;
  avancement: number;
  priorite: string;
  tempsEstimeMin: number;
  tempsReelMin: number;
  delai: string | null;
  commandeId?: string | null;
  commande: { id?: string; numero: string; article: string; client?: { name: string } };
  talkConversation?: { id: string; name: string } | null;
  etapes: Etape[];
  incidents: { id: string; title: string; severity: string }[];
  _count: { incidents: number };
};

type GpaoStats = { total: number; enCours: number; bloques: number; incidentsOuverts: number; enRetard: number };

function dossierTone(statut: string): string {
  const s = statut.toLowerCase();
  if (s.includes('bloq') || s.includes('retard') || s.includes('annul')) return 'danger';
  if (s.includes('prod') || s.includes('cours') || s.includes('prépa')) return 'run';
  if (s.includes('prêt') || s.includes('livré')) return 'ok';
  if (s.includes('bat') || s.includes('attente')) return 'gold';
  return 'neutral';
}

export default function ProductionDossiersPage() {
  return (
    <Suspense fallback={<AppRouteLoading message="Chargement dossiers GPAO…" hint="Synchronisation des étapes atelier" />}>
      <ProductionDossiersInner />
    </Suspense>
  );
}

function ProductionDossiersInner() {
  const { commandeId, info: commandeInfo } = useCommandeDeepLink();
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [stats, setStats] = useState<GpaoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState('tous');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'statut' | 'avancement' | 'numero'>('statut');

  const load = useCallback(() => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filtre !== 'tous') p.set('statut', filtre);
    if (commandeId) p.set('commande', commandeId);
    p.set('page', String(page));
    p.set('pageSize', '25');
    const q = p.toString() ? `?${p}` : '';
    Promise.all([
      fetch(`/api/production/dossiers${q}`).then((r) => (r.ok ? r.json() : { items: [] })),
      fetch('/api/production/dossiers?stats=1').then((r) => (r.ok ? r.json() : null)),
    ]).then(([list, st]) => {
      if (Array.isArray(list)) {
        setDossiers(list);
        setTotalPages(1);
      } else {
        const items = unwrapListItems<Dossier>(list);
        setDossiers(items.length ? items : (Array.isArray(list?.items) ? list.items : []));
        setTotalPages(Number(list?.totalPages) || 1);
      }
      if (st) setStats(unwrapApiData<GpaoStats>(st) ?? st);
    }).catch(() => {
      setDossiers([]);
      uxToast.error('Impossible de charger les dossiers GPAO');
    }).finally(() => setLoading(false));
  }, [filtre, commandeId, page]);

  useEffect(() => { setPage(1); }, [filtre, commandeId]);
  useEffect(() => { load(); }, [load]);

  const sortedDossiers = useMemo(() => {
    const list = [...dossiers];
    if (sortBy === 'avancement') {
      list.sort((a, b) => b.avancement - a.avancement);
    } else if (sortBy === 'numero') {
      list.sort((a, b) => a.commande.numero.localeCompare(b.commande.numero, 'fr'));
    } else {
      list.sort((a, b) => {
        const rank = (s: string) => {
          const x = s.toLowerCase();
          if (x.includes('bloq') || x.includes('retard')) return 0;
          if (x.includes('cours') || x.includes('prod')) return 1;
          if (x.includes('nouveau') || x.includes('attente')) return 2;
          return 3;
        };
        return rank(a.statutGlobal) - rank(b.statutGlobal) || b.avancement - a.avancement;
      });
    }
    return list;
  }, [dossiers, sortBy]);

  const updateEtape = async (dossierId: string, etapeId: string, statut: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/production/dossiers/${dossierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapeId, statut }),
      });
      if (res.ok) {
        uxToast.success('Étape mise à jour');
        load();
      } else uxToast.error('Mise à jour étape impossible');
    } finally {
      setActing(false);
    }
  };

  const createTalkDossier = async (dossierId: string) => {
    setActing(true);
    try {
      const res = await fetch('/api/messaging/conversations/create-from-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dossierId }),
      });
      if (res.ok) {
        uxToast.success('Conversation Talk créée');
        load();
      } else uxToast.error('Création Talk impossible');
    } finally {
      setActing(false);
    }
  };

  const reportIncident = async (dossierId: string) => {
    const title = window.prompt('Titre de l\'incident :');
    if (!title?.trim()) return;
    setActing(true);
    try {
      await fetch('/api/production/dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'incident', dossierId, title: title.trim() }),
      });
      uxToast.success('Incident signalé');
      load();
    } finally {
      setActing(false);
    }
  };

  const resolveIncident = async (dossierId: string, incidentId: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/production/dossiers/${dossierId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolveIncidentId: incidentId }),
      });
      if (res.ok) {
        uxToast.success('Incident résolu');
        load();
      }
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="gpao-dossiers-page">
      <AppPageHeader
        title="Dossiers production GPAO"
        description="16 étapes standard — synchronisés aux commandes Orion"
        icon={Factory}
      />

      {commandeInfo && <CommandeDeepLinkBanner info={commandeInfo} />}
      <FlowPageBanner
        entity="production"
        status={filtre === 'tous' ? 'En cours' : filtre}
        impactedModules={['GPAO', 'Stock', 'Commandes', 'Qualité']}
      />

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          <AppKpiCard label="Total dossiers" value={stats.total} icon={FolderKanban} tone="brand" onClick={() => setFiltre('tous')} />
          <AppKpiCard label="En cours" value={stats.enCours} icon={Play} tone="info" onClick={() => setFiltre('En production')} />
          <AppKpiCard label="Bloqués" value={stats.bloques} icon={Ban} tone="danger" onClick={() => setFiltre('Bloqué')} />
          <AppKpiCard label="Incidents" value={stats.incidentsOuverts} icon={AlertTriangle} tone="gold" onClick={() => setFiltre('tous')} />
          <AppKpiCard label="En retard" value={stats.enRetard} icon={Clock} tone="warning" onClick={() => setFiltre('En retard')} />
        </div>
      )}

      <div className="gpao-dossiers-toolbar orion-filter-toolbar">
        <select
          value={filtre}
          onChange={(e) => setFiltre(e.target.value)}
          className="orion-filter-select"
          aria-label="Filtrer par statut"
        >
          <option value="tous">Tous les statuts</option>
          {DOSSIER_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="orion-filter-select"
          aria-label="Trier les dossiers"
        >
          <option value="statut">Trier : priorité statut</option>
          <option value="avancement">Trier : avancement</option>
          <option value="numero">Trier : n° commande</option>
        </select>
      </div>

      {loading ? (
        <LoadingState message="Chargement des dossiers…" size="sm" />
      ) : sortedDossiers.length === 0 ? (
        <AppEmptyState title="Aucun dossier GPAO" description="Les dossiers apparaissent lorsque des commandes entrent en production." />
      ) : (
        <div className="gpao-dossiers-grid">
          {sortedDossiers.map((d) => {
            const tone = dossierTone(d.statutGlobal);
            const isOpen = expanded === d.id;
            const cmdId = d.commandeId || d.commande?.id || commandeId || null;
            return (
              <article
                key={d.id}
                className={cn('gpao-dossier-card', `gpao-dossier-card--${tone}`, isOpen && 'gpao-dossier-card--open')}
              >
                <button
                  type="button"
                  className="gpao-dossier-card__head"
                  onClick={() => setExpanded(isOpen ? null : d.id)}
                  aria-expanded={isOpen}
                >
                  <div className="gpao-dossier-card__top">
                    <span className="gpao-dossier-card__num">{d.commande.numero}</span>
                    <span className={cn('gpao-dossier-status', statusBadgeClass(d.statutGlobal))}>
                      {d.statutGlobal}
                    </span>
                    {isOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                  </div>
                  <h3 className="gpao-dossier-card__title">{d.commande.article}</h3>
                  <p className="gpao-dossier-card__client">{d.commande.client?.name ?? 'Client —'}</p>
                  <div className="gpao-dossier-card__meta">
                    <span>{d.avancement}%</span>
                    <span>{d.tempsReelMin}/{d.tempsEstimeMin} min</span>
                    <span className="gpao-dossier-card__audit">{deriveGpaoAuditStatut(d.etapes)}</span>
                    {d._count.incidents > 0 && (
                      <span className="gpao-dossier-card__inc">
                        <AlertTriangle size={11} aria-hidden /> {d._count.incidents}
                      </span>
                    )}
                  </div>
                  <div className="gpao-dossier-card__bar" aria-hidden>
                    <div style={{ width: `${Math.max(0, Math.min(100, d.avancement))}%` }} />
                  </div>
                  {!isOpen && <GpaoDossierStepper etapes={d.etapes} compact commandeId={cmdId} />}
                </button>

                <div className="gpao-dossier-card__quick">
                  {cmdId ? (
                    <a href={`/commandes/${cmdId}`} className="gpao-dossier-chip" onClick={(e) => e.stopPropagation()}>
                      <Factory size={11} /> Commande
                    </a>
                  ) : null}
                  <a
                    href={`/api/production/dossiers/${d.id}/fiche-fabrication`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gpao-dossier-chip"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileDown size={11} /> Fiche
                  </a>
                  {d.talkConversation ? (
                    <a href={`/messagerie?conv=${d.talkConversation.id}`} className="gpao-dossier-chip gpao-dossier-chip--talk" onClick={(e) => e.stopPropagation()}>
                      <MessageCircle size={11} /> Talk
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled={acting}
                      onClick={(e) => { e.stopPropagation(); void createTalkDossier(d.id); }}
                      className="gpao-dossier-chip gpao-dossier-chip--dashed"
                    >
                      <MessageCircle size={11} /> Créer Talk
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div className="gpao-dossier-card__detail">
                    <GpaoDossierStepper etapes={d.etapes} commandeId={cmdId} />
                    <div className="gpao-dossier-card__actions">
                      <AppButton type="button" size="sm" variant="outline" onClick={() => window.open(`/api/production/dossiers/${d.id}/fiche-fabrication`, '_blank')}>
                        <FileDown size={12} /> Imprimer fiche
                      </AppButton>
                      <AppButton type="button" size="sm" variant="outline" disabled={acting} onClick={() => reportIncident(d.id)}>
                        <AlertTriangle size={12} /> Signaler incident
                      </AppButton>
                    </div>

                    {d.incidents?.length > 0 && (
                      <div className="gpao-dossier-incidents">
                        <p className="gpao-section-lab">Incidents ouverts</p>
                        {d.incidents.map((inc) => (
                          <div key={inc.id} className="gpao-incident-row">
                            <span>{inc.title} <em>({inc.severity})</em></span>
                            <AppButton type="button" size="sm" disabled={acting} onClick={() => resolveIncident(d.id, inc.id)}>
                              Résoudre
                            </AppButton>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="gpao-section-lab">Étapes — modules liés</p>
                    <div className="gpao-etapes-grid">
                      {d.etapes.map((e) => {
                        const mod = resolveGpaoEtapeModuleLink(e.nom, { commandeId: cmdId });
                        return (
                          <div key={e.id} className="gpao-etape-row">
                            <span className="gpao-etape-row__ord">{e.ordre}</span>
                            <div className="gpao-etape-row__main">
                              <span className="gpao-etape-row__name">{e.nom}</span>
                              <a href={mod.href} className="gpao-etape-row__mod" title={`Ouvrir ${mod.label}`}>
                                → {mod.label}
                              </a>
                            </div>
                            <select
                              value={e.statut}
                              disabled={acting}
                              onChange={(ev) => updateEtape(d.id, e.id, ev.target.value)}
                              className="orion-filter-select gpao-etape-row__select"
                            >
                              {ETAPE_STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                            {e.dureeMin != null && <span className="gpao-etape-row__dur">{e.dureeMin} min</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="gpao-dossiers-pager">
          <AppButton type="button" size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Précédent
          </AppButton>
          <span>Page {page} / {totalPages}</span>
          <AppButton type="button" size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            Suivant
          </AppButton>
        </div>
      )}
    </div>
  );
}
