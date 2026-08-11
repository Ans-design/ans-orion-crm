'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  isPosCatalogPath,
  useModuleListSearchOptional,
} from '@/components/layout/module-list-search-context';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  id?: string;
  debounceMs?: number;
  /** Affiche le bouton effacer (défaut: oui si valeur non vide) */
  clearable?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  /**
   * true = toujours afficher inline (catalogues POS).
   * false/défaut = déléguer au champ header shell (anti-redondance).
   */
  keepInline?: boolean;
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  className,
  inputClassName,
  id,
  debounceMs = 250,
  clearable = true,
  disabled,
  autoFocus,
  keepInline = false,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const pathname = usePathname();
  const headerSearch = useModuleListSearchOptional();
  const register = headerSearch?.register;
  const unregister = headerSearch?.unregister;
  const useHeader =
    Boolean(headerSearch)
    && !keepInline
    && !isPosCatalogPath(pathname);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, debounceMs > 0 ? debounceMs : 0);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (useHeader) return;
    if (debounceMs <= 0) return;
    if (debounced !== value) onChange(debounced);
  }, [useHeader, debounced, debounceMs, onChange, value]);

  /* Branche le champ header shell (= même filtre liste). */
  useEffect(() => {
    if (!useHeader || !register) return;
    register({
      id: inputId,
      placeholder,
      value,
      onChange: (next) => onChangeRef.current(next),
    });
  }, [useHeader, register, inputId, placeholder, value]);

  useEffect(() => {
    if (!useHeader || !unregister) return;
    return () => unregister(inputId);
  }, [useHeader, unregister, inputId]);

  const handleChange = (next: string) => {
    setLocal(next);
    if (debounceMs <= 0) onChange(next);
  };

  const clear = () => {
    setLocal('');
    onChange('');
  };

  if (useHeader) {
    return null;
  }

  return (
    <div className={cn('orion-search-field', className)}>
      <Search className="orion-search-field__icon" size={15} strokeWidth={2.15} aria-hidden />
      <input
        id={inputId}
        type="search"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={cn('orion-search-field__input', inputClassName)}
      />
      {clearable && local ? (
        <button
          type="button"
          className="orion-search-field__clear"
          onClick={clear}
          aria-label="Effacer la recherche"
        >
          <X size={14} strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
