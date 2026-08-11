'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type ModuleDateFilter,
  type ModuleDatePeriod,
  DEFAULT_DATE_FILTER,
  dateFilterQueryString,
  dashboardPeriod,
  loadStoredDateFilter,
  saveStoredDateFilter,
} from '@/lib/date-filter';

type Ctx = {
  filter: ModuleDateFilter;
  setPeriod: (period: ModuleDatePeriod) => void;
  setDateFrom: (v: string) => void;
  setDateTo: (v: string) => void;
  queryString: string;
  dashboardPeriod: 'day' | 'week' | 'month';
  revision: number;
};

const ModuleDateFilterContext = createContext<Ctx | null>(null);

export function ModuleDateFilterProvider({ children }: { children: React.ReactNode }) {
  const [filter, setFilter] = useState<ModuleDateFilter>(DEFAULT_DATE_FILTER);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    setFilter(loadStoredDateFilter());
  }, []);

  const commit = useCallback((updater: (prev: ModuleDateFilter) => ModuleDateFilter) => {
    setFilter((prev) => {
      const next = updater(prev);
      saveStoredDateFilter(next);
      return next;
    });
    setRevision((r) => r + 1);
  }, []);

  const setPeriod = useCallback((period: ModuleDatePeriod) => {
    commit((prev) => ({ ...prev, period, dateFrom: '', dateTo: '' }));
  }, [commit]);

  const setDateFrom = useCallback((dateFrom: string) => {
    commit((prev) => ({ ...prev, dateFrom }));
  }, [commit]);

  const setDateTo = useCallback((dateTo: string) => {
    commit((prev) => ({ ...prev, dateTo }));
  }, [commit]);

  const queryString = useMemo(() => dateFilterQueryString(filter), [filter]);
  const dashPeriod = useMemo(() => dashboardPeriod(filter), [filter]);

  const value = useMemo(
    () => ({
      filter,
      setPeriod,
      setDateFrom,
      setDateTo,
      queryString,
      dashboardPeriod: dashPeriod,
      revision,
    }),
    [filter, setPeriod, setDateFrom, setDateTo, queryString, dashPeriod, revision],
  );

  return (
    <ModuleDateFilterContext.Provider value={value}>
      {children}
    </ModuleDateFilterContext.Provider>
  );
}

export function useModuleDateFilter() {
  const ctx = useContext(ModuleDateFilterContext);
  if (!ctx) throw new Error('useModuleDateFilter must be used within ModuleDateFilterProvider');
  return ctx;
}
