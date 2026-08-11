'use client';

import { useState } from 'react';
import { Copy, Archive, Eye } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { AppButton } from '@/components/ui/app-ui';
import type { MaterialDto } from '@/lib/server/modules/pricing/base-material.dto';

type PendingConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  variant?: 'default' | 'destructive';
  run: () => void | Promise<void>;
};

type Props = {
  row: MaterialDto;
  canEdit: boolean;
  onChanged: () => void;
  onViewUsage: (row: MaterialDto) => void;
};

export function MaterialRowActions({ row, canEdit, onChanged, onViewUsage }: Props) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  if (!canEdit) {
    return (
      <AppButton type="button" variant="outline" className="text-xs" onClick={() => onViewUsage(row)}>
        <Eye className="h-3 w-3" /> Usage
      </AppButton>
    );
  }

  const duplicate = () => {
    setPending({
      title: 'Dupliquer cette matière ?',
      description: 'Une nouvelle variante en brouillon sera créée.',
      confirmLabel: 'Dupliquer',
      run: async () => {
        const grammage = prompt('Nouveau grammage (optionnel)', row.grammage ?? '');
        const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${row.id}/duplicate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: grammage ? `${row.name.split(' ')[0]} ${grammage}` : undefined,
            grammage: grammage || row.grammage,
          }),
        });
        const d = await r.json();
        if (r.ok && d.ok) {
          uxToast.success('Matière dupliquée (brouillon)');
          onChanged();
        } else {
          uxToast.error(typeof d.error === 'string' ? d.error : d.error?.message ?? 'Erreur duplication');
        }
      },
    });
  };

  const archive = () => {
    setPending({
      title: 'Archiver cette matière ?',
      description: 'Elle sera conservée pour l\'historique.',
      confirmLabel: 'Archiver',
      variant: 'destructive',
      run: async () => {
        const r = await fetch(`/api/admin-backoffice/pricing/base-materials/${row.id}/archive`, { method: 'POST' });
        const d = await r.json();
        if (r.ok && d.ok) {
          uxToast.success('Matière archivée');
          onChanged();
        } else {
          uxToast.error(typeof d.error === 'string' ? d.error : d.error?.message ?? 'Erreur archivage');
        }
      },
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-1">
        <AppButton type="button" variant="outline" className="text-xs" onClick={duplicate} title="Dupliquer">
          <Copy className="h-3 w-3" />
        </AppButton>
        <AppButton type="button" variant="outline" className="text-xs" onClick={() => onViewUsage(row)} title="Usage">
          <Eye className="h-3 w-3" />
        </AppButton>
        <AppButton type="button" variant="outline" className="text-xs" onClick={archive} title="Archiver">
          <Archive className="h-3 w-3" />
        </AppButton>
      </div>
      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(next) => {
          if (!next) setPending(null);
        }}
        title={pending?.title ?? ''}
        description={pending?.description}
        confirmLabel={pending?.confirmLabel}
        variant={pending?.variant}
        onConfirm={() => {
          void pending?.run();
          setPending(null);
        }}
      />
    </>
  );
}

export function MaterialAnomalyBadge({ anomalies }: { anomalies: string[] }) {
  if (!anomalies.length) return <span>—</span>;
  return (
    <span className="ab2-badge ab2-badge-warning" title={anomalies.join('; ')}>
      {anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''}
    </span>
  );
}
