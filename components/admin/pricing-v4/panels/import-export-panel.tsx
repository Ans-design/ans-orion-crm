'use client';

import { useCallback, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { AdminExcelModulesHub } from '@/components/admin/AdminExcelModulesHub';
import { AppButton } from '@/components/ui/app-ui';

type Props = { canEdit: boolean };

export function ImportExportPanel({ canEdit }: Props) {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);

  const exportCatalogPos = async () => {
    try {
      const r = await fetch('/api/export/catalog-pos', { credentials: 'include' });
      if (!r.ok) throw new Error('Export échoué');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orion-catalog-pos-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      uxToast.success('Catalogue POS exporté');
    } catch {
      uxToast.error('Export catalogue POS impossible');
    }
  };

  const exportConfig = async () => {
    try {
      const r = await fetch('/api/admin-config/export');
      if (!r.ok) throw new Error('Export échoué');
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orion-config-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      uxToast.success('Export téléchargé');
    } catch {
      uxToast.error('Export impossible');
    }
  };

  const exportArticles = async () => {
    try {
      const r = await fetch('/api/backoffice/articles?limit=500');
      const d = await r.json();
      if (!r.ok) throw new Error(getApiErrorMessage(d, 'Erreur'));
      const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orion-articles-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      uxToast.success('Articles exportés');
    } catch {
      uxToast.error('Export articles impossible');
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !canEdit) return;
    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text) as Record<string, unknown>;
      setPreview(json);
      uxToast.success('Fichier lu — prévisualisation ci-dessous');
    } catch {
      uxToast.error('Fichier JSON invalide');
      setPreview(null);
    }
    setImporting(false);
    e.target.value = '';
  };

  const confirmImport = async () => {
    if (!preview || !canEdit) return;
    setImporting(true);
    try {
      const r = await fetch('/api/admin-config/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: preview, mode: 'draft' }),
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success('Import en brouillon — publiez depuis Versions');
        setPreview(null);
      } else uxToast.error(getApiErrorMessage(d, 'Import refusé'), 'Import refusé');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setImporting(false);
  };

  return (
    <div className="space-y-4">
      <AdminExcelModulesHub canEdit={canEdit} />

      <div className="pta-panel space-y-3">
        <h3 className="orion-section-title">Export</h3>
        <div className="flex flex-wrap gap-2">
          <AppButton type="button" variant="ghost" size="sm" onClick={exportCatalogPos}>
            Export catalogue POS publié
          </AppButton>
          <AppButton type="button" variant="ghost" size="sm" onClick={exportConfig}>
            Export config JSON
          </AppButton>
          <AppButton type="button" variant="ghost" size="sm" onClick={exportArticles}>
            Export articles
          </AppButton>
          <AppButton
            type="button"
            variant="ghost"
            size="sm"
            onClick={async () => {
              const r = await fetch('/api/dynamic-pricing');
              const d = await r.json();
              if (r.ok) {
                const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'orion-pricing.json';
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
          >
            Export pricing dynamique
          </AppButton>
        </div>
      </div>

      <div className="pta-panel space-y-3">
        <h3 className="orion-section-title">Import</h3>
        <p className="text-xs text-muted-foreground">
          Les imports créent des éléments en <strong>brouillon</strong> par défaut. Validation requise avant publication.
        </p>
        {canEdit && (
          <AppButton asChild variant="default" size="sm" className="cursor-pointer">
            <label>
              Choisir fichier JSON
              <input type="file" accept=".json,application/json" className="hidden" onChange={onFile} disabled={importing} />
            </label>
          </AppButton>
        )}
        {preview && (
          <div className="space-y-2">
            <pre className="orion-text-code max-h-48 overflow-auto p-2 bg-accent rounded">
              {JSON.stringify(preview, null, 2).slice(0, 4000)}
              {JSON.stringify(preview).length > 4000 ? '\n…' : ''}
            </pre>
            {canEdit && (
              <AppButton type="button" variant="default" size="sm" onClick={confirmImport} disabled={importing}>
                {importing ? 'Import…' : 'Importer en brouillon'}
              </AppButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
