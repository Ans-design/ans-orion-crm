'use client';

import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { LoadingState } from '@/components/ui/loading-state';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { uxToast } from '@/lib/ux/feedback';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { formatExcelRowId } from '@/lib/backoffice/material-main-reference';

type AuditRow = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  entityLabel: string | null;
  userName: string | null;
  createdAt: string;
  module: string;
};

export function BackofficeAuditLogPanel() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/audit-log?limit=120', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setRows(d.data ?? []);
      else uxToast.error(d.error?.message ?? 'Erreur chargement audit');
    } catch {
      uxToast.error('Erreur réseau');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    await load();
    uxToast.success('Données mises à jour');
  };

  if (loading && rows.length === 0) {
    return <LoadingState message="Chargement de l’audit…" size="sm" />;
  }

  return (
    <div>
      <div className="ab2-toolbar mb-3 flex justify-end gap-2">
        <ExcelTableActions
          fileStem="audit-log"
          sheetName="Audit"
          getExportRows={() =>
            rows.map((r, i) => ({
              DATE: new Date(r.createdAt).toLocaleString('fr-FR'),
              UTILISATEUR: r.userName ?? '',
              ACTION: r.action,
              ENTITÉ: r.entity,
              LIBELLÉ: r.entityLabel ?? r.entityId ?? '',
              MODULE: r.module,
              ID: formatExcelRowId(i + 1),
            }))
          }
          validateRows={(list) => (list.length ? { ok: true } : { ok: false, message: 'Aucune ligne' })}
        />
        <AppButton type="button" variant="ghost" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`inline h-3.5 w-3.5 mr-1${loading ? ' animate-spin' : ''}`} />
          Actualiser
        </AppButton>
      </div>
      {rows.length === 0 ? (
        <AdminEmptyState
          title="Aucune entrée audit"
          description="Les actions backoffice apparaîtront ici après publication, sync ou modification."
        />
      ) : (
        <div className="orion-admin-table-card">
          <div className="orion-admin-table-scroll">
            <table className="ab2-table orion-admin-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Utilisateur</th>
            <th>Action</th>
            <th>Entité</th>
            <th>Libellé</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.createdAt).toLocaleString('fr-FR')}</td>
              <td>{r.userName ?? '—'}</td>
              <td>{r.action}</td>
              <td>{r.entity}</td>
              <td>{r.entityLabel ?? r.entityId ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
          </div>
        </div>
      )}
    </div>
  );
}
