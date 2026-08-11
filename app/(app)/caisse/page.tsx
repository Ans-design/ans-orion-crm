'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Wallet,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  History,
  Banknote,
} from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { formatPrice } from '@/lib/data/catalogue';
import { getApiErrorMessage, unwrapApiData } from '@/lib/api-client';
import {
  AppPageHeader,
  AppButton,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';
import { useOrionLiveRevision } from '@/lib/hooks/use-orion-live-revision';

type CashTotals = Record<string, number>;

type CashSessionRow = {
  id: string;
  userId: string;
  userName: string | null;
  openedAt: string;
  closedAt: string | null;
  openingFloat: number;
  closingCash: number | null;
  expectedCash: number | null;
  variance: number | null;
  notes: string | null;
  totals: CashTotals | null;
  encaissements: number;
};

type HistorySummary = {
  count: number;
  encaissements: number;
  variance: number;
  withEcart: number;
};

const MODE_LABELS: Record<string, string> = {
  especes: 'Espèces',
  mvola: 'MVola',
  orange: 'Orange Money',
  airtel: 'Airtel Money',
  virement: 'Virement',
  cheque: 'Chèque',
  carte: 'Carte',
  mixte: 'Mixte',
};

function dayKey(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function CaissePage() {
  const { data: session } = useSession();
  const userName = (session?.user as { name?: string } | undefined)?.name || 'caissier';
  const [sessionData, setSessionData] = useState<{
    id: string;
    openedAt: string;
    openingFloat: number;
  } | null>(null);
  const [totals, setTotals] = useState<CashTotals | null>(null);
  const [history, setHistory] = useState<CashSessionRow[]>([]);
  const [historySummary, setHistorySummary] = useState<HistorySummary>({
    count: 0,
    encaissements: 0,
    variance: 0,
    withEcart: 0,
  });
  const [openingFloat, setOpeningFloat] = useState(0);
  const [closingCash, setClosingCash] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const liveTick = useOrionLiveRevision(['caisse', 'paiements'], { debounceMs: 400 });

  const load = useCallback(async () => {
    void liveTick;
    setLoading(true);
    try {
      const r = await fetch('/api/caisse/session');
      if (r.ok) {
        const d = unwrapApiData<{
          session: typeof sessionData;
          totals: CashTotals | null;
          history?: CashSessionRow[];
          historySummary?: HistorySummary;
        }>(await r.json());
        setSessionData(d?.session ?? null);
        setTotals(d?.totals ?? null);
        setHistory(Array.isArray(d?.history) ? d.history : []);
        if (d?.historySummary) setHistorySummary(d.historySummary);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [liveTick]);

  useEffect(() => {
    void load();
  }, [load]);

  const openSession = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/caisse/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingFloat }),
      });
      if (r.ok) {
        uxToast.success('Caisse ouverte');
        await load();
      } else {
        const e = await r.json();
        uxToast.error(getApiErrorMessage(e, 'Erreur'), 'Erreur');
      }
    } finally {
      setBusy(false);
    }
  };

  const closeSession = async () => {
    setBusy(true);
    try {
      const r = await fetch('/api/caisse/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closingCash: Number(closingCash) }),
      });
      if (r.ok) {
        const d = unwrapApiData<{ variance?: number }>(await r.json());
        uxToast.success(`Caisse clôturée — écart ${formatPrice(d?.variance || 0)} Ar`);
        setClosingCash('');
        await load();
      } else {
        const e = await r.json();
        uxToast.error(getApiErrorMessage(e, 'Erreur'), 'Erreur');
      }
    } finally {
      setBusy(false);
    }
  };

  const expectedCash = sessionData
    ? (sessionData.openingFloat || 0) + (totals?.especes || 0)
    : 0;

  const ecartEstime = closingCash ? Number(closingCash) - expectedCash : 0;

  const historyByDay = useMemo(() => {
    const map = new Map<string, CashSessionRow[]>();
    for (const row of history) {
      const key = dayKey(row.closedAt || row.openedAt);
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [history]);

  const activeModes = totals
    ? Object.entries(totals).filter(([, v]) => (v || 0) > 0)
    : [];

  return (
    <div className="caisse-page dashboard-full">
      <AppPageHeader
        title="Caisse journalière"
        description={`Session de ${userName} · ouverture, totaux et clôture`}
        icon={Wallet}
      />

      <div className="caisse-kpi">
        <AppKpiCard
          label="Sessions (30 j)"
          value={historySummary.count}
          icon={History}
          tone="info"
        />
        <AppKpiCard
          label="Encaissé (30 j)"
          value={historySummary.encaissements}
          icon={Banknote}
          tone="success"
          format="price"
        />
        <AppKpiCard
          label="Écart cumulé"
          value={historySummary.variance}
          icon={historySummary.variance < 0 ? TrendingDown : TrendingUp}
          tone={historySummary.variance === 0 ? 'neutral' : historySummary.variance > 0 ? 'warning' : 'danger'}
          format="price"
        />
        <AppKpiCard
          label="Avec écart"
          value={historySummary.withEcart}
          icon={Lock}
          tone={historySummary.withEcart > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="caisse-layout">
        <section className="caisse-panel">
          {loading ? (
            <AppListSkeleton rows={3} />
          ) : !sessionData ? (
            <div className="caisse-open">
              <div className="caisse-open__head">
                <Unlock size={16} aria-hidden />
                <div>
                  <h2>Aucune session ouverte</h2>
                  <p>Saisissez le fond de caisse puis ouvrez.</p>
                </div>
              </div>
              <label className="caisse-field">
                <span>Fond de caisse initial (Ar)</span>
                <input
                  type="number"
                  value={openingFloat || ''}
                  onChange={(e) => setOpeningFloat(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </label>
              <AppButton type="button" onClick={openSession} disabled={busy} className="w-full">
                Ouvrir la caisse
              </AppButton>
            </div>
          ) : (
            <div className="caisse-live">
              <div className="caisse-live__banner">
                <div>
                  <p className="lbl">Ouverte depuis</p>
                  <p className="val">
                    {new Date(sessionData.openedAt).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <span className="caisse-pill caisse-pill--open">Ouverte</span>
              </div>

              {activeModes.length > 0 ? (
                <div className="caisse-modes">
                  {activeModes.map(([k, v]) => (
                    <div key={k} className="caisse-mode">
                      <span className="lbl">{MODE_LABELS[k] ?? k}</span>
                      <span className="val">{formatPrice(v)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="caisse-hint">Aucun encaissement tagué sur cette session.</p>
              )}

              <div className="caisse-recap">
                <div className="row">
                  <span>Fond initial</span>
                  <span className="mono">{formatPrice(sessionData.openingFloat)} Ar</span>
                </div>
                <div className="row">
                  <span>Espèces encaissées</span>
                  <span className="mono">{formatPrice(totals?.especes || 0)} Ar</span>
                </div>
                <div className="row is-total">
                  <span>Espèces théoriques</span>
                  <span className="mono">{formatPrice(expectedCash)} Ar</span>
                </div>
              </div>

              <div className="caisse-close">
                <div className="caisse-close__head">
                  <Lock size={15} aria-hidden />
                  <h3>Clôture</h3>
                </div>
                <label className="caisse-field">
                  <span>Espèces réelles comptées (Ar)</span>
                  <input
                    type="number"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    placeholder="0"
                  />
                </label>
                {closingCash ? (
                  <p className={`caisse-ecart${ecartEstime === 0 ? '' : ecartEstime > 0 ? ' is-pos' : ' is-neg'}`}>
                    Écart estimé : {formatPrice(ecartEstime)} Ar
                  </p>
                ) : null}
                <AppButton
                  type="button"
                  variant="outline"
                  onClick={closeSession}
                  disabled={!closingCash || busy}
                  className="w-full caisse-close-btn"
                >
                  Clôturer la caisse
                </AppButton>
              </div>
            </div>
          )}
        </section>

        <section className="caisse-history">
          <div className="caisse-history__head">
            <History size={15} aria-hidden />
            <h2>Historique · 30 jours</h2>
            <span className="caisse-history__count">{history.length}</span>
          </div>

          {loading ? (
            <AppListSkeleton rows={4} />
          ) : history.length === 0 ? (
            <AppEmptyState
              icon={History}
              title="Aucune clôture récente"
              description="Les caisses des jours précédents apparaîtront ici après clôture."
            />
          ) : (
            <div className="caisse-history__list">
              {historyByDay.map(([day, rows]) => (
                <div key={day} className="caisse-day">
                  <h3 className="caisse-day__title">{day}</h3>
                  <div className="caisse-day__grid">
                    {rows.map((row) => {
                      const v = row.variance ?? 0;
                      return (
                        <article
                          key={row.id}
                          className="caisse-hist-card"
                          data-ecart={v === 0 ? 'ok' : v > 0 ? 'pos' : 'neg'}
                        >
                          <div className="caisse-hist-card__top">
                            <div className="min-w-0">
                              <p className="caisse-hist-card__who">
                                {row.userName || 'Caissier'}
                              </p>
                              <p className="caisse-hist-card__time">
                                {fmtTime(row.openedAt)} → {fmtTime(row.closedAt)}
                              </p>
                            </div>
                            <span
                              className={`caisse-pill${
                                v === 0 ? ' caisse-pill--ok' : v > 0 ? ' caisse-pill--pos' : ' caisse-pill--neg'
                              }`}
                            >
                              {v === 0 ? 'Écart 0' : `${v > 0 ? '+' : ''}${formatPrice(v)}`}
                            </span>
                          </div>
                          <div className="caisse-hist-card__metrics">
                            <div>
                              <span className="lbl">Fond</span>
                              <span className="val">{formatPrice(row.openingFloat)}</span>
                            </div>
                            <div>
                              <span className="lbl">Théorique</span>
                              <span className="val">{formatPrice(row.expectedCash ?? 0)}</span>
                            </div>
                            <div>
                              <span className="lbl">Compté</span>
                              <span className="val">{formatPrice(row.closingCash ?? 0)}</span>
                            </div>
                            <div>
                              <span className="lbl">Encaissé</span>
                              <span className="val">{formatPrice(row.encaissements)}</span>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
