'use client';

import { useCallback, useEffect, useState } from 'react';
import { Database, Loader2, X } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { uxToast } from '@/lib/ux/feedback';

type MigrationGroup = {
  id: string;
  label: string;
  pilots: string[];
};

type Props = {
  canEdit: boolean;
  onMigrated: () => void;
};

export function ImpressionSfMigrationButton({ canEdit, onMigrated }: Props) {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<MigrationGroup[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [migrating, setMigrating] = useState<string | null>(null);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/migrate-impression-sf', { cache: 'no-store' });
      const d = await r.json();
      if (r.ok && d.ok) setGroups(d.data.groups ?? []);
    } catch { /* ignore */ }
    setLoadingMeta(false);
  }, []);

  useEffect(() => {
    if (open) void loadMeta();
  }, [open, loadMeta]);

  const runMigration = async (group: string) => {
    if (!canEdit) return;
    setMigrating(group);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/migrate-impression-sf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group, publish: true }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error?.message ?? 'Migration échouée');

      const { totalRows, created, updated, skipped } = d.data;
      const skipNote = skipped?.length ? ` · ${skipped.length} ignorée(s)` : '';
      uxToast.success(
        `Grille ISF migrée : ${totalRows} ligne(s) (${created} créées, ${updated} MAJ)${skipNote}`,
      );
      setOpen(false);
      onMigrated();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Migration échouée');
    }
    setMigrating(null);
  };

  if (!canEdit) return null;

  return (
    <>
      <AppButton
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        title="Migrer grilles statiques ISF vers BasePrintingPrice (DB)"
      >
        <Database className="h-4 w-4" /> Migrer grilles ISF
      </AppButton>

      {open && (
        <div className="mp-modal-overlay" role="presentation" onClick={() => !migrating && setOpen(false)}>
          <div
            className="mp-modal"
            role="dialog"
            aria-labelledby="isf-migration-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mp-modal-head">
              <div>
                <p className="mp-modal-kicker">Migration tarifs</p>
                <h3 id="isf-migration-title" className="mp-modal-title">Migrer grilles ISF → DB</h3>
                <p className="mp-modal-desc">
                  Copie les tarifs legacy (Offset, PCB/PCM, spéciaux) vers BasePrintingPrice publié.
                  Le POS utilisera la DB en priorité.
                </p>
              </div>
              <AppButton type="button" variant="ghost" size="icon-sm" className="p-1" onClick={() => setOpen(false)} disabled={!!migrating}>
                <X className="h-4 w-4" />
              </AppButton>
            </header>

            <div className="p-4 space-y-2 overflow-y-auto">
              {loadingMeta && <p className="text-sm opacity-70">Chargement des groupes…</p>}
              {!loadingMeta && groups.map((g) => (
                <AppButton
                  key={g.id}
                  type="button"
                  variant="ghost"
                  className="w-full text-left justify-between"
                  disabled={!!migrating}
                  onClick={() => void runMigration(g.id)}
                >
                  <span>
                    <strong className="block text-sm">{g.label}</strong>
                    <span className="text-xs text-[var(--ab2-muted)]">{g.pilots.length} grille(s)</span>
                  </span>
                  {migrating === g.id ? (
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  ) : (
                    <Database className="h-4 w-4 shrink-0 opacity-60" />
                  )}
                </AppButton>
              ))}

              <AppButton
                type="button"
                variant="default"
                className="w-full mt-2"
                disabled={!!migrating}
                onClick={() => void runMigration('all')}
              >
                {migrating === 'all' ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Migration complète…</>
                ) : (
                  'Migrer toutes les grilles ISF'
                )}
              </AppButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
