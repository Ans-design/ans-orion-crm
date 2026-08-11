'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/app-ui';
import { Switch } from '@/components/ui/switch';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { OptionsLoadingState } from '@/components/backoffice-v2/options/OptionsLoadingState';
import { uxToast } from '@/lib/ux/feedback';
import { getApiErrorMessage } from '@/lib/api-client';
import { DEFAULT_PAPER_FORMAT_RULES } from '@/lib/pricing/paper-format-rules';
import { cn } from '@/lib/utils';

type PaperFormatRow = {
  id: string;
  formatCode: string;
  widthMm: number;
  heightMm: number;
  ratioA4: number;
  supplementAr: number;
  cutAr: number;
  formula: string | null;
  active: boolean;
  details: string | null;
  sortOrder?: number;
};

type FormatMeta = {
  unit?: 'mm' | 'cm';
  family?: string;
  group?: string;
  note?: string;
};

type Props = {
  canEdit?: boolean;
};

const MOCKUP_PRIORITY = ['A6', 'A5', 'A4', 'A3', 'A3+', 'PERSONNALISE GF', 'PERSONNALISÉ GF', 'GF'];

function tryParseMeta(details: string | null | undefined): FormatMeta {
  if (!details?.trim()) return {};
  try {
    const parsed = JSON.parse(details) as FormatMeta;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch {
    /* free-text details — ignore */
  }
  return {};
}

function serializeMeta(meta: FormatMeta, previousDetails: string | null): string | null {
  const prev = tryParseMeta(previousDetails);
  const next = { ...prev, ...meta };
  const hasUi =
    next.unit != null || next.family != null || next.group != null || Boolean(next.note);
  if (!hasUi) {
    // Preserve non-JSON free text
    if (previousDetails && !tryParseMeta(previousDetails).unit && previousDetails[0] !== '{') {
      return previousDetails;
    }
    return previousDetails?.startsWith('{') ? previousDetails : null;
  }
  return JSON.stringify(next);
}

function isGrandFormatCode(code: string): boolean {
  return /gf|personnalis|custom|sur[\s-]?mesure/i.test(code);
}

function displayMeta(row: PaperFormatRow): Required<Pick<FormatMeta, 'unit' | 'family' | 'group'>> {
  const meta = tryParseMeta(row.details);
  const gf = isGrandFormatCode(row.formatCode) || meta.unit === 'cm';
  return {
    unit: meta.unit ?? (gf ? 'cm' : 'mm'),
    family: meta.family ?? (gf ? 'Grand format' : 'Petit format'),
    group: meta.group ?? (gf ? 'Sur-mesure' : 'ISO'),
  };
}

function toDisplayDim(mm: number, unit: 'mm' | 'cm'): number {
  if (unit === 'cm') return Math.round((mm / 10) * 100) / 100;
  return Math.round(mm * 100) / 100;
}

function fromDisplayDim(value: number, unit: 'mm' | 'cm'): number {
  if (unit === 'cm') return Math.round(value * 10 * 100) / 100;
  return Math.round(value * 100) / 100;
}

function fallbackRowsFromDefaults(): PaperFormatRow[] {
  const iso = DEFAULT_PAPER_FORMAT_RULES.filter((r) =>
    ['A6', 'A5', 'A4', 'A3', 'A3+'].includes(r.formatCode),
  ).map((r, i) => ({
    id: `local-${r.formatCode}`,
    formatCode: r.formatCode,
    widthMm: r.widthMm,
    heightMm: r.heightMm,
    ratioA4: r.ratioA4,
    supplementAr: r.supplementAr,
    cutAr: r.cutAr,
    formula: r.formula ?? null,
    active: r.active !== false,
    details: null,
    sortOrder: i,
  }));
  return [
    ...iso,
    {
      id: 'local-PERSONNALISE-GF',
      formatCode: 'Personnalisé GF',
      widthMm: 1000,
      heightMm: 1000,
      ratioA4: 0,
      supplementAr: 0,
      cutAr: 0,
      formula: 'Sur-mesure · laize cm',
      active: true,
      details: serializeMeta(
        { unit: 'cm', family: 'Grand format', group: 'Sur-mesure' },
        null,
      ),
      sortOrder: iso.length,
    },
  ];
}

export function MaterialFormatsTable({ canEdit = false }: Props) {
  const [rows, setRows] = useState<PaperFormatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draftCode, setDraftCode] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/paper-formats', { cache: 'no-store' });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(getApiErrorMessage(d, 'Chargement formats impossible'));
      const apiRows = (d.data.rows ?? []) as PaperFormatRow[];
      setRows(apiRows.length ? apiRows : fallbackRowsFromDefaults());
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Erreur formats');
      setRows(fallbackRowsFromDefaults());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => {
    const rank = (code: string) => {
      const i = MOCKUP_PRIORITY.findIndex((p) => p.toUpperCase() === code.toUpperCase());
      return i >= 0 ? i : 100 + code.charCodeAt(0);
    };
    return [...rows].sort((a, b) => rank(a.formatCode) - rank(b.formatCode));
  }, [rows]);

  const patch = async (id: string, body: Record<string, unknown>) => {
    if (id.startsWith('local-')) {
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, ...body } as PaperFormatRow : row)),
      );
      uxToast.info('Mode local — initialisez les formats papier pour persister');
      return;
    }
    const r = await fetch('/api/admin-backoffice/pricing/paper-formats', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...body }),
    });
    const d = await r.json();
    if (!r.ok || !d.ok) {
      uxToast.error(getApiErrorMessage(d, 'Mise à jour impossible'));
      return;
    }
    uxToast.success('Format mis à jour');
    void load();
  };

  const createFormat = async () => {
    const code = draftCode.trim().toUpperCase();
    if (!code) {
      uxToast.error('Code format requis');
      return;
    }
    const gf = isGrandFormatCode(code);
    const payload = {
      formatCode: code,
      widthMm: gf ? 1000 : 210,
      heightMm: gf ? 1000 : 297,
      ratioA4: gf ? 0 : 1,
      supplementAr: 0,
      cutAr: gf ? 0 : 50,
      active: true,
      details: serializeMeta(
        {
          unit: gf ? 'cm' : 'mm',
          family: gf ? 'Grand format' : 'Petit format',
          group: gf ? 'Sur-mesure' : 'ISO',
        },
        null,
      ),
    };
    setCreating(true);
    try {
      const r = await fetch('/api/admin-backoffice/pricing/paper-formats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(getApiErrorMessage(d, 'Création impossible'));
      uxToast.success(`Format ${code} créé`);
      setDraftCode('');
      void load();
    } catch (e) {
      uxToast.error(e instanceof Error ? e.message : 'Création impossible');
    } finally {
      setCreating(false);
    }
  };

  if (loading && rows.length === 0) {
    return <OptionsLoadingState variant="table" rows={6} />;
  }

  return (
    <section className="cps-formats-card" aria-label="Formats, laizes et unités">
      <header className="cps-formats-card__head">
        <div>
          <h3>Formats, laizes & unités</h3>
          <p>Petit format en millimètres · grand format en centimètres.</p>
        </div>
        <div className="cps-formats-card__actions">
          <AppButton
            type="button"
            variant="outline"
            onClick={() => void load()}
            className="cps-formats-ctrl"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </AppButton>
          {canEdit ? (
            <div className="cps-formats-new">
              <input
                className="cps-formats-ctrl"
                value={draftCode}
                onChange={(e) => setDraftCode(e.target.value)}
                placeholder="Ex. A2"
                aria-label="Code du nouveau format"
              />
              <AppButton
                type="button"
                variant="default"
                disabled={creating}
                onClick={() => void createFormat()}
                className="cps-formats-ctrl"
              >
                <Plus className="h-3.5 w-3.5" />
                Nouveau format
              </AppButton>
            </div>
          ) : null}
        </div>
      </header>

      {sorted.length === 0 ? (
        <AdminEmptyState
          title="Aucun format papier"
          description="Initialisez les règles formats papier ou créez un premier format."
        />
      ) : (
        <div className="cps-formats-table-wrap">
          <table className="cps-formats-table">
            <thead>
              <tr>
                <th>Format</th>
                <th>Largeur</th>
                <th>Hauteur</th>
                <th>Unité</th>
                <th>Famille</th>
                <th>Règle</th>
                <th className="text-right">Actif</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const meta = displayMeta(row);
                const width = toDisplayDim(row.widthMm, meta.unit);
                const height = toDisplayDim(row.heightMm, meta.unit);
                const ruleLabel = row.formula?.trim() || meta.group;
                return (
                  <tr key={row.id} className={cn(!row.active && 'is-inactive')}>
                    <td>
                      {canEdit && !row.id.startsWith('local-') ? (
                        <input
                          className="cps-formats-code"
                          defaultValue={row.formatCode}
                          key={`${row.id}-code-${row.formatCode}`}
                          onBlur={(e) => {
                            const next = e.target.value.trim();
                            if (!next || next === row.formatCode) return;
                            void patch(row.id, { formatCode: next });
                          }}
                          aria-label="Code format"
                        />
                      ) : (
                        <strong>{row.formatCode}</strong>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          className="cps-formats-dim"
                          inputMode="decimal"
                          defaultValue={width}
                          key={`${row.id}-w-${meta.unit}-${row.widthMm}`}
                          onBlur={(e) => {
                            const v = Number(e.target.value.replace(',', '.'));
                            if (!Number.isFinite(v) || v <= 0) return;
                            const widthMm = fromDisplayDim(v, meta.unit);
                            if (widthMm !== row.widthMm) void patch(row.id, { widthMm });
                          }}
                        />
                      ) : (
                        <span className="tabular-nums">{width}</span>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <input
                          className="cps-formats-dim"
                          inputMode="decimal"
                          defaultValue={height}
                          key={`${row.id}-h-${meta.unit}-${row.heightMm}`}
                          onBlur={(e) => {
                            const v = Number(e.target.value.replace(',', '.'));
                            if (!Number.isFinite(v) || v <= 0) return;
                            const heightMm = fromDisplayDim(v, meta.unit);
                            if (heightMm !== row.heightMm) void patch(row.id, { heightMm });
                          }}
                        />
                      ) : (
                        <span className="tabular-nums">{height}</span>
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <select
                          className="cps-formats-select"
                          value={meta.unit}
                          onChange={(e) => {
                            const unit = e.target.value as 'mm' | 'cm';
                            void patch(row.id, {
                              details: serializeMeta({ unit }, row.details),
                            });
                          }}
                        >
                          <option value="mm">mm</option>
                          <option value="cm">cm</option>
                        </select>
                      ) : (
                        meta.unit
                      )}
                    </td>
                    <td>
                      {canEdit ? (
                        <select
                          className="cps-formats-select"
                          value={meta.family}
                          onChange={(e) => {
                            void patch(row.id, {
                              details: serializeMeta({ family: e.target.value }, row.details),
                            });
                          }}
                        >
                          <option value="Petit format">Petit format</option>
                          <option value="Grand format">Grand format</option>
                        </select>
                      ) : (
                        meta.family
                      )}
                    </td>
                    <td>
                      <span className="cps-formats-rule" title={ruleLabel}>
                        {ruleLabel}
                      </span>
                    </td>
                    <td className="text-right">
                      <Switch
                        className="cps-formats-switch"
                        checked={row.active}
                        disabled={!canEdit}
                        onCheckedChange={(next) => void patch(row.id, { active: next })}
                        aria-label={`Activer ${row.formatCode}`}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
