'use client';

/**
 * Temps & capacités — grille plein largeur, parcours par article, peu de scroll.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, RefreshCw, Trash2 } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';
import {
  computeDurationMinutes,
  estimateReadyAt,
  formatDurationMinutes,
  modeLabel,
  newRateId,
  rateDisplay,
  rateUnitLabel,
  resourceLabel,
  type ArticleTaskTimeRate,
  type AtelierCapacitySettings,
  type EstimationTaskKeyDef,
  type ResourceType,
  type TimeRateMode,
} from '@/lib/data/estimation-temps-config';
import { cn } from '@/lib/utils';

type ArticleOption = { articleId: string; articleLabel: string; family: string };

type Payload = {
  config: {
    rates: ArticleTaskTimeRate[];
    capacity: AtelierCapacitySettings;
    updatedAt: string;
  };
  taskKeys: EstimationTaskKeyDef[];
  articles: ArticleOption[];
  source: 'db' | 'defaults';
};

type Props = { canEdit: boolean };

const DOT_COLORS = ['#6758e8', '#ea9551', '#db5379', '#1aa47b', '#2885db', '#9b62d9'];

const DEFAULT_CAPACITY: AtelierCapacitySettings = {
  openHour: '08:00',
  closeHour: '17:00',
  pauseMin: 60,
  safetyMarginPct: 15,
};

export function EstimationTempsWorkspace({ canEdit }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rates, setRates] = useState<ArticleTaskTimeRate[]>([]);
  const [capacity, setCapacity] = useState<AtelierCapacitySettings>(DEFAULT_CAPACITY);
  const [taskKeys, setTaskKeys] = useState<EstimationTaskKeyDef[]>([]);
  const [catalogue, setCatalogue] = useState<ArticleOption[]>([]);
  const [source, setSource] = useState<'db' | 'defaults'>('defaults');
  const [updatedAt, setUpdatedAt] = useState('');
  const [activeArticleId, setActiveArticleId] = useState('');
  const [articleQuery, setArticleQuery] = useState('');
  const [qty, setQty] = useState(500);
  const [form, setForm] = useState<ArticleTaskTimeRate | null>(null);

  const applyConfig = (cfg: Payload['config'], src?: 'db' | 'defaults') => {
    setRates(cfg.rates ?? []);
    if (cfg.capacity) setCapacity(cfg.capacity);
    if (cfg.updatedAt) setUpdatedAt(cfg.updatedAt);
    if (src) setSource(src);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/estimation-temps');
      if (!r.ok) throw new Error('load');
      const data = unwrapApiData<Payload>(await r.json());
      applyConfig(
        data?.config ?? { rates: [], capacity: DEFAULT_CAPACITY, updatedAt: '' },
        data?.source,
      );
      setTaskKeys(data?.taskKeys ?? []);
      setCatalogue(data?.articles ?? []);
      const first =
        data?.config?.rates?.find((x) => x.active)?.articleId
        || data?.articles?.[0]?.articleId
        || '';
      setActiveArticleId((prev) => prev || first);
      const pick = data?.config?.rates?.find((x) => x.articleId === first);
      if (pick?.qtyRef) setQty(pick.qtyRef);
    } catch {
      uxToast.error('Erreur chargement Temps & capacités');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const articles = useMemo(() => {
    const map = new Map<string, ArticleOption & { count: number }>();
    for (const a of catalogue) {
      map.set(a.articleId, { ...a, count: 0 });
    }
    for (const r of rates) {
      if (!r.active) continue;
      const cur = map.get(r.articleId);
      if (cur) cur.count += 1;
      else {
        map.set(r.articleId, {
          articleId: r.articleId,
          articleLabel: r.articleLabel,
          family: r.family,
          count: 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.articleLabel.localeCompare(b.articleLabel));
  }, [catalogue, rates]);

  const filteredArticles = useMemo(() => {
    const q = articleQuery.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter(
      (a) =>
        a.articleLabel.toLowerCase().includes(q)
        || a.articleId.toLowerCase().includes(q)
        || a.family.toLowerCase().includes(q),
    );
  }, [articles, articleQuery]);

  const activeArticle = articles.find((a) => a.articleId === activeArticleId) ?? articles[0];
  const activeId = activeArticle?.articleId ?? '';

  const articleRates = useMemo(
    () =>
      rates
        .filter((r) => r.articleId === activeId && r.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [rates, activeId],
  );

  const durations = useMemo(
    () => articleRates.map((r) => computeDurationMinutes(r, qty)),
    [articleRates, qty],
  );
  const totalMin = durations.reduce((s, d) => s + d, 0);
  const bottleneckIdx = durations.length ? durations.indexOf(Math.max(...durations)) : -1;
  const cadence = totalMin > 0 ? Math.round(qty / (totalMin / 60)) : 0;
  const marginMin = Math.round(totalMin * (capacity.safetyMarginPct / 100));
  const readyAt = useMemo(() => estimateReadyAt(totalMin, capacity), [totalMin, capacity]);

  const post = async (body: unknown) => {
    setSaving(true);
    try {
      const r = await fetch('/api/admin-backoffice/estimation-temps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await r.json().catch(() => ({}));
      if (!r.ok) {
        uxToast.error(getApiErrorMessage(json, 'Erreur enregistrement'));
        return;
      }
      const data = unwrapApiData<{ config: Payload['config'] }>(json);
      if (data?.config) applyConfig(data.config, 'db');
      uxToast.success('Grille enregistrée');
      setForm(null);
    } finally {
      setSaving(false);
    }
  };

  const openNewOp = () => {
    if (!activeArticle) return;
    const tk = taskKeys.find((t) => t.key === 'impression') ?? taskKeys[0];
    setForm({
      id: newRateId(),
      articleId: activeArticle.articleId,
      articleLabel: activeArticle.articleLabel,
      family: activeArticle.family,
      taskKey: tk?.key || 'impression',
      taskLabel: tk?.label || 'Opération',
      mode: 'pcs_per_hour',
      rateValue: 200,
      setupMin: 5,
      resourceType: (tk?.defaultResource || 'person') as ResourceType,
      resourceHint: '',
      people: 1,
      color: tk?.defaultColor || '#6758e8',
      qtyRef: qty,
      notes: '',
      active: true,
      sortOrder: (articleRates.length + 1) * 10,
    });
  };

  const selectArticle = (a: ArticleOption & { count: number }) => {
    setActiveArticleId(a.articleId);
    const sample = rates.find((r) => r.articleId === a.articleId && r.active);
    if (sample?.qtyRef) setQty(sample.qtyRef);
  };

  return (
    <div className="w-full max-w-none space-y-3">
      {/* Header compact */}
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="m-0 text-xl font-bold tracking-tight text-[var(--text-main,#18243e)]">
            Temps &amp; capacités
          </h1>
          <p className="m-0 mt-0.5 text-[12px] text-[var(--text-muted,#7c859a)]">
            Parcours atelier par article · délais fiables
            {source === 'defaults' ? ' · modèles auto — Enregistrer pour figer' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/administration/production-flux"
            className="inline-flex h-9 items-center rounded-[7px] border border-[var(--border-soft,#dfe2ea)] bg-[var(--bg-card,#fff)] px-3 text-[11px] font-bold text-[var(--text-muted)]"
          >
            Production &amp; Flux
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex h-9 items-center gap-1.5 rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 text-[11px] font-bold text-[var(--text-muted)]"
          >
            <RefreshCw size={14} /> Actualiser
          </button>
          {canEdit ? (
            <>
              <button
                type="button"
                onClick={openNewOp}
                className="inline-flex h-9 items-center gap-1.5 rounded-[7px] border-0 bg-[var(--brand-primary,#cc0033)] px-3 text-[11px] font-bold text-white"
              >
                <Plus size={14} /> Opération
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void post({ type: 'replace', rates, capacity })}
                className="inline-flex h-9 items-center rounded-[7px] border-0 bg-[#18243e] px-3 text-[11px] font-bold text-white"
              >
                Enregistrer
              </button>
            </>
          ) : null}
        </div>
      </header>

      {/* KPI + horaires sur une ligne */}
      <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
        <Kpi label="Temps" value={formatDurationMinutes(totalMin)} sub={`${qty} u.`} />
        <Kpi label="Cadence" value={`${cadence} u/h`} sub="atelier" />
        <Kpi
          label="Goulot"
          value={bottleneckIdx >= 0 ? articleRates[bottleneckIdx]!.taskLabel : '—'}
          sub={bottleneckIdx >= 0 ? `${durations[bottleneckIdx]} min` : '—'}
        />
        <Kpi
          label="Prêt le"
          value={readyAt.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
          sub={readyAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        />
        <label className="rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-[9px] font-bold uppercase text-[var(--text-muted)]">
          Ouverture
          <input
            type="time"
            disabled={!canEdit}
            value={capacity.openHour}
            onChange={(e) => setCapacity((c) => ({ ...c, openHour: e.target.value }))}
            className="mt-1 block w-full border-0 bg-transparent text-[13px] font-bold text-[var(--text-main)] outline-none"
          />
        </label>
        <label className="rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 text-[9px] font-bold uppercase text-[var(--text-muted)]">
          Fermeture · marge %
          <div className="mt-1 flex items-center gap-2">
            <input
              type="time"
              disabled={!canEdit}
              value={capacity.closeHour}
              onChange={(e) => setCapacity((c) => ({ ...c, closeHour: e.target.value }))}
              className="w-[7rem] border-0 bg-transparent text-[13px] font-bold outline-none"
            />
            <input
              type="number"
              min={0}
              max={100}
              disabled={!canEdit}
              value={capacity.safetyMarginPct}
              onChange={(e) =>
                setCapacity((c) => ({ ...c, safetyMarginPct: Number(e.target.value) || 0 }))
              }
              className="w-12 border-0 bg-transparent text-[13px] font-bold outline-none"
              title="Marge sécurité %"
            />
          </div>
        </label>
      </section>

      {/* 2 colonnes : liste | parcours — hauteur viewport */}
      <section className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-3 min-h-[calc(100vh-13rem)]">
        <aside className="flex flex-col rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-card)] overflow-hidden min-h-[280px] lg:min-h-0">
          <div className="shrink-0 border-b border-[var(--border-soft)] p-2.5 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="m-0 text-[13px] font-bold">Articles</h2>
              <span className="text-[10px] text-[var(--text-muted)]">{articles.length}</span>
            </div>
            <input
              value={articleQuery}
              onChange={(e) => setArticleQuery(e.target.value)}
              placeholder="Rechercher…"
              className="h-8 w-full rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-app,#f7f8fb)] px-2.5 text-[11px] outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {loading ? (
              <p className="p-4 text-center text-xs text-[var(--text-muted)]">Chargement…</p>
            ) : (
              filteredArticles.map((a, i) => (
                <button
                  key={a.articleId}
                  type="button"
                  onClick={() => selectArticle(a)}
                  className={cn(
                    'grid w-full grid-cols-[8px_1fr] gap-2 items-center rounded-[7px] border-0 px-2 py-2 text-left',
                    activeId === a.articleId
                      ? 'bg-[color-mix(in_srgb,var(--brand-primary,#cc0033)_10%,transparent)]'
                      : 'hover:bg-[var(--bg-hover,#f2f2f8)]',
                  )}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: DOT_COLORS[i % DOT_COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <strong className="block text-[11px] truncate">{a.articleLabel}</strong>
                    <small className="block text-[9px] text-[var(--text-muted)]">
                      {a.count} op. · {a.family}
                    </small>
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex flex-col rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-card)] overflow-hidden min-h-[320px]">
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-soft)] px-3 py-2.5">
            <div className="min-w-0">
              <h2 className="m-0 text-[15px] font-bold truncate">
                {activeArticle?.articleLabel ?? '—'}
              </h2>
              <p className="m-0 text-[10px] text-[var(--text-muted)]">
                {activeArticle?.family ?? ''} · {articleRates.length} opération
                {articleRates.length > 1 ? 's' : ''} · +{marginMin} min marge
              </p>
            </div>
            <div className="flex h-8 items-center overflow-hidden rounded-[7px] border border-[var(--border-soft)]">
              <button
                type="button"
                className="h-full w-7 border-0 bg-transparent text-[var(--text-muted)]"
                onClick={() => setQty((q) => Math.max(1, q - 50))}
              >
                −
              </button>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="h-full w-14 border-0 bg-transparent text-center text-[12px] font-extrabold outline-none"
              />
              <button
                type="button"
                className="h-full w-7 border-0 bg-transparent text-[var(--text-muted)]"
                onClick={() => setQty((q) => q + 50)}
              >
                ＋
              </button>
              <span className="px-2 text-[9px] text-[var(--text-muted)]">qty</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {articleRates.map((r, i) => {
              const d = durations[i] ?? 0;
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_minmax(5rem,auto)_minmax(4.5rem,auto)_auto] gap-2 items-center rounded-[7px] border border-[var(--border-soft)] px-2.5 py-2"
                >
                  <b
                    className="grid h-7 w-7 place-items-center rounded-[7px] text-[9px] font-extrabold text-white"
                    style={{ background: r.color }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </b>
                  <div className="min-w-0">
                    <strong className="block text-[12px] truncate">{r.taskLabel}</strong>
                    <small className="text-[9px] text-[var(--text-muted)]">
                      {r.resourceHint || resourceLabel(r.resourceType)}
                      {' · '}
                      setup {r.setupMin} min
                    </small>
                  </div>
                  <div className="hidden sm:block text-right">
                    <strong className="block font-mono text-[11px]">{rateDisplay(r)}</strong>
                    <small className="text-[8px] text-[var(--text-muted)]">{rateUnitLabel(r)}</small>
                  </div>
                  <div className="text-right">
                    <strong className="block text-[12px] text-[var(--brand-primary,#cc0033)]">
                      {d} min
                    </strong>
                  </div>
                  {canEdit ? (
                    <div className="flex gap-0.5 justify-end">
                      <button
                        type="button"
                        className="rounded-[7px] px-1.5 text-[11px] font-bold text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        onClick={() => setForm({ ...r })}
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="rounded-[7px] p-1 text-[var(--text-muted)] hover:text-red-500"
                        aria-label="Supprimer"
                        onClick={() => {
                          if (!confirm(`Supprimer « ${r.taskLabel} » ?`)) return;
                          void post({ type: 'delete', id: r.id });
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
            {!loading && articleRates.length === 0 ? (
              <p className="py-8 text-center text-xs text-[var(--text-muted)]">
                Aucune opération pour cet article.
              </p>
            ) : null}
          </div>

          {/* Barre durée */}
          <div className="shrink-0 border-t border-[var(--border-soft)] px-3 py-2.5 space-y-2">
            <div className="flex h-5 gap-0.5 overflow-hidden rounded-[7px]">
              {articleRates.map((r, i) => (
                <div
                  key={r.id}
                  title={`${r.taskLabel} · ${durations[i]} min`}
                  className="min-w-[4px]"
                  style={{
                    flex: Math.max(durations[i] ?? 8, 8),
                    background: r.color,
                  }}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-[var(--text-muted)]">
                {formatDurationMinutes(totalMin)} technique · +{marginMin} min marge
                {updatedAt
                  ? ` · maj ${new Date(updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
                  : ''}
              </span>
              {canEdit ? (
                <button
                  type="button"
                  className="text-[10px] font-bold text-[var(--text-muted)] underline-offset-2 hover:underline"
                  onClick={() => {
                    if (!confirm('Réinitialiser avec la grille démo ?')) return;
                    void post({ type: 'reset' });
                  }}
                >
                  Reset démo
                </button>
              ) : null}
            </div>
          </div>
        </main>
      </section>

      {form && canEdit ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-card)] p-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="m-0 text-[15px] font-bold">
              {rates.some((r) => r.id === form.id) ? 'Modifier' : 'Nouvelle opération'}
            </h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)] sm:col-span-2">
                Opération
                <select
                  value={form.taskKey}
                  onChange={(e) => {
                    const tk = taskKeys.find((t) => t.key === e.target.value);
                    setForm({
                      ...form,
                      taskKey: e.target.value,
                      taskLabel: tk?.label || e.target.value,
                      resourceType: (tk?.defaultResource || form.resourceType) as ResourceType,
                      color: tk?.defaultColor || form.color,
                    });
                  }}
                  className="mt-1 h-9 w-full rounded-[7px] border border-[var(--border-soft)] px-2 text-[12px]"
                >
                  {taskKeys.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                Mode
                <select
                  value={form.mode}
                  onChange={(e) => setForm({ ...form, mode: e.target.value as TimeRateMode })}
                  className="mt-1 h-9 w-full rounded-[7px] border border-[var(--border-soft)] px-2 text-[12px]"
                >
                  <option value="pcs_per_hour">Pièces / h</option>
                  <option value="fixed_min">Durée fixe</option>
                  <option value="m2_per_hour">m² / h</option>
                </select>
              </label>
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                {modeLabel(form.mode)}
                <input
                  type="number"
                  min={0}
                  value={form.rateValue}
                  onChange={(e) => setForm({ ...form, rateValue: Number(e.target.value) || 0 })}
                  className="mt-1 h-9 w-full rounded-[7px] border border-[var(--border-soft)] px-2 text-[12px] font-bold"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                Setup (min)
                <input
                  type="number"
                  min={0}
                  value={form.setupMin}
                  onChange={(e) => setForm({ ...form, setupMin: Number(e.target.value) || 0 })}
                  className="mt-1 h-9 w-full rounded-[7px] border border-[var(--border-soft)] px-2 text-[12px]"
                />
              </label>
              <label className="block text-[10px] font-bold uppercase text-[var(--text-muted)]">
                Ressource
                <input
                  value={form.resourceHint}
                  onChange={(e) => setForm({ ...form, resourceHint: e.target.value })}
                  placeholder="Presse, massicot…"
                  className="mt-1 h-9 w-full rounded-[7px] border border-[var(--border-soft)] px-2 text-[12px]"
                />
              </label>
            </div>
            <p className="mt-3 rounded-[7px] bg-[color-mix(in_srgb,var(--brand-primary)_12%,transparent)] px-2.5 py-2 text-[11px] font-bold">
              qty {qty} → {formatDurationMinutes(computeDurationMinutes(form, qty))}
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                className="h-9 rounded-[7px] border border-[var(--border-soft)] px-3 text-[12px] font-bold"
                onClick={() => setForm(null)}
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving}
                className="h-9 rounded-[7px] bg-[#18243e] px-3 text-[12px] font-bold text-white"
                onClick={() => void post({ type: 'upsert', data: form })}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <article className="rounded-[7px] border border-[var(--border-soft)] bg-[var(--bg-card)] px-3 py-2 min-w-0">
      <span className="block text-[9px] font-extrabold uppercase text-[var(--text-muted)]">{label}</span>
      <strong className="mt-0.5 block text-[13px] truncate">{value}</strong>
      <small className="text-[9px] text-[var(--text-muted)]">{sub}</small>
    </article>
  );
}
