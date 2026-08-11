'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import type { SyncDriftSummary } from '@/lib/services/sync-drift-service';
import type { AdminConfigSnapshot, ChipAdminEntry, ProductPreviewAdminEntry, VisibilityMode } from '@/lib/admin-config/types';
import type { ProductionStatusData } from '@/components/admin/production-status-panel';

async function fetchJson(url: string, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return r.ok ? r.json() : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function useBackofficeConfig(
  role: string,
  enabled: boolean,
  opts?: { withDraft?: boolean; withDynamicPricing?: boolean },
) {
  const router = useRouter();
  const [config, setConfig] = useState<AdminConfigSnapshot | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [versions, setVersions] = useState<{ id: string; version: number; publishedAt: string; status: string; label?: string }[]>([]);
  const [fusionStatus, setFusionStatus] = useState<{
    ok?: boolean;
    fusion?: { materials: number; salePrices: number; salePricesAuto: number; anomaliesOpen: number; activeReservations: number };
  } | null>(null);
  const [prodStatus, setProdStatus] = useState<ProductionStatusData | null>(null);
  const [dynamicPricingStats, setDynamicPricingStats] = useState<Record<string, number> | null>(null);
  const [auditLogs, setAuditLogs] = useState<
    { id: string; action: string; entity: string; entityId: string | null; entityLabel: string | null; userName: string | null; createdAt: string }[]
  >([]);
  const [syncStatus, setSyncStatus] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [syncingCatalog, setSyncingCatalog] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [lastPublishDrift, setLastPublishDrift] = useState<SyncDriftSummary | null>(null);
  const [syncRefreshKey, setSyncRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  const withDraft = opts?.withDraft !== false;
  const withDynamicPricing = opts?.withDynamicPricing === true;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [cR, hR, vR, fR, appH, dbH, seedH, dynH, auditH, syncH] = await Promise.all([
        withDraft ? fetch('/api/admin-config?mode=draft') : Promise.resolve({ ok: false, status: 403 } as Response),
        fetch('/api/admin-config/health'),
        fetch('/api/admin-config/versions'),
        fetch('/api/fusion/status'),
        fetchJson('/api/health', 5000),
        fetchJson('/api/health/db', 8000),
        role === 'admin' ? fetchJson('/api/admin/seed-status', 12000) : Promise.resolve(null),
        withDynamicPricing ? fetchJson('/api/dynamic-pricing', 8000) : Promise.resolve(null),
        role === 'admin' || role === 'manager' ? fetchJson('/api/admin/audit-logs?limit=8', 8000) : Promise.resolve(null),
        role === 'admin' || role === 'manager' ? fetchJson('/api/admin/sync-status', 8000) : Promise.resolve(null),
      ]);
      if (withDraft && cR.status === 403) {
        setLoading(false);
        router.push('/non-autorise');
        return;
      }
      if (withDraft && cR.ok) setConfig(await cR.json());
      if (hR.ok) {
        setHealth(await hR.json());
      } else {
        const errBody = await hR.json().catch(() => ({}));
        setHealth(null);
        setLoadError(
          typeof errBody?.error === 'string'
            ? errBody.error
            : hR.status === 503
              ? 'Base de données non connectée. Vérifiez DATABASE_URL (local ou Vercel → Environment Variables) puis redéployez.'
              : `Santé indisponible (HTTP ${hR.status})`,
        );
      }
      if (vR.ok) {
        const d = await vR.json();
        setVersions(d.versions || []);
      }
      if (fR.ok) setFusionStatus(await fR.json());
      setProdStatus({
        app: appH ?? undefined,
        db: dbH ?? undefined,
        seed: seedH?.seed ? { ...seedH.seed, counts: seedH.counts } : undefined,
      });
      setDynamicPricingStats(dynH?.stats ?? null);
      setAuditLogs(auditH?.logs ?? []);
      setSyncStatus(syncH ?? null);
    } catch {
      setLoadError('Erreur réseau — impossible de charger le backoffice');
      uxToast.error('Erreur chargement configuration backoffice');
    }
    setLoading(false);
  }, [router, role, withDraft, withDynamicPricing]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const saveDraft = async () => {
    if (!config) return false;
    setSaving(true);
    try {
      const r = await fetch('/api/admin-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (r.ok) {
        uxToast.success('Brouillon enregistré');
        await load();
        return true;
      }
      uxToast.error('Erreur sauvegarde');
      return false;
    } catch {
      uxToast.error('Erreur réseau');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const ok = await saveDraft();
      if (!ok) return;
      const r = await fetch('/api/admin-config/publish', { method: 'POST' });
      if (r.ok) {
        const d = await r.json();
        const drift = d.driftSummary as SyncDriftSummary | null | undefined;
        if (drift) {
          setLastPublishDrift(drift);
          setSyncRefreshKey((k) => k + 1);
          if (drift.criticalCount > 0) {
            uxToast.error(
              `${drift.criticalCount} écart(s) critique(s) après publication — voir Centre sync`,
              `Configuration v${d.version} publiée`,
            );
          } else if (drift.warnCount > 0) {
            uxToast.success(`Configuration v${d.version} publiée — ${drift.warnCount} alerte(s) drift à vérifier`);
          } else {
            uxToast.success(`Configuration v${d.version} publiée — sync OK`);
          }
        } else {
          uxToast.success(`Configuration v${d.version} publiée`);
        }
        await load();
      } else uxToast.error('Erreur publication');
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setPublishing(false);
    }
  };

  const syncCatalog = async () => {
    setSyncingCatalog(true);
    try {
      const r = await fetch('/api/admin-config/sync-catalog', { method: 'POST' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        uxToast.error(getApiErrorMessage(d, 'Erreur synchronisation'), 'Erreur synchronisation');
        return;
      }
      uxToast.success(`Catalogue synchronisé — ${d.addedChips ?? 0} chip(s), ${d.addedArticles ?? 0} article(s)`);
      await load();
    } catch {
      uxToast.error('Erreur réseau');
    } finally {
      setSyncingCatalog(false);
    }
  };

  const rollback = async (version: number) => {
    setRollingBack(true);
    try {
      const r = await fetch('/api/admin-config/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        uxToast.success(`Configuration v${version} restaurée`);
        await load();
        return true;
      }
      uxToast.error((d as { error?: string }).error, 'Erreur rollback');
      return false;
    } catch {
      uxToast.error('Erreur réseau');
      return false;
    } finally {
      setRollingBack(false);
    }
  };

  const setPreviewField = (articleId: string, patch: Partial<ProductPreviewAdminEntry>) => {
    if (!config) return;
    setConfig({
      ...config,
      productPreviews: {
        ...config.productPreviews,
        [articleId]: { ...(config.productPreviews?.[articleId] ?? { articleId }), ...patch },
      },
    });
  };

  const setChipField = (id: string, patch: Partial<ChipAdminEntry>) => {
    if (!config) return;
    setConfig({
      ...config,
      chips: { ...config.chips, [id]: { ...config.chips[id], ...patch } },
    });
  };

  const updateVariable = (key: string, value: number | string) => {
    if (!config) return;
    setConfig({
      ...config,
      variables: { ...config.variables, [key]: { ...config.variables[key], value } },
    });
  };

  const toggleFeature = (key: string) => {
    if (!config) return;
    const f = config.featureFlags[key];
    if (!f) return;
    setConfig({
      ...config,
      featureFlags: { ...config.featureFlags, [key]: { ...f, enabled: !f.enabled } },
    });
  };

  const setArticleVisibility = (id: string, visibility: VisibilityMode) => {
    if (!config) return;
    setConfig({
      ...config,
      articles: { ...config.articles, [id]: { ...config.articles[id], visibility } },
    });
  };

  return {
    config,
    setConfig,
    health,
    versions,
    fusionStatus,
    prodStatus,
    dynamicPricingStats,
    auditLogs,
    syncStatus,
    loading,
    saving,
    publishing,
    syncingCatalog,
    rollingBack,
    loadError,
    lastPublishDrift,
    syncRefreshKey,
    load,
    saveDraft,
    publish,
    syncCatalog,
    rollback,
    setPreviewField,
    setChipField,
    updateVariable,
    toggleFeature,
    setArticleVisibility,
  };
}
