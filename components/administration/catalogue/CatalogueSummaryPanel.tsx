'use client';


import { AppButton } from '@/components/ui/app-ui';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChipArticleSummary } from '@/lib/server/modules/backoffice-v2/admin-backoffice-chips.types';
import type { CatalogueArticleHealth } from '@/lib/administration/catalogue-pos-studio';
import { OrionToggle } from '@/components/backoffice-v2/pricing-custom/material-prices/OrionToggle';
import { CATEGORIES } from '@/lib/data/catalogue';
import { adminStatusLabel } from '@/lib/administration/admin-ui-vocab';

type Props = {
  article: ChipArticleSummary | null;
  health: CatalogueArticleHealth | null;
  canEdit: boolean;
  publishing: boolean;
  syncing: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
  onDuplicate: () => void;
  onSyncPos: () => void;
  onTogglePos: (visible: boolean) => void;
  onChangeCategory?: (familyLabel: string) => Promise<void> | void;
};

export function CatalogueSummaryPanel({
  article,
  health,
  canEdit,
  publishing,
  syncing,
  onSaveDraft,
  onPublish,
  onDuplicate,
  onSyncPos,
  onTogglePos,
  onChangeCategory,
}: Props) {
  const [busyCat, setBusyCat] = useState(false);

  if (!article) {
    return (
      <aside className="orion-catalogue-summary" aria-label="Résumé article">
        <p className="text-sm text-muted-foreground">
          Sélectionnez un article dans la colonne de gauche pour voir le résumé, la santé et les actions de publication.
        </p>
      </aside>
    );
  }

  const statusLabel = adminStatusLabel(article.status);
  const currentCatId = article.categoryId ?? article.category;

  return (
    <aside className="orion-catalogue-summary" aria-label="Résumé article">
      <div>
        <p className="orion-catalogue-summary-title">Résumé</p>
        <h2 className="orion-catalogue-summary-name">{article.articleLabel}</h2>
        <p className="orion-catalogue-summary-ref">{article.articleId}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {article.family || article.category} · {article.activeCount} chips actives
        </p>
        {article.categoryNeedsReview ? (
          <p className="text-xs text-amber-700 mt-1">
            Catégorie à vérifier → {article.suggestedCategory ?? '—'}
          </p>
        ) : null}
      </div>

      {canEdit && onChangeCategory ? (
        <div>
          <p className="orion-catalogue-summary-title">Catégorie POS</p>
          <select
            className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm"
            aria-label="Changer catégorie"
            disabled={busyCat}
            value={CATEGORIES.some((c) => c.id === currentCatId) ? currentCatId : ''}
            onChange={(e) => {
              const id = e.target.value;
              const label = CATEGORIES.find((c) => c.id === id)?.label;
              if (!label) return;
              setBusyCat(true);
              void Promise.resolve(onChangeCategory(label)).finally(() => setBusyCat(false));
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
        </div>
      ) : null}

      <div>
        <p className="orion-catalogue-summary-title">Santé / complétude</p>
        {health ? (
          <ul className="orion-catalogue-health-list">
            <li className={health.hasVariables ? 'is-ok' : 'is-missing'}>
              <span>Variables</span>
              <span>{health.hasVariables ? 'OK' : 'À compléter'}</span>
            </li>
            <li className={health.hasChips ? 'is-ok' : 'is-missing'}>
              <span>Chips liées</span>
              <span>{health.hasChips ? 'OK' : 'Manquant'}</span>
            </li>
            <li className={health.hasPrice ? 'is-ok' : 'is-missing'}>
              <span>Prix renseigné</span>
              <span>{health.hasPrice ? 'OK' : 'Manquant'}</span>
            </li>
            <li className={health.hasMaterials ? 'is-ok' : 'is-missing'}>
              <span>Matières liées</span>
              <span>{health.hasMaterials ? 'OK' : 'Optionnel'}</span>
            </li>
            <li className={health.hasMockup ? 'is-ok' : 'is-missing'}>
              <span>Mockup</span>
              <span>{health.hasMockup ? 'OK' : 'À définir'}</span>
            </li>
            <li className={health.hasAnomalies ? 'is-missing' : 'is-ok'}>
              <span>Anomalies</span>
              <span>{health.hasAnomalies ? `${article.anomalyCount}` : 'Aucune'}</span>
            </li>
            <li className={health.readyToPublish ? 'is-ok' : 'is-missing'}>
              <span>Prêt à publier</span>
              <span>{health.readyToPublish ? 'Oui' : 'Non'}</span>
            </li>
          </ul>
        ) : null}
      </div>

      {canEdit ? (
        <div className="orion-catalogue-summary-actions">
          <AppButton type="button" variant="outline" className="text-sm" onClick={onSaveDraft}>
            Enregistrer brouillon
          </AppButton>
          <AppButton type="button" variant="default" className="text-sm" onClick={onPublish}
            disabled={publishing || (health?.hasAnomalies ?? false)}
            title={health?.hasAnomalies ? 'Corrigez les anomalies avant publication' : undefined}>
            {publishing ? 'Publication…' : 'Publier'}
          </AppButton>
          <AppButton type="button" variant="outline" className="text-sm" onClick={onDuplicate}>
            Dupliquer
          </AppButton>
          <AppButton type="button" variant="outline" className="text-sm" onClick={onSyncPos} disabled={syncing}>
            {syncing ? 'Sync…' : 'Sync POS'}
          </AppButton>
        </div>
      ) : null}

      <div>
        <p className="orion-catalogue-summary-title">Visibilité POS</p>
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span>Carte catalogue</span>
          <OrionToggle
            variant="pos"
            checked={article.visiblePos}
            disabled={!canEdit}
            onChange={onTogglePos}
            label={article.visiblePos ? 'Visible POS' : 'Masqué POS'}
          />
        </div>
        <span className={cn('orion-catalogue-badge mt-2 inline-block', article.status === 'published' ? 'is-published' : 'is-draft')}>
          {statusLabel}
        </span>
      </div>

      <div className="orion-catalogue-preview-card">
        <p className="orion-catalogue-summary-title">Aperçu rapide</p>
        <div className="orion-catalogue-preview-card-thumb" aria-hidden>
          📦
        </div>
        <h4>{article.articleLabel}</h4>
        <p>
          {article.visiblePos ? 'Visible dans le POS' : 'Masqué du POS'}
          {' · '}
          {article.priceImpactCount} impacts prix
        </p>
      </div>
    </aside>
  );
}
