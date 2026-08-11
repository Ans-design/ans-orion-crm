'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppButton } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';
import { OptionsLoadingState } from '../options/OptionsLoadingState';

type Row = {
  id: string;
  articleId: string;
  materialKey: string | null;
  grammage: string | null;
  formatLabel: string | null;
  face: string;
  colorMode?: string | null;
  printTechnology?: string | null;
  saleUnit: string;
  referenceQty: number;
  basePrice: number;
  maxSafetyPrice: number | null;
  materialCost: number | null;
  printCost: number | null;
  marginPct: number | null;
  publicationStatus: string;
  active: boolean;
};

type Props = { canEdit: boolean; articleId?: string | null };

export function BasePrintingPriceTable({ canEdit, articleId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, Partial<Row>>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = articleId ? `?articleId=${encodeURIComponent(articleId)}` : '';
      const r = await fetch(`/api/admin-backoffice/pricing/base-printing${qs}`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setRows(d.data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => { load(); }, [load]);

  const save = async (id: string, extra?: Record<string, unknown>) => {
    if (!canEdit) return;
    const body = { ...drafts[id], ...extra };
    if (!Object.keys(body).length && !extra) return;
    setSavingId(id);
    try {
      const r = await fetch(`/api/admin-backoffice/pricing/base-printing/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (r.ok) {
        uxToast.success(extra?.publicationStatus === 'published' ? 'Publié → POS' : 'Prix base enregistré');
        setDrafts((p) => { const n = { ...p }; delete n[id]; return n; });
        // Sync règles après publication
        if (extra?.publicationStatus === 'published') {
          void fetch('/api/admin-backoffice/pricing/paper-formats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'sync' }),
          });
        }
        load();
      } else {
        uxToast.error(d.error?.message ?? d.error ?? 'Enregistrement impossible');
      }
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <OptionsLoadingState variant="table" rows={5} />;

  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun prix base impression sans finition. Importez Excel ou créez via Matières de base, puis publiez.
      </p>
    );
  }

  return (
    <div className="orion-admin-table-card">
      <div className="orion-admin-table-scroll overflow-x-auto">
      <table className="ab2-table orion-admin-table text-sm">
        <thead>
          <tr>
            <th>Article</th>
            <th>Matière</th>
            <th>Grammage</th>
            <th>Format</th>
            <th>Face</th>
            <th>Mode</th>
            <th>Techno</th>
            <th>Unité</th>
            <th>Prix base A4</th>
            <th>Statut</th>
            {canEdit && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="font-mono text-xs">{row.articleId}</td>
              <td>{row.materialKey ?? '—'}</td>
              <td>{row.grammage ?? '—'}</td>
              <td>{row.formatLabel ?? '—'}</td>
              <td>{row.face}</td>
              <td className="text-xs">{row.colorMode || '—'}</td>
              <td className="text-xs">{row.printTechnology || '—'}</td>
              <td>{row.saleUnit}</td>
              <td>
                {canEdit ? (
                  <input
                    type="number"
                    className="ab2-input w-24"
                    defaultValue={row.basePrice}
                    onChange={(e) => setDrafts((p) => ({
                      ...p,
                      [row.id]: { ...p[row.id], basePrice: Number(e.target.value) },
                    }))}
                  />
                ) : row.basePrice}
              </td>
              <td>
                <span className={row.publicationStatus === 'published' ? 'text-[#10B981] font-semibold' : 'text-amber-700'}>
                  {row.publicationStatus}
                </span>
              </td>
              {canEdit && (
                <td className="whitespace-nowrap space-x-1">
                  {drafts[row.id] && (
                    <AppButton type="button" variant="default" className="text-xs" onClick={() => void save(row.id)}>
                      {savingId === row.id ? '…' : 'OK'}
                    </AppButton>
                  )}
                  {row.publicationStatus !== 'published' && (
                    <AppButton
                      type="button"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => void save(row.id, { publicationStatus: 'published', keepPublished: true, basePrice: drafts[row.id]?.basePrice ?? row.basePrice })}
                    >
                      Publier
                    </AppButton>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
