'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  entityLabel: string | null;
  userName: string | null;
  createdAt: string;
  module?: string;
};

type Props = {
  /** Libellé métier (ex. matières, articles) */
  entityLabel: string;
  /** Code technique journal (ex. BaseMaterial) — filtre API si fourni */
  entityCode?: string;
};

/**
 * Historique Admin — journal d'audit réel (plus un simple texte).
 * Conservé sous le nom Placeholder pour ne pas casser les imports existants.
 */
export function AdminHistoriquePlaceholder({ entityLabel, entityCode }: Props) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: '80' });
      if (entityCode) qs.set('entity', entityCode);
      const r = await fetch(`/api/admin-backoffice/audit-log?${qs}`, { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setRows(d.data ?? []);
      else uxToast.error(d.error?.message ?? 'Historique indisponible');
    } catch {
      uxToast.error('Erreur réseau historique');
    }
    setLoading(false);
  }, [entityCode]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-lg border border-border bg-card/60 p-4 text-sm space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">Historique — {entityLabel}</p>
          <p className="text-xs text-muted-foreground">
            Publications, archivages et modifications sensibles
            {entityCode ? (
              <>
                {' '}
                · filtre <code className="text-[11px]">{entityCode}</code>
              </>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-muted"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5${loading ? ' animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {loading && rows.length === 0 ? (
        <p className="text-muted-foreground text-xs">Chargement…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[7px] border border-dashed border-border px-4 py-8 text-center">
          <p className="m-0 text-sm font-medium text-foreground">Aucun historique pour ce filtre</p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Les publications, imports et archivages apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="orion-admin-table-scroll overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Utilisateur</th>
                <th className="py-2 pr-2">Action</th>
                <th className="py-2 pr-2">Entité</th>
                <th className="py-2">Libellé</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-border/60">
                  <td className="py-1.5 pr-2 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString('fr-FR')}
                  </td>
                  <td className="py-1.5 pr-2">{row.userName ?? '—'}</td>
                  <td className="py-1.5 pr-2">{row.action}</td>
                  <td className="py-1.5 pr-2 font-mono text-[11px]">{row.entity}</td>
                  <td className="py-1.5">{row.entityLabel ?? row.entityId ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
