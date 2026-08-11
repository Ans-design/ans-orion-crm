'use client';

import { useCallback, useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  ChevronDown, ChevronRight, GitCompare, Play, RefreshCw,
} from 'lucide-react';
import { formatPriceAr } from '@/lib/data/catalogue';
import { PricingArticlesWorkspace } from '@/components/admin/pricing-v4/pricing-articles-workspace';
import { adminStatusFilterLabel, adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type ProfileSummary = {
  articleId: string;
  articleLabel: string;
  family: string;
  calculationType: string;
  status: string;
  prixBase: number | null;
};

type CompareRow = {
  articleId: string;
  legacyUnit: number | null;
  dynamicUnit: number | null;
  deltaUnit: number | null;
  deltaPercent: number | null;
  hasProfile: boolean;
  isPublished: boolean;
  migrationReady: boolean;
  migrationReason: string;
};

type Props = {
  canEdit: boolean;
  initialArticleId?: string | null;
  /** Affiche uniquement le comparateur migration (onglet PRIX 2026 V4) */
  migrationOnly?: boolean;
};

export function AdminControlDynamicPricingTab({ canEdit, initialArticleId, migrationOnly }: Props) {
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [compareRows, setCompareRows] = useState<CompareRow[] | null>(null);
  const [comparing, setComparing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [showCompare, setShowCompare] = useState(true);
  const [readyCount, setReadyCount] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/dynamic-pricing');
      const d = await r.json();
      if (r.ok) {
        setProfiles(d.profiles || []);
        setStats(d.stats || null);
      }
    } catch {
      uxToast.error('Erreur chargement tarification dynamique');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (initialArticleId) setSelectedId(initialArticleId);
    else if (!selectedId && profiles.length) setSelectedId(profiles[0].articleId);
  }, [profiles, selectedId, initialArticleId]);

  const sync = async () => {
    if (!canEdit) return;
    setSyncing(true);
    try {
      const r = await fetch('/api/dynamic-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success(`Sync OK — ${d.profiles} profils`);
        load();
      } else uxToast.error(getApiErrorMessage(d, 'Sync échouée'), 'Sync échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setSyncing(false);
  };

  const runPilotCompare = async () => {
    setComparing(true);
    try {
      const r = await fetch('/api/dynamic-pricing/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pilot' }),
      });
      const d = await r.json();
      if (r.ok) {
        setCompareRows(d.rows || []);
        setReadyCount(typeof d.readyCount === 'number' ? d.readyCount : null);
      } else uxToast.error('Comparaison échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setComparing(false);
  };

  const migratePilots = async () => {
    if (!canEdit) return;
    setMigrating(true);
    try {
      const r = await fetch('/api/dynamic-pricing/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'migrate-pilots' }),
      });
      const d = await r.json();
      if (r.ok) {
        setCompareRows(d.rows || []);
        setReadyCount(d.rows?.filter((row: CompareRow) => row.migrationReady).length ?? null);
        uxToast.success(`Migration pilotes — ${d.migrated ?? 0} article(s) enrichi(s)`);
        load();
      } else uxToast.error(getApiErrorMessage(d, 'Migration échouée'), 'Migration échouée');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setMigrating(false);
  };

  const filtered = profiles.filter(
    (p) =>
      !search ||
      p.articleId.includes(search) ||
      p.articleLabel.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm">Tarification dynamique</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Carte article · comparateur migration PRIX 2026 ↔ moteur · publication contrôlée
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={sync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(255,23,77,0.1)] text-[var(--accent-primary,#FF174D)] text-xs font-medium hover:bg-[rgba(255,23,77,0.18)] disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sync catalogue
          </button>
        )}
      </div>

      {stats && (
        <div className="pta-kpi-strip !grid-cols-2 sm:!grid-cols-4 lg:!grid-cols-8 !p-0">
          {[
            { label: 'Profils', value: stats.profiles },
            { label: adminStatusFilterLabel('published'), value: stats.published, ok: true },
            { label: adminStatusFilterLabel('draft'), value: stats.draft, warn: stats.draft > 0 },
            { label: 'Options', value: stats.optionGroups },
            { label: 'Formules', value: stats.formulas },
            { label: 'Stock', value: stats.stockRules ?? 0 },
            { label: 'Urgence', value: stats.urgencyRules ?? 0 },
            { label: 'Matières prix', value: stats.materialPrices ?? 0 },
          ].map((k) => (
            <div
              key={k.label}
              className={`pta-kpi-cell${'ok' in k && k.ok ? ' is-ok' : ''}${'warn' in k && k.warn ? ' is-warn' : ''}`}
            >
              <p className="pta-kpi-value">{k.value}</p>
              <p className="pta-kpi-label">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      <section className="pta-data-section">
        <button
          type="button"
          onClick={() => setShowCompare((v) => !v)}
          className="w-full flex items-center justify-between py-2 text-sm font-medium text-left hover:opacity-90"
        >
          <span className="flex items-center gap-2">
            <GitCompare size={16} className="text-[var(--ans-gold-500)]" />
            Comparateur migration (10 pilotes · configs métier)
          </span>
          {showCompare ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        {showCompare && (
          <div className="pt-3">
            <div className="flex flex-wrap justify-end gap-2 pb-3">
              {canEdit && (
                <button
                  type="button"
                  onClick={migratePilots}
                  disabled={migrating}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[rgba(255,23,77,0.1)] text-[var(--accent-primary,#FF174D)] text-xs font-medium disabled:opacity-100 disabled:bg-[var(--app-disabled-bg)] disabled:text-[var(--app-disabled-text)]"
                >
                  <RefreshCw size={12} className={migrating ? 'animate-spin' : ''} />
                  {migrating ? 'Migration…' : 'Importer PRIX 2026 (pilotes)'}
                </button>
              )}
              <button
                type="button"
                onClick={runPilotCompare}
                disabled={comparing}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FFD60A]/10 text-[#FFD60A] text-xs font-medium"
              >
                <Play size={12} />
                {comparing ? 'Calcul…' : 'Lancer comparaison'}
              </button>
            </div>
            {readyCount != null && (
              <p className="text-xs text-muted-foreground mb-2">
                Pilotes prêts à publier : <strong className="text-green-500">{readyCount}</strong> / {compareRows?.length ?? 10}
              </p>
            )}
            {compareRows && (
              <div className="pta-data-scroll">
                <table className="pta-admin-table">
                  <thead>
                    <tr>
                      <th>Article</th>
                      <th className="text-right">Legacy PU</th>
                      <th className="text-right">Moteur PU</th>
                      <th className="text-right">Δ</th>
                      <th>Statut migration</th>
                      <th className="text-center">Profil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareRows.map((row) => (
                      <tr key={row.articleId}>
                        <td className="font-mono">{row.articleId}</td>
                        <td className="text-right font-mono">
                          {row.legacyUnit != null ? formatPriceAr(row.legacyUnit) : '—'}
                        </td>
                        <td className="text-right font-mono">
                          {row.dynamicUnit != null ? formatPriceAr(row.dynamicUnit) : '—'}
                        </td>
                        <td className={`text-right font-mono ${row.deltaUnit && row.deltaUnit !== 0 ? 'text-amber-500' : ''}`}>
                          {row.deltaUnit != null ? `${row.deltaUnit > 0 ? '+' : ''}${formatPriceAr(row.deltaUnit)}` : '—'}
                          {row.deltaPercent != null && row.deltaPercent !== 0 && (
                            <span className="text-muted-foreground ml-1">({row.deltaPercent}%)</span>
                          )}
                        </td>
                        <td className="orion-text-meta max-w-[140px]">
                          {row.migrationReady ? (
                            <span className="text-green-500 font-medium">Prêt</span>
                          ) : (
                            row.migrationReason || '—'
                          )}
                        </td>
                        <td className="text-center">
                          {row.isPublished ? (
                            <span className="text-green-500">Actif</span>
                          ) : row.hasProfile ? (
                            <span className="text-amber-500">{adminStatusLabel('draft')}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {!migrationOnly && (
        <PricingArticlesWorkspace canEdit={canEdit} initialArticleId={initialArticleId} />
      )}
    </div>
  );
}
