'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { uxToast } from '@/lib/ux/feedback';
import { readApiJson } from '@/lib/api-client';
import { Truck, Plus, Save, RotateCcw, RefreshCw } from 'lucide-react';
import { SectionBlock, SectionStack } from '@/components/ui/section-layout';
import { LoadingState } from '@/components/ui/loading-state';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import { carrierToExcelRow, validateCarriersExcelRows } from '@/lib/backoffice/carriers-excel-format';
import { DEFAULT_CARRIERS, type MadagascarCarrier } from '@/lib/logistics/carriers-config';
import { AppButton } from '@/components/ui/app-ui';

type CarrierRow = MadagascarCarrier & { active?: boolean };

type Props = {
  canEdit: boolean;
};

export function LogisticsCarriersPanel({ canEdit }: Props) {
  const [rows, setRows] = useState<CarrierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const excelIdsRef = useRef<Record<string, string>>({});

  const prepareExport = useCallback(async () => {
    const r = await fetch('/api/logistics/carriers/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-export' }),
    });
    const d = await r.json();
    if (r.ok && d.ok) excelIdsRef.current = d.data?.ids ?? {};
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logistics/carriers?admin=1', { credentials: 'include' });
      const data = await readApiJson<{ carriers: CarrierRow[] }>(res);
      setRows(data.carriers?.length ? data.carriers : DEFAULT_CARRIERS.map((c) => ({ ...c, active: true })));
    } catch {
      setRows([]);
      uxToast.error('Impossible de charger les transporteurs — base vide. Importez un Excel ou réinitialisez les défauts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateRow = (index: number, patch: Partial<CarrierRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        id: `carrier-${Date.now()}`,
        label: 'Nouveau transporteur',
        type: 'transporteur',
        zones: ['Antananarivo'],
        active: true,
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch('/api/logistics/carriers', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rows),
      });
      if (!r.ok) throw new Error('save failed');
      const data = await r.json();
      setRows(data.carriers?.length ? data.carriers : rows);
      uxToast.success('Transporteurs enregistrés — modules livraison synchronisés');
    } catch {
      uxToast.error('Erreur enregistrement transporteurs');
    } finally {
      setSaving(false);
    }
  };

  const resetDefaults = () => {
    setRows(DEFAULT_CARRIERS.map((c) => ({ ...c, active: true })));
  };

  if (loading) {
    return (
      <SectionBlock title="Transporteurs Madagascar">
        <LoadingState message="Chargement référentiel…" size="sm" />
      </SectionBlock>
    );
  }

  return (
    <SectionStack>
      <SectionBlock
        title="Transporteurs & coopératives"
        description="Source de vérité backoffice — consommée par /livraisons et les rapports logistique. Les entrées masquées (active=false) restent en base sans être supprimées."
      >
        <div className="flex flex-wrap gap-2 mb-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <AppButton type="button" onClick={addRow} variant="ghost" size="sm" className="inline-flex items-center gap-1">
                <Plus size={14} /> Ajouter
              </AppButton>
              <AppButton type="button" onClick={resetDefaults} variant="ghost" size="sm" className="inline-flex items-center gap-1">
                <RotateCcw size={14} /> Réinitialiser défauts
              </AppButton>
              <AppButton type="button" onClick={save} disabled={saving} variant="default" size="sm" className="inline-flex items-center gap-1">
                <Save size={14} /> {saving ? 'Enregistrement…' : 'Publier'}
              </AppButton>
            </>
          )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              type="button"
              onClick={() => void load().then(() => uxToast.success('Transporteurs actualisés'))}
              disabled={loading || saving}
              variant="ghost"
              size="sm"
              className="inline-flex items-center gap-1"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Actualiser
            </AppButton>
            <ExcelTableActions
              fileStem="transporteurs"
              sheetName="Transporteurs"
              validateRows={validateCarriersExcelRows}
              canImport={canEdit}
              onBeforeExport={prepareExport}
              getExportRows={() =>
                rows.map((row) => carrierToExcelRow(row, excelIdsRef.current[row.id] ?? null))
              }
              onImportRows={async (incoming, ctx) => {
                const r = await fetch('/api/logistics/carriers/import-excel', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ rows: incoming, fileName: ctx?.fileName }),
                });
                const d = await r.json();
                if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
                await load();
                return d.data;
              }}
            />
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => (
            <div key={`${row.id}-${index}`} className="rounded-lg border border-border p-3 grid gap-2 md:grid-cols-2 lg:grid-cols-4 bg-card/50">
              <label className="text-xs">
                <span className="text-muted-foreground block mb-1">ID</span>
                <input
                  value={row.id}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(index, { id: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs md:col-span-2">
                <span className="text-muted-foreground block mb-1">Libellé</span>
                <input
                  value={row.label}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(index, { label: e.target.value })}
                  className="w-full bg-accent border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs">
                <span className="text-muted-foreground block mb-1">Type</span>
                <select
                  value={row.type}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(index, { type: e.target.value as CarrierRow['type'] })}
                  className="w-full bg-accent border border-border rounded-lg px-2 py-1.5 text-sm"
                >
                  <option value="interne">Interne</option>
                  <option value="coursier">Coursier</option>
                  <option value="cooperative">Coopérative</option>
                  <option value="transporteur">Transporteur</option>
                </select>
              </label>
              <label className="text-xs md:col-span-2">
                <span className="text-muted-foreground block mb-1">Zones (séparées par virgule)</span>
                <input
                  value={row.zones.join(', ')}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(index, { zones: e.target.value.split(',').map((z) => z.trim()).filter(Boolean) })}
                  className="w-full bg-accent border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs md:col-span-2">
                <span className="text-muted-foreground block mb-1">Indication contact</span>
                <input
                  value={row.contactHint ?? ''}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(index, { contactHint: e.target.value || undefined })}
                  className="w-full bg-accent border border-border rounded-lg px-2 py-1.5 text-sm"
                />
              </label>
              <label className="text-xs flex items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={row.active !== false}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(index, { active: e.target.checked })}
                />
                <span>Actif (visible livraisons)</span>
              </label>
            </div>
          ))}
        </div>
      </SectionBlock>
    </SectionStack>
  );
}
