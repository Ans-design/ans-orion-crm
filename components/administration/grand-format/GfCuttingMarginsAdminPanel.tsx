'use client';

/**
 * Admin — marges découpe A0→A5 (source de vérité → runtime POS / devis).
 */

import { useCallback, useEffect, useState } from 'react';
import { Scissors, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { DEFAULT_GF_CUTTING_MARGINS } from '@/lib/grand-format/cutting-margins';

type MarginRow = {
  id?: string;
  formatCode: string;
  surfaceRatio: number;
  marginPercent: number;
  motif: string;
  active: boolean;
  comment?: string | null;
  sortOrder?: number;
};

const API = '/api/admin-backoffice/direct-sale/grand-format/cutting-margins';

function defaultsAsRows(): MarginRow[] {
  return DEFAULT_GF_CUTTING_MARGINS.map((r, i) => ({
    formatCode: r.formatCode,
    surfaceRatio: r.surfaceRatio,
    marginPercent: r.marginPercent,
    motif: r.motif,
    active: r.active,
    comment: r.comment ?? null,
    sortOrder: i,
  }));
}

export function GfCuttingMarginsAdminPanel({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<MarginRow[]>(defaultsAsRows());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(API, { credentials: 'include' });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        data?: MarginRow[];
        error?: string | { message?: string };
      };
      if (!res.ok || !json.ok) {
        const msg =
          typeof json.error === 'string' ? json.error : json.error?.message || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      if (Array.isArray(json.data) && json.data.length > 0) {
        setRows(
          json.data.map((r, i) => ({
            id: r.id,
            formatCode: r.formatCode,
            surfaceRatio: Number(r.surfaceRatio),
            marginPercent: Number(r.marginPercent),
            motif: r.motif || '',
            active: r.active !== false,
            comment: r.comment ?? null,
            sortOrder: r.sortOrder ?? i,
          })),
        );
      }
    } catch (e) {
      toast({
        title: 'Chargement marges découpe',
        description: e instanceof Error ? e.message : 'Erreur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = (formatCode: string, patchRow: Partial<MarginRow>) => {
    setRows((prev) => prev.map((r) => (r.formatCode === formatCode ? { ...r, ...patchRow } : r)));
  };

  const saveAll = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
      for (const r of rows) {
        const res = await fetch(API, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formatCode: r.formatCode,
            surfaceRatio: r.surfaceRatio,
            marginPercent: r.marginPercent,
            motif: r.motif,
            active: r.active,
            comment: r.comment ?? null,
            sortOrder: r.sortOrder ?? 0,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string | { message?: string };
        };
        if (!res.ok || !json.ok) {
          const msg =
            typeof json.error === 'string'
              ? json.error
              : json.error?.message || `Échec ${r.formatCode}`;
          throw new Error(msg);
        }
      }
      toast({
        title: 'Marges découpe enregistrées',
        description: 'Appliquées au calcul GF (POS / devis) dès le prochain prix.',
      });
      await load();
    } catch (e) {
      toast({
        title: 'Enregistrement impossible',
        description: e instanceof Error ? e.message : 'Erreur',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mb-6 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Scissors className="mt-0.5 h-5 w-5 text-[#FF174D]" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-foreground">Marges découpe A0 → A5</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Plus le format est petit, plus la marge % est élevée (risque / chute). Source de vérité Admin → runtime
              GF. A0 = référence (0 %).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-lg" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Recharger
          </Button>
          {canEdit && (
            <Button
              type="button"
              size="sm"
              className="rounded-lg bg-[#FF174D] text-white hover:bg-[#a8002a]"
              onClick={() => void saveAll()}
              disabled={saving || loading}
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Format</th>
              <th className="px-3 py-2 font-medium">Ratio vs A0</th>
              <th className="px-3 py-2 font-medium">Marge %</th>
              <th className="px-3 py-2 font-medium">Motif</th>
              <th className="px-3 py-2 font-medium">Actif</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.formatCode} className="border-t border-border">
                <td className="px-3 py-2 font-semibold tabular-nums">{r.formatCode}</td>
                <td className="px-3 py-2">
                  <Label className="sr-only">Ratio {r.formatCode}</Label>
                  <Input
                    type="number"
                    step="0.001"
                    min={0}
                    className="h-8 w-24 rounded-lg tabular-nums"
                    value={r.surfaceRatio}
                    disabled={!canEdit || loading}
                    onChange={(e) => patch(r.formatCode, { surfaceRatio: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Label className="sr-only">Marge % {r.formatCode}</Label>
                  <Input
                    type="number"
                    step="1"
                    min={0}
                    max={100}
                    className="h-8 w-20 rounded-lg tabular-nums"
                    value={r.marginPercent}
                    disabled={!canEdit || loading}
                    onChange={(e) => patch(r.formatCode, { marginPercent: Number(e.target.value) || 0 })}
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    className="h-8 rounded-lg"
                    value={r.motif}
                    disabled={!canEdit || loading}
                    onChange={(e) => patch(r.formatCode, { motif: e.target.value })}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#FF174D]"
                    checked={r.active}
                    disabled={!canEdit || loading}
                    onChange={(e) => patch(r.formatCode, { active: e.target.checked })}
                    aria-label={`Actif ${r.formatCode}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
