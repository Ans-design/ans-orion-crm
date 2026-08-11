'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CircleDollarSign,
  Link2,
  PackageSearch,
  Search,
  SearchX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/ui/app-ui';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import type { MaterialPriceUnifiedRow } from './material-prices/types';
import { MaterialFormatsTable } from './MaterialFormatsTable';

type Props = {
  rows: MaterialPriceUnifiedRow[];
  mode: 'usages' | 'anomalies';
  onOpenUsage: (row: MaterialPriceUnifiedRow) => void;
  onOpenDetails: (row: MaterialPriceUnifiedRow) => void;
};

function materialReference(row: MaterialPriceUnifiedRow) {
  return row.materialKey || row.excelRowId || row.id;
}

function MaterialEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof SearchX;
  title: string;
  description: string;
}) {
  return (
    <AdminEmptyState
      title={title}
      description={description}
      icon={<Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
    />
  );
}

function MaterialUsageView({ rows, onOpenUsage, onOpenDetails }: Omit<Props, 'mode'>) {
  const [selectedId, setSelectedId] = useState<string | null>(rows[0]?.id ?? null);
  const [listQuery, setListQuery] = useState('');

  useEffect(() => {
    if (selectedId && rows.some((row) => row.id === selectedId)) return;
    setSelectedId(rows[0]?.id ?? null);
  }, [rows, selectedId]);

  const filteredRows = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = `${row.name} ${materialReference(row)} ${row.family ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, listQuery]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  return (
    <div className="cps-material-usage-layout">
      <aside className="cps-material-usage-list" aria-label="Matières">
        <div className="cps-material-usage-list__head">
          <div>
            <strong>Matières</strong>
            <span>Sélectionnez une matière pour voir ses usages.</span>
          </div>
        </div>
        <div className="cps-material-usage-list__search">
          <Search className="h-3.5 w-3.5 opacity-50" aria-hidden />
          <input
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="Rechercher…"
            aria-label="Rechercher une matière"
          />
        </div>
        <div className="cps-material-usage-list__body">
          {filteredRows.length === 0 ? (
            <p className="cps-material-usage-list__empty">Aucune matière ne correspond.</p>
          ) : (
            filteredRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={cn('cps-material-usage-item', selected?.id === row.id && 'is-active')}
                aria-pressed={selected?.id === row.id}
                onClick={() => setSelectedId(row.id)}
              >
                <span className="cps-material-usage-item__icon">
                  <PackageSearch className="h-3.5 w-3.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <strong>{row.name}</strong>
                  <span>
                    {materialReference(row)} · {row.family || 'Sans famille'}
                  </span>
                </span>
                <span className="cps-material-usage-item__count">{row.linkedArticlesCount}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="cps-material-usage-main">
        {selected ? (
          <>
            <header className="cps-material-usage-main__head">
              <div className="min-w-0">
                <p>Usages produits</p>
                <h3>{selected.name}</h3>
                <span>
                  Relations contrôlées entre la matière, les articles et les formules ·{' '}
                  {materialReference(selected)}
                </span>
              </div>
              <AppButton type="button" variant="default" onClick={() => onOpenUsage(selected)}>
                <Link2 className="h-3.5 w-3.5" />
                Lier un produit
              </AppButton>
            </header>

            <div className="cps-material-usage-kpis">
              <div>
                <strong>{selected.linkedArticlesCount}</strong>
                <span>articles liés</span>
              </div>
              <div>
                <strong>{selected.impactsPrice ? 'Oui' : 'Non'}</strong>
                <span>impact prix</span>
              </div>
              <div>
                <strong>{selected.impactsStock ? 'Oui' : 'Non'}</strong>
                <span>impact stock</span>
              </div>
              <div>
                <strong>{selected.visiblePOS ? 'Visible' : 'Masqué'}</strong>
                <span>catalogue POS</span>
              </div>
            </div>

            {selected.linkedArticlesCount > 0 ? (
              <div className="cps-material-usage-ready">
                <PackageSearch className="h-5 w-5" aria-hidden />
                <div>
                  <strong>
                    {selected.linkedArticlesCount} article(s) consomment cette matière
                  </strong>
                  <p>
                    Consultez les liaisons pour voir le rôle (support / face / finition), la
                    consommation estimée et la formule tarifaire associée.
                  </p>
                </div>
                <button
                  type="button"
                  className="cps-prio-action"
                  onClick={() => onOpenUsage(selected)}
                >
                  Ouvrir <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="cps-material-usage-empty">
                <div className="cps-material-usage-empty__copy">
                  <Link2 className="h-5 w-5" aria-hidden />
                  <div>
                    <strong>Aucun usage produit actif</strong>
                    <p>
                      Cette matière n’est rattachée à aucun article publié. Liez-la depuis un
                      profil tarifaire (Studio Prix) ou ouvrez la fiche pour vérifier la référence,
                      le stock et les synonymes catalogue.
                    </p>
                  </div>
                </div>
                <ul className="cps-material-usage-empty__steps">
                  <li>Vérifier la référence / SKU matière</li>
                  <li>Rattacher un article via « Lier un produit »</li>
                  <li>Publier la formule pour activer la consommation</li>
                </ul>
                <div className="cps-material-usage-empty__actions">
                  <AppButton type="button" variant="default" onClick={() => onOpenUsage(selected)}>
                    <Link2 className="h-3.5 w-3.5" />
                    Lier un produit
                  </AppButton>
                  <AppButton type="button" variant="outline" onClick={() => onOpenDetails(selected)}>
                    Ouvrir la fiche matière
                  </AppButton>
                </div>
                <div className="cps-material-usage-table-wrap" aria-hidden={false}>
                  <table className="cps-material-usage-table">
                    <thead>
                      <tr>
                        <th>Article</th>
                        <th>Famille</th>
                        <th>Rôle</th>
                        <th>Consommation</th>
                        <th>Formule</th>
                        <th>POS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td colSpan={6} className="cps-material-usage-table__placeholder">
                          Les liaisons article ↔ matière apparaîtront ici après rattachement.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="cps-material-usage-footer">
              {selected.stockAvailable != null &&
              selected.stockAvailable > 0 &&
              selected.linkedArticlesCount === 0 ? (
                <span className="cps-material-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Stock disponible ({selected.stockAvailable}) sans usage produit — risque de
                  matière orpheline
                </span>
              ) : (
                <span className="cps-material-usage-footer__hint">
                  Source : BaseMaterial · liaisons articles · StockItem
                </span>
              )}
            </div>
          </>
        ) : (
          <AdminEmptyState
            className="cps-material-usage-empty-state"
            icon={<PackageSearch className="h-5 w-5" strokeWidth={1.5} aria-hidden />}
            title="Sélectionnez une matière"
            description="Choisissez une matière à gauche pour afficher ses usages produits, impacts prix/stock et liaisons formules."
          />
        )}
      </section>
    </div>
  );
}

function MaterialAnomalyView({ rows, onOpenDetails }: Omit<Props, 'mode' | 'onOpenUsage'>) {
  const missingPrice = rows.filter((row) => row.basePrintPrice == null).length;
  const unlinkedStock = rows.filter((row) => !row.stockItemId).length;
  const badReferences = rows.filter((row) =>
    row.anomalies.some((anomaly) => /r[ée]f[ée]rence|sku|doublon/i.test(anomaly)),
  ).length;
  const orphanUsages = rows.filter((row) => row.linkedArticlesCount === 0 && row.active).length;
  const anomalyRows = rows.filter(
    (row) => row.anomaliesCount > 0 || row.basePrintPrice == null || !row.stockItemId,
  );

  const metrics = [
    { label: 'Prix manquants', value: missingPrice, icon: CircleDollarSign, tone: 'warn' },
    { label: 'Stocks non liés', value: unlinkedStock, icon: Boxes, tone: 'danger' },
    { label: 'Références', value: badReferences, icon: AlertTriangle, tone: 'default' },
    { label: 'Usages orphelins', value: orphanUsages, icon: PackageSearch, tone: 'default' },
  ] as const;

  return (
    <div className="cps-material-anomalies">
      <div className="cps-material-anomaly-kpis">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className={cn('cps-material-anomaly-kpi', `is-${metric.tone}`)}>
              <span><Icon className="h-3.5 w-3.5" aria-hidden /></span>
              <div><strong>{metric.value}</strong><small>{metric.label}</small></div>
            </div>
          );
        })}
      </div>
      {anomalyRows.length > 0 ? (
        <div className="cps-material-anomaly-table-wrap">
          <table className="cps-material-anomaly-table">
            <thead>
              <tr>
                <th>Priorité</th>
                <th>Anomalie</th>
                <th>Entité</th>
                <th>Référence</th>
                <th>Impact</th>
                <th className="text-right">Action corrective</th>
              </tr>
            </thead>
            <tbody>
              {anomalyRows.map((row) => {
                const causes = [
                  row.basePrintPrice == null ? 'Prix avec impression absent' : null,
                  !row.stockItemId ? 'Matière non liée au stock' : null,
                  ...row.anomalies,
                ].filter(Boolean);
                const blocking = row.basePrintPrice == null || !row.stockItemId;
                return (
                  <tr key={row.id}>
                    <td>
                      <span className={cn('cps-prio-badge', blocking ? 'cps-prio-badge--danger' : 'cps-prio-badge--warn')}>
                        {blocking ? 'Bloquante' : 'À vérifier'}
                      </span>
                    </td>
                    <td>{causes[0] || 'Incohérence métier'}</td>
                    <td>
                      <strong>{row.name}</strong>
                      <span>{row.family || 'Sans famille'}</span>
                    </td>
                    <td><code>{materialReference(row)}</code></td>
                    <td>{row.visiblePOS ? 'Catalogue et POS' : 'Administration'}</td>
                    <td className="text-right">
                      <button type="button" className="cps-prio-action" onClick={() => onOpenDetails(row)}>
                        Corriger <ArrowRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <MaterialEmptyState
          icon={PackageSearch}
          title="Aucune anomalie dans la sélection"
          description="Les matières affichées ne présentent pas de blocage détecté."
        />
      )}
    </div>
  );
}

export function MaterialSpecializedViews(props: Props) {
  return props.mode === 'usages'
    ? <MaterialUsageView {...props} />
    : <MaterialAnomalyView rows={props.rows} onOpenDetails={props.onOpenDetails} />;
}

type FormatsWorkspaceProps = {
  canEdit?: boolean;
};

/** Formats & laizes — table seule (test de laize retiré du hub). */
export function MaterialFormatsWorkspace({ canEdit = false }: FormatsWorkspaceProps) {
  return <MaterialFormatsTable canEdit={canEdit} />;
}
