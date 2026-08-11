'use client';

import { useCallback, useEffect, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import type { ArticleTemplate } from '@/lib/data/article-templates';
import { BackofficeLoading, BackofficeError } from '@/components/admin/pricing-v4/backoffice-panel-state';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';

type Props = {
  canEdit: boolean;
  onCreateFromTemplate?: (templateId: string) => void;
};

export function ArticleTemplatesPanel({ canEdit, onCreateFromTemplate }: Props) {
  const [templates, setTemplates] = useState<ArticleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/backoffice/article-templates');
      const d = await r.json();
      if (r.ok) setTemplates(d.templates ?? []);
      else setError(d.error || 'Chargement impossible');
    } catch {
      setError('Erreur réseau');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <BackofficeLoading message="Chargement modèles…" />;
  }

  if (error) {
    return <BackofficeError message={error} onRetry={load} />;
  }

  return (
    <div className="pta-panel space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground mb-0">
          Modèles pour créer des articles sans tout configurer depuis zéro. Chaque article peut adapter le modèle.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="ghost" size="sm" onClick={() => void load()}>
            <RefreshCw className="inline h-3.5 w-3.5 mr-1" />
            Actualiser
          </AppButton>
          <ExcelTableActions
            fileStem="modeles-articles"
            sheetName="Modèles"
            canImport={false}
            getExportRows={() =>
              templates.map((t, i) => ({
                ID: String(i + 1).padStart(3, '0'),
                MODÈLE: t.id,
                LIBELLÉ: t.label,
                FAMILLE: t.family,
                CALCUL: t.calculationType,
                UNITÉ: t.saleUnit,
                DESCRIPTION: t.description,
                VARIABLES: t.defaultVariables.join(', '),
                EXEMPLES: t.exampleArticleIds.join(', '),
              }))
            }
          />
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <article key={t.id} className="pta-subpanel">
            <div className="pta-subpanel-title">{t.label}</div>
            <p className="text-xs text-muted-foreground mb-2">{t.description}</p>
            <dl className="text-[11px] space-y-1 text-muted-foreground">
              <div><dt className="inline font-semibold">Famille :</dt> {t.family}</div>
              <div><dt className="inline font-semibold">Calcul :</dt> {t.calculationType}</div>
              <div><dt className="inline font-semibold">Unité :</dt> {t.saleUnit}</div>
              <div><dt className="inline font-semibold">Variables :</dt> {t.defaultVariables.join(', ')}</div>
            </dl>
            {canEdit && (
              <AppButton
                type="button"
                variant="default"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  const articleId = window.prompt(
                    `Identifiant article pour « ${t.label} »`,
                    `${t.id.split('-')[0]}-nouveau-${Date.now().toString(36).slice(-4)}`,
                  );
                  if (!articleId?.trim()) return;
                  try {
                    const r = await fetch(`/api/backoffice/article-templates/${encodeURIComponent(t.id)}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ articleId: articleId.trim(), articleLabel: t.label }),
                    });
                    const d = await r.json();
                    if (r.ok) {
                      uxToast.success(`Article ${articleId} créé`);
                      onCreateFromTemplate?.(articleId.trim());
                    } else uxToast.error(getApiErrorMessage(d, 'Création impossible'), 'Création impossible');
                  } catch {
                    uxToast.error('Erreur réseau');
                  }
                }}
              >
                Créer article depuis ce modèle
              </AppButton>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
