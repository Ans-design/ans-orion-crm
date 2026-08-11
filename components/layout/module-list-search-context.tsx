'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

type Registration = {
  id: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

type ModuleListSearchContextValue = {
  active: boolean;
  query: string;
  placeholder: string;
  setQuery: (value: string) => void;
  register: (reg: Registration) => void;
  unregister: (id: string) => void;
};

const ModuleListSearchContext = createContext<ModuleListSearchContextValue | null>(null);

/** Catalogues POS : gardent leur recherche inline (pas de synchro header). */
export function isPosCatalogPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === '/pos'
    || pathname.startsWith('/pos/')
    || pathname.includes('/catalogue')
    || pathname.startsWith('/administration/catalogue')
  );
}

export function ModuleListSearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [reg, setReg] = useState<Registration | null>(null);
  const regRef = useRef<Registration | null>(null);
  regRef.current = reg;

  useEffect(() => {
    setReg(null);
  }, [pathname]);

  const register = useCallback((next: Registration) => {
    setReg((prev) => {
      if (
        prev
        && prev.id === next.id
        && prev.value === next.value
        && prev.placeholder === next.placeholder
      ) {
        regRef.current = next;
        return prev;
      }
      return next;
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setReg((prev) => (prev?.id === id ? null : prev));
  }, []);

  const setQuery = useCallback((value: string) => {
    const current = regRef.current;
    if (!current) return;
    if (current.value === value) return;
    current.onChange(value);
    setReg({ ...current, value });
  }, []);

  const value = useMemo<ModuleListSearchContextValue>(
    () => ({
      active: Boolean(reg),
      query: reg?.value ?? '',
      placeholder: reg?.placeholder ?? 'Rechercher…',
      setQuery,
      register,
      unregister,
    }),
    [reg, setQuery, register, unregister],
  );

  return (
    <ModuleListSearchContext.Provider value={value}>
      {children}
    </ModuleListSearchContext.Provider>
  );
}

export function useModuleListSearch() {
  const ctx = useContext(ModuleListSearchContext);
  if (!ctx) throw new Error('useModuleListSearch must be used within ModuleListSearchProvider');
  return ctx;
}

export function useModuleListSearchOptional() {
  return useContext(ModuleListSearchContext);
}
