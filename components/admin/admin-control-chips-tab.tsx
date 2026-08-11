'use client';

import { useState } from 'react';
import type { ChipAdminEntry, ProductOptionGroup, VisibilityMode } from '@/lib/admin-config/types';
import { VIS_COLORS, VIS_LABELS } from '@/components/admin/admin-control-constants';

type Props = {
  filteredChips: ChipAdminEntry[];
  chipGroups: ProductOptionGroup[];
  archivedCount: number;
  showArchivedChips: boolean;
  onShowArchivedChipsChange: (value: boolean) => void;
  canEdit: boolean;
  onSetChipField: (id: string, patch: Partial<ChipAdminEntry>) => void;
};

export function AdminControlChipsTab({
  filteredChips,
  chipGroups,
  archivedCount,
  showArchivedChips,
  onShowArchivedChipsChange,
  canEdit,
  onSetChipField,
}: Props) {
  const [viewMode, setViewMode] = useState<'table' | 'groups'>('table');

  return (
    <>
      <div className="pta-catalog-toolbar">
        <div className="flex text-xs gap-1 p-1 rounded-[var(--pta-radius)] bg-[var(--pta-bg3)]" role="group" aria-label="Mode d'affichage">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 font-semibold rounded-[var(--pta-radius)] transition-colors ${
              viewMode === 'table'
                ? 'bg-[var(--pta-bg4)] text-[var(--ans-pink-500)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Liste
          </button>
          <button
            type="button"
            onClick={() => setViewMode('groups')}
            className={`px-3 py-1.5 font-semibold rounded-[var(--pta-radius)] transition-colors ${
              viewMode === 'groups'
                ? 'bg-[var(--pta-bg4)] text-[var(--ans-pink-500)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Groupes
          </button>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer text-[var(--pta-text2)]">
          <input
            type="checkbox"
            checked={showArchivedChips}
            onChange={(e) => onShowArchivedChipsChange(e.target.checked)}
            className="rounded"
          />
          Afficher archivées
        </label>
        <span className="orion-text-meta">
          {archivedCount} chip(s) archivée(s)
        </span>
      </div>

      {viewMode === 'table' ? (
        <section className="pta-data-section" aria-label="Liste des chips">
          <div className="pta-data-scroll">
            <table className="pta-admin-table min-w-[900px]">
              <thead>
                <tr>
                  <th>Statut</th>
                  <th>Article</th>
                  <th>Bloc</th>
                  <th>Champ</th>
                  <th>Libellé</th>
                  <th className="text-right">Prix</th>
                  <th className="text-center">Stock</th>
                  <th className="text-center">Prod</th>
                  <th className="text-center">Archivée</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredChips.map((chip) => (
                  <tr key={chip.id} className={chip.archived ? 'opacity-60' : ''}>
                    <td>
                      {canEdit ? (
                        <select
                          value={chip.visibility}
                          onChange={(e) => onSetChipField(chip.id, { visibility: e.target.value as VisibilityMode })}
                          className="pta-toolbar-select !text-xs !min-w-[88px]"
                        >
                          {Object.keys(VIS_LABELS).map((k) => (
                            <option key={k} value={k}>{VIS_LABELS[k as VisibilityMode]}</option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${VIS_COLORS[chip.visibility]}`}>
                          {VIS_LABELS[chip.visibility]}
                        </span>
                      )}
                    </td>
                    <td className="orion-text-code">{chip.productId}</td>
                    <td>{chip.blockKey}</td>
                    <td className="orion-text-code">{chip.fieldKey}</td>
                    <td className="font-medium">{chip.label}</td>
                    <td className="text-right font-mono">
                      {chip.priceImpact > 0 ? `+${chip.priceImpact}` : chip.priceImpact < 0 ? 'Forcé' : '0'}
                    </td>
                    <td className="text-center">{chip.affectsStock ? 'Oui' : '—'}</td>
                    <td className="text-center">{chip.affectsProduction ? 'Oui' : '—'}</td>
                    <td className="text-center">
                      {canEdit ? (
                        <input
                          type="checkbox"
                          checked={!!chip.archived}
                          onChange={(e) => onSetChipField(chip.id, { archived: e.target.checked })}
                          title="Archiver la chip (masquée au runtime POS)"
                        />
                      ) : (
                        chip.archived ? 'Oui' : '—'
                      )}
                    </td>
                    <td className="text-muted-foreground">{chip.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pta-data-hint !pt-2 !pb-0 italic">
            Affichage limité à 200 chips — utilisez la recherche pour filtrer
          </p>
        </section>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {chipGroups.map((group) => (
            <article
              key={`${group.productId}:${group.fieldKey}`}
              className="pta-kpi-cell !min-h-0 !text-left !items-stretch !p-3"
            >
              <div className="flex flex-wrap items-baseline gap-2 mb-2 w-full">
                <span className="font-mono text-xs text-[var(--ans-pink-500)]">{group.productId}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold text-sm">{group.fieldKey}</span>
                <span className="orion-text-meta">({group.blockKey})</span>
                <span className="ml-auto orion-text-meta">{group.options.length} opt.</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.options.map((chip) => (
                  <span
                    key={chip.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-[7px] text-xs font-medium ${chip.archived ? 'opacity-50 line-through' : ''} ${VIS_COLORS[chip.visibility]}`}
                    title={`${chip.label} · ${chip.priceImpact > 0 ? `+${chip.priceImpact} Ar` : chip.priceImpact < 0 ? 'Prix forcé' : '0 Ar'}`}
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            </article>
          ))}
          {chipGroups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 col-span-full">Aucun groupe trouvé</p>
          )}
          <p className="orion-text-meta italic col-span-full">
            Affichage limité à 50 groupes — utilisez la recherche pour filtrer
          </p>
        </div>
      )}
    </>
  );
}
