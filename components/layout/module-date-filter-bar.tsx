'use client';

import { CalendarRange } from 'lucide-react';
import { MODULE_DATE_PRESETS } from '@/lib/date-filter';
import { useModuleDateFilter } from '@/components/layout/module-date-filter-context';

/**
 * Filtre période partagé — dans orion-cockpit-header__left.
 * Flux gauche → droite, wrap si débordement.
 */
export function ModuleDateFilterBar() {
  const { filter, setPeriod, setDateFrom, setDateTo } = useModuleDateFilter();
  const customActive = Boolean(filter.dateFrom && filter.dateTo);

  return (
    <div className="module-date-filter module-date-filter--header" role="region" aria-label="Filtre période">
      <div className="module-date-filter__inner">
        <div className="module-date-filter__presets-row">
          <div className="module-date-filter__kicker shrink-0" title="Filtrer par période">
            <CalendarRange size={12} className="text-[var(--brand-primary)]" aria-hidden />
            <span>Période</span>
          </div>
          <div className="module-date-filter__presets" role="group" aria-label="Raccourcis période">
            {MODULE_DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                aria-label={p.label}
                onClick={() => setPeriod(p.id)}
                className={`cockpit-period-btn module-date-filter__chip ${
                  !customActive && filter.period === p.id ? 'cockpit-period-btn-active' : ''
                }`}
              >
                <span className="module-date-filter__chip-full">{p.label}</span>
                <span className="module-date-filter__chip-short" aria-hidden>
                  {p.shortLabel}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="module-date-filter__dates">
          <label className="module-date-filter__date-field">
            <span>Du</span>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="cockpit-search module-date-filter__input"
            />
          </label>
          <label className="module-date-filter__date-field">
            <span>Au</span>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="cockpit-search module-date-filter__input"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
