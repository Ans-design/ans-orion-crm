'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Activity, User, Clock, Shield, X, ExternalLink } from 'lucide-react';
import {
  AppPageHeader, AppEmptyState, AppListSkeleton, AppSearchBar,
} from '@/components/ui/app-ui';
import { AUDIT_ACTION_BADGE, AUDIT_ENTITY_COLOR } from '@/lib/ui/status-styles';
import { formatDateTimeFR } from '@/lib/formatters';
import { fetchWithTimeout } from '@/lib/fetch-with-timeout';

const ENTITIES = ['Client', 'Devis', 'Commande', 'Production', 'Facture', 'Paiement', 'Livraison', 'Tarif', 'Proof', 'Employee', 'MaintenanceTicket', 'User', 'Session'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'STATUS_CHANGE', 'ACCEPT', 'LOGIN', 'LOGIN_FAILED', 'PASSWORD_RESET_REQUEST', 'MERGE'];
const ACTION_LABELS: Record<string, string> = {
  CREATE: 'Création', UPDATE: 'Modification', DELETE: 'Suppression',
  STATUS_CHANGE: 'Chgt statut', ACCEPT: 'Acceptation', LOGIN: 'Connexion réussie',
  LOGIN_FAILED: 'Échec connexion', PASSWORD_RESET_REQUEST: 'Reset MDP demandé',
  MERGE: 'Fusion', EXPORT: 'Export',
};

type AuditCategory = '' | 'connexions' | 'metier';

type AuditLog = {
  id: string;
  action: string;
  entity: string;
  entityId?: string | null;
  entityLabel?: string | null;
  userName?: string | null;
  createdAt: string;
};

export default function HistoriquePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const commandeFilter = searchParams.get('commande')?.trim() || '';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterEntity, setFilterEntity] = useState(commandeFilter ? 'Commande' : '');
  const [filterAction, setFilterAction] = useState('');
  const [category, setCategory] = useState<AuditCategory>('');
  const [offset, setOffset] = useState(0);
  const limit = 30;
  const [loadError, setLoadError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setOffset(0);
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    if (commandeFilter) {
      setFilterEntity('Commande');
      setOffset(0);
    }
  }, [commandeFilter]);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setLoadError(null);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (commandeFilter) {
        p.set('commande', commandeFilter);
      } else if (filterEntity) {
        p.set('entity', filterEntity);
      }
      if (filterAction) p.set('action', filterAction);
      if (category) p.set('category', category);
      p.set('limit', String(limit));
      p.set('offset', String(offset));
      const r = await fetchWithTimeout(`/api/audit?${p}`, {
        timeout: 12_000,
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      if (r.ok) {
        const d = await r.json();
        setLogs(d.logs ?? []);
        setTotal(d.total ?? 0);
      } else {
        setLogs([]);
        setTotal(0);
        setLoadError('Impossible de charger l\'historique');
      }
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return;
      setLogs([]);
      setTotal(0);
      setLoadError('Délai dépassé — réessayez');
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, [search, filterEntity, filterAction, category, offset, commandeFilter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const clearCommandeFilter = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete('commande');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
    setFilterEntity('');
    setOffset(0);
  };

  const setPreset = (preset: AuditCategory) => {
    setCategory(preset);
    setFilterAction('');
    setOffset(0);
  };

  const activeFilterLabel = useMemo(() => {
    if (commandeFilter) return `Commande ${commandeFilter}`;
    return null;
  }, [commandeFilter]);

  return (
    <div className="orion-page">
      <AppPageHeader
        icon={History}
        title="Historique & Audit"
        description="Journal connexions, créations, modifications et paiements"
      />

      {activeFilterLabel ? (
        <div className="flex flex-wrap items-center gap-2 rounded-[7px] border border-border bg-muted/40 px-3 py-2 text-sm">
          <span>Filtre actif : <strong>{activeFilterLabel}</strong></span>
          <button
            type="button"
            onClick={clearCommandeFilter}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
          >
            <X size={12} /> Effacer le filtre
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setPreset('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${!category ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}
        >
          Tout
        </button>
        <button
          type="button"
          onClick={() => setPreset('connexions')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${category === 'connexions' ? 'bg-purple-500/15 text-purple-600 border-purple-500/40' : 'border-border'}`}
        >
          <Shield size={12} /> Connexions & sécurité
        </button>
        <button
          type="button"
          onClick={() => setPreset('metier')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 ${category === 'metier' ? 'bg-primary/15 text-primary border-primary/40' : 'border-border'}`}
        >
          <Activity size={12} /> Métier
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <AppSearchBar
          value={searchInput}
          onChange={(v) => { setSearchInput(v); }}
          placeholder="Rechercher utilisateur, entité…"
        />
        <select
          value={commandeFilter ? 'Commande' : filterEntity}
          onChange={(e) => {
            if (commandeFilter) clearCommandeFilter();
            setFilterEntity(e.target.value);
            setOffset(0);
          }}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
          disabled={!!commandeFilter}
        >
          <option value="">Toutes les entités</option>
          {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={filterAction}
          onChange={(e) => { setFilterAction(e.target.value); setCategory(''); setOffset(0); }}
          className="bg-card border border-border rounded-lg px-3 py-2 text-sm"
          disabled={!!category}
        >
          <option value="">Toutes les actions</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{ACTION_LABELS[a] ?? a}</option>)}
        </select>
      </div>

      <div className="text-xs text-muted-foreground">{total} entrée{total !== 1 ? 's' : ''} au total</div>

      {loadError ? (
        <AppEmptyState icon={History} title={loadError} description="Vérifiez la connexion ou réessayez dans quelques instants." />
      ) : loading ? (
        <AppListSkeleton rows={8} />
      ) : logs.length === 0 ? (
        <AppEmptyState
          icon={History}
          title="Aucune activité enregistrée"
          description="Les créations, modifications et paiements apparaîtront automatiquement ici."
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {logs.map((log, i) => {
              const isCommande = log.entity === 'Commande' && !!log.entityId;
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.2) }}
                  className="flex items-start gap-3 p-3 rounded-[7px] border border-border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    {log.action === 'LOGIN' || log.action === 'LOGIN_FAILED' ? <Shield size={16} /> : <Activity size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${AUDIT_ACTION_BADGE[log.action] ?? 'bg-muted text-muted-foreground'}`}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className={`text-xs font-semibold ${AUDIT_ENTITY_COLOR[log.entity] ?? 'text-foreground'}`}>{log.entity}</span>
                      {log.entityLabel && <span className="text-xs text-muted-foreground truncate">{log.entityLabel}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><User size={10} />{log.userName || 'Système'}</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{formatDateTimeFR(log.createdAt)}</span>
                    </div>
                  </div>
                  {isCommande ? (
                    <Link
                      href={`/commandes/${log.entityId}`}
                      className="inline-flex items-center gap-1 shrink-0 text-xs font-semibold text-[var(--brand-primary)] hover:underline"
                      aria-label={`Ouvrir la commande ${log.entityLabel || log.entityId}`}
                    >
                      Dossier <ExternalLink size={12} aria-hidden />
                    </Link>
                  ) : null}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {total > limit && (
        <div className="flex justify-center gap-2 pt-4">
          <button disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - limit))} className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]">Précédent</button>
          <button disabled={offset + limit >= total} onClick={() => setOffset(offset + limit)} className="px-4 py-2 rounded-lg border border-border text-sm disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]">Suivant</button>
        </div>
      )}
    </div>
  );
}
