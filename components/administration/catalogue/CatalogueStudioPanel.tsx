'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CatalogueStudioTab } from '@/lib/administration/catalogue-pos-studio';
import { CATALOGUE_STUDIO_TABS } from '@/lib/administration/catalogue-pos-studio';
import { OptionsChipsWorkspace } from '@/components/backoffice-v2/options/OptionsChipsWorkspace';
import { OptionsLoadingState } from '@/components/backoffice-v2/options/OptionsLoadingState';
import type { ArticleChipsPayload, ChipArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import { BackofficeAuditLogPanel } from '@/components/backoffice-v2/audit/BackofficeAuditLogPanel';
import { OrionToggle } from '@/components/backoffice-v2/pricing-custom/material-prices/OrionToggle';
import { CATEGORIES } from '@/lib/data/catalogue';
import { OptionDependenciesPanel } from '@/components/administration/catalogue/OptionDependenciesPanel';
import { stripArchivedDisplayPrefix } from '@/lib/administration/catalogue-display-label';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type Props = {
  articleId: string | null;
  article: ChipArticleSummary | null;
  studioTab: CatalogueStudioTab;
  onStudioTabChange: (tab: CatalogueStudioTab) => void;
  canEdit: boolean;
  onArticleUpdated: () => void;
  onTogglePos: (visible: boolean) => void;
  onChangeCategory?: (familyLabel: string) => Promise<void> | void;
  /** Modèle sélectionné (pas encore d’article) — CTA création */
  selectedTemplate?: { id: string; label: string } | null;
  onCreateFromTemplate?: () => void;
  createFromTemplateLoading?: boolean;
};

type VariableRow = {
  fieldKey: string;
  blockLabel: string;
  chipCount: number;
  activeCount: number;
  posCount: number;
  priceCount: number;
};

export function CatalogueStudioPanel({
  articleId,
  article,
  studioTab,
  onStudioTabChange,
  canEdit,
  onArticleUpdated,
  onTogglePos,
  onChangeCategory,
  selectedTemplate = null,
  onCreateFromTemplate,
  createFromTemplateLoading = false,
}: Props) {
  const [chipsPayload, setChipsPayload] = useState<ArticleChipsPayload | null>(null);
  const [chipsLoading, setChipsLoading] = useState(false);

  const loadChips = useCallback(async (id: string) => {
    setChipsLoading(true);
    try {
      const r = await fetch(`/api/admin-backoffice/options/articles/${id}/chips?includeArchived=1`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setChipsPayload(d.data);
      else setChipsPayload(null);
    } catch {
      setChipsPayload(null);
    }
    setChipsLoading(false);
  }, []);

  useEffect(() => {
    if (!articleId) {
      setChipsPayload(null);
      return;
    }
    void loadChips(articleId);
  }, [articleId, loadChips]);

  const variableRows = useMemo((): VariableRow[] => {
    if (!chipsPayload) return [];
    const map = new Map<string, VariableRow>();
    for (const row of chipsPayload.rows) {
      const key = `${row.blockKey}::${row.fieldKey}`;
      const existing = map.get(key);
      if (existing) {
        existing.chipCount += 1;
        if (row.active && !row.archived) existing.activeCount += 1;
        if (row.visiblePos) existing.posCount += 1;
        if (row.impactsPrice) existing.priceCount += 1;
      } else {
        map.set(key, {
          fieldKey: row.fieldKey,
          blockLabel: row.blockLabel,
          chipCount: 1,
          activeCount: row.active && !row.archived ? 1 : 0,
          posCount: row.visiblePos ? 1 : 0,
          priceCount: row.impactsPrice ? 1 : 0,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.blockLabel.localeCompare(b.blockLabel, 'fr'));
  }, [chipsPayload]);

  if (!articleId) {
    if (selectedTemplate) {
      return (
        <main className="orion-catalogue-studio">
          <div className="orion-catalogue-studio-empty p-4 space-y-3">
            <p className="m-0 text-sm font-semibold">Modèle · {selectedTemplate.label}</p>
            <p className="m-0 text-xs text-muted-foreground leading-relaxed">
              Créez un article à partir de ce modèle pour configurer chips, prix et visibilité POS.
            </p>
            {canEdit && onCreateFromTemplate ? (
              <button
                type="button"
                className="rounded-[7px] bg-[#cc0033] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                onClick={onCreateFromTemplate}
                disabled={createFromTemplateLoading}
              >
                {createFromTemplateLoading ? 'Création…' : 'Créer article depuis ce modèle'}
              </button>
            ) : null}
          </div>
        </main>
      );
    }
    return (
      <main className="orion-catalogue-studio">
        <div className="orion-catalogue-studio-empty p-4">
          <p className="m-0 text-sm font-semibold">Options / Chips</p>
          <p className="m-0 mt-1 text-xs text-muted-foreground leading-relaxed">
            Sélectionnez un produit à gauche pour gérer les options, la visibilité POS et les variables.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="orion-catalogue-studio">
      {studioTab !== 'chips' ? (
        <nav className="orion-catalogue-studio-tabs" aria-label="Onglets secondaires">
          {CATALOGUE_STUDIO_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={cn(studioTab === t.id && 'active', t.id === 'chips' && 'is-primary-tab')}
              onClick={() => onStudioTabChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      ) : (
        <div className="orion-catalogue-studio-tabs orion-catalogue-studio-tabs--inline">
          <span className="orion-catalogue-studio-primary-label">Options / Chips</span>
          <div className="orion-catalogue-studio-secondary-tabs">
            {CATALOGUE_STUDIO_TABS.filter((t) => t.id !== 'chips').map((t) => (
              <button
                key={t.id}
                type="button"
                className={cn('is-secondary', studioTab === t.id && 'active')}
                onClick={() => onStudioTabChange(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="orion-catalogue-studio-body">
        {studioTab === 'chips' && (
          <div className="orion-catalogue-embedded">
            {article ? (
              <div className="orion-catalogue-chips-toolbar">
                <div className="orion-catalogue-chips-article-bar">
                  <div>
                    <strong className="text-sm text-foreground" title={article.articleLabel}>
                      {stripArchivedDisplayPrefix(article.articleLabel)}
                    </strong>
                    <span className="orion-catalogue-badge ml-2 inline-block is-draft font-mono text-[10px]">{article.articleId}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={cn('orion-catalogue-badge', article.status === 'published' ? 'is-published' : 'is-draft')}>
                      {adminStatusLabel(article.status)}
                    </span>
                    {article.anomalyCount > 0 ? (
                      <span className="orion-catalogue-badge is-warn">{article.anomalyCount} anomalie(s)</span>
                    ) : null}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Article visible POS</span>
                      <OrionToggle
                        variant="pos"
                        checked={article.visiblePos}
                        disabled={!canEdit}
                        onChange={onTogglePos}
                        label={article.visiblePos ? 'Visible' : 'Masqué'}
                      />
                    </div>
                    {canEdit && onChangeCategory ? (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Catégorie</span>
                        <select
                          className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground"
                          aria-label="Changer catégorie"
                          value={
                            CATEGORIES.some((c) => c.id === (article.categoryId ?? article.category))
                              ? (article.categoryId ?? article.category)
                              : ''
                          }
                          onChange={(e) => {
                            const label = CATEGORIES.find((c) => c.id === e.target.value)?.label;
                            if (!label) return;
                            void onChangeCategory(label);
                          }}
                        >
                          <option value="" disabled>
                            Choisir…
                          </option>
                          {CATEGORIES.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <span className="text-xs text-muted-foreground">{article.family || article.category}</span>
                    )}
                    {article.categoryNeedsReview ? (
                      <span className="orion-catalogue-badge is-warn">Catégorie incohérente</span>
                    ) : null}
                  </div>
                </div>
                {chipsPayload ? (
                  <div className="orion-catalogue-chips-kpis">
                    <span><strong>{chipsPayload.counts.total}</strong> chips</span>
                    <span><strong>{chipsPayload.counts.active}</strong> actives</span>
                    <span><strong>{chipsPayload.counts.archived}</strong> archivées</span>
                    <span><strong>{chipsPayload.counts.priceImpact}</strong> impact prix</span>
                  </div>
                ) : null}
              </div>
            ) : null}
            <OptionsChipsWorkspace
              canEdit={canEdit}
              initialArticleId={articleId}
              embedded
              lockedArticleId={articleId}
              onDataChanged={onArticleUpdated}
            />
          </div>
        )}

        {studioTab === 'variables' && (
          <>
            <div className="orion-catalogue-studio-tabs mb-3">
              {CATALOGUE_STUDIO_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn(studioTab === t.id && 'active')}
                  onClick={() => onStudioTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {chipsLoading ? (
              <OptionsLoadingState variant="table" rows={8} />
            ) : variableRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune variable — configurez les chips dans Options / Chips.</p>
            ) : (
              <table className="orion-catalogue-variables-table">
                <thead>
                  <tr>
                    <th>Bloc</th>
                    <th>Variable</th>
                    <th>Chips</th>
                    <th>Actives</th>
                    <th>Visible POS</th>
                    <th>Impact prix</th>
                  </tr>
                </thead>
                <tbody>
                  {variableRows.map((v) => (
                    <tr key={`${v.blockLabel}-${v.fieldKey}`}>
                      <td>{v.blockLabel}</td>
                      <td><code className="text-xs">{v.fieldKey}</code></td>
                      <td>{v.chipCount}</td>
                      <td>{v.activeCount}</td>
                      <td>{v.posCount}</td>
                      <td>{v.priceCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {studioTab === 'dependencies' && (
          <>
            <div className="orion-catalogue-studio-tabs mb-3">
              {CATALOGUE_STUDIO_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn(studioTab === t.id && 'active')}
                  onClick={() => onStudioTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <OptionDependenciesPanel
              articleId={articleId}
              canEdit={canEdit}
              fieldKeys={variableRows.map((v) => v.fieldKey)}
            />
          </>
        )}

        {studioTab === 'history' && (
          <>
            <div className="orion-catalogue-studio-tabs mb-3">
              {CATALOGUE_STUDIO_TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={cn(studioTab === t.id && 'active')}
                  onClick={() => onStudioTabChange(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Historique — article <code>{articleId}</code>
            </p>
            <BackofficeAuditLogPanel />
          </>
        )}
      </div>
    </main>
  );
}
