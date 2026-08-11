'use client';

import { CheckCircle, RotateCcw } from 'lucide-react';
import type { AdminConfigSnapshot } from '@/lib/admin-config/types';

type Props = {
  config: AdminConfigSnapshot;
  canEdit: boolean;
  canViewMargin: boolean;
  onUpdateVariable: (key: string, value: number | string) => void;
};

export function AdminControlVariablesTab({
  config,
  canEdit,
  canViewMargin,
  onUpdateVariable,
}: Props) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Object.values(config.variables)
        .filter((v) => canViewMargin || v.category !== 'margin')
        .map((v) => (
          <div key={v.key} className="orion-card-interactive p-3">
            <div className="orion-text-meta">{v.category}</div>
            <div className="font-medium text-sm mt-0.5">{v.label}</div>
            {canEdit ? (
              <input
                type="text"
                value={String(v.value)}
                onChange={(e) => {
                  const val = e.target.value;
                  const num = parseFloat(val);
                  onUpdateVariable(
                    v.key,
                    Number.isFinite(num) && val.trim() !== '' ? num : val,
                  );
                }}
                className="mt-2 w-full bg-background border border-border rounded-lg px-2 py-1.5 font-mono text-sm"
              />
            ) : (
              <div className="font-mono font-bold text-[var(--accent-primary,#FF174D)] mt-1">{v.value} {v.unit}</div>
            )}
          </div>
        ))}
      {!canViewMargin && (
        <p className="col-span-full text-xs text-muted-foreground italic">
          Variables marge / remise max — visibles direction & finance uniquement.
        </p>
      )}
    </div>
  );
}

type FeatureProps = {
  config: AdminConfigSnapshot;
  canEdit: boolean;
  onToggleFeature: (key: string) => void;
};

export function AdminControlFonctionsTab({ config, canEdit, onToggleFeature }: FeatureProps) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {Object.values(config.featureFlags).map((f) => (
        <div key={f.key} className="orion-card-interactive p-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-semibold text-sm">{f.label}</div>
            {f.description && <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>}
            <p className="orion-text-meta mt-1">Rôles : {f.rolesAllowed.join(', ')}</p>
          </div>
          {canEdit ? (
            <button
              type="button"
              onClick={() => onToggleFeature(f.key)}
              className={`px-3 py-1 rounded-full text-xs font-bold ${f.enabled ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-400'}`}
            >
              {f.enabled ? 'ON' : 'OFF'}
            </button>
          ) : (
            f.enabled ? <CheckCircle size={18} className="text-green-500" /> : <span className="text-xs text-muted-foreground">OFF</span>
          )}
        </div>
      ))}
    </div>
  );
}

type VersionRow = {
  id: string;
  version: number;
  label?: string;
  publishedAt: string;
  status: string;
};

type VersionsProps = {
  versions: VersionRow[];
  canEdit: boolean;
  onRollback: (version: number) => void;
};

export function AdminControlVersionsTab({ versions, canEdit, onRollback }: VersionsProps) {
  return (
    <div className="space-y-2">
      {versions.map((v) => (
        <div key={v.id} className="orion-card-interactive p-4 flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold">{v.label || `v${v.version}`}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(v.publishedAt).toLocaleString('fr-FR')} · {v.status}
            </div>
          </div>
          {canEdit && v.status === 'published' && (
            <button
              type="button"
              onClick={() => onRollback(v.version)}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-accent"
            >
              <RotateCcw size={12} /> Restaurer
            </button>
          )}
        </div>
      ))}
      {versions.length === 0 && (
        <p className="text-center text-muted-foreground py-8">
          Aucune version archivée — publiez pour créer l&apos;historique
        </p>
      )}
    </div>
  );
}
