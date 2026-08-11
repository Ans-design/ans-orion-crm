'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Package, TrendingUp, Wallet } from 'lucide-react';
import {
  AppPageHeader,
  AppKpiCard,
  AppEmptyState,
  AppListSkeleton,
} from '@/components/ui/app-ui';
import { unwrapApiData, unwrapListItems } from '@/lib/api-client';

type CoutRow = {
  id?: string;
  commandeId?: string;
  numero: string;
  client: string;
  article: string;
  statut?: string;
  ca?: number;
  coutRevient?: number;
  marge?: number;
  margePct?: number;
};

function fmt(n: number | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('fr-MG').format(Math.round(n)) + ' Ar';
}

function rowId(r: CoutRow) {
  return r.commandeId || r.id;
}

export default function CoutsRevientPage() {
  const [rows, setRows] = useState<CoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/finance/couts-revient')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const list = unwrapListItems<CoutRow>(unwrapApiData(d) ?? d);
        setRows(Array.isArray(list) ? list : []);
      })
      .finally(() => setLoading(false));
  }, []);

  const margeMoy = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.margePct || 0), 0) / rows.length)
    : 0;
  const caTotal = useMemo(() => rows.reduce((s, r) => s + (r.ca || 0), 0), [rows]);
  const coutTotal = useMemo(
    () => rows.reduce((s, r) => s + (r.coutRevient || 0), 0),
    [rows],
  );
  const margeTotal = useMemo(() => rows.reduce((s, r) => s + (r.marge || 0), 0), [rows]);

  return (
    <div className="couts-page dashboard-full">
      <AppPageHeader
        title="Coûts de revient"
        description="Marge estimée · matière 62% + charges réparties"
        icon={BarChart3}
      />

      <div className="couts-kpi">
        <AppKpiCard
          label="Marge moyenne"
          value={margeMoy}
          icon={TrendingUp}
          tone={margeMoy >= 30 ? 'success' : 'danger'}
          hint=" %"
        />
        <AppKpiCard label="CA total" value={caTotal} icon={Wallet} tone="info" format="price" />
        <AppKpiCard
          label="Coût revient"
          value={coutTotal}
          icon={Package}
          tone="warning"
          format="price"
        />
        <AppKpiCard
          label="Marge totale"
          value={margeTotal}
          icon={BarChart3}
          tone="success"
          format="price"
        />
      </div>

      <div className="couts-toolbar">
        <h2>
          {loading ? '…' : `${rows.length} commande${rows.length > 1 ? 's' : ''}`}
        </h2>
      </div>

      {loading ? (
        <AppListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <AppEmptyState
          icon={BarChart3}
          title="Aucune donnée"
          description="Les marges apparaîtront dès qu’il y a des commandes avec coûts estimés."
        />
      ) : (
        <div className="couts-grid">
          {rows.map((r) => {
            const pct = r.margePct ?? 0;
            const ok = pct >= 30;
            const hasCa = Number.isFinite(r.ca) && (r.ca as number) > 0;
            const cid = rowId(r);
            const inner = (
              <>
                <div className="cout-card__top">
                  <div className="min-w-0">
                    <span className="cout-card__num">{r.numero}</span>
                    <div className="cout-card__client">{r.client || 'Client —'}</div>
                  </div>
                  {r.margePct != null ? (
                    <span className={`cout-pill${ok ? '' : ' is-low'}`}>{pct}%</span>
                  ) : null}
                </div>

                <p className="cout-card__art">{r.article}</p>

                <div className="cout-card__metrics">
                  <div className="cout-metric">
                    <span className="lbl">CA</span>
                    <span className={`val${hasCa ? '' : ' is-muted'}`}>
                      {hasCa ? fmt(r.ca) : 'N/D'}
                    </span>
                  </div>
                  <div className="cout-metric">
                    <span className="lbl">Coût</span>
                    <span className="val">{fmt(r.coutRevient)}</span>
                  </div>
                  <div className="cout-metric">
                    <span className="lbl">Marge</span>
                    <span
                      className={`val${
                        r.marge == null
                          ? ' is-muted'
                          : r.marge >= 0
                            ? ' is-marge'
                            : ' is-marge-neg'
                      }`}
                    >
                      {fmt(r.marge)}
                    </span>
                  </div>
                  <div className="cout-metric">
                    <span className="lbl">Statut</span>
                    <span className="val is-muted">{r.statut || '—'}</span>
                  </div>
                </div>
              </>
            );

            if (cid) {
              return (
                <Link
                  key={cid}
                  href={`/commandes/${cid}`}
                  className="cout-card"
                  data-marge={r.margePct == null ? undefined : ok ? 'ok' : 'low'}
                >
                  {inner}
                </Link>
              );
            }

            return (
              <article
                key={r.numero}
                className="cout-card"
                data-marge={r.margePct == null ? undefined : ok ? 'ok' : 'low'}
              >
                {inner}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
