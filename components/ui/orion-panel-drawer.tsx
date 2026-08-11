'use client';

import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClass?: string;
  /** Classes additionnelles sur le panneau (ex. largeur compacte). */
  panelClassName?: string;
  /** En-tête riche (badges, actions) — remplace le titre simple. */
  headerContent?: React.ReactNode;
  /** Variante visuelle (ex. fiche matière claire). */
  variant?: 'default' | 'sheet';
  'aria-describedby'?: string;
};

/** Drawer latéral droit — thème clair/sombre via tokens ORION */
export function OrionPanelDrawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClass = 'w-full max-w-[440px]',
  panelClassName,
  headerContent,
  variant = 'default',
  'aria-describedby': ariaDescribedBy,
}: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Focus close + lock scroll only when the drawer opens — not when onClose identity changes
  // (unstable callbacks would steal focus from inputs after every keystroke).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => closeRef.current?.focus(), 40);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-[100] flex orion-sp-overlay',
        variant === 'sheet'
          ? 'justify-center items-center p-4 sm:p-6 orion-mat-sheet-root'
          : 'justify-end',
      )}
    >
      <button
        type="button"
        className={cn(
          'absolute inset-0 orion-drawer-overlay backdrop-blur-sm',
          variant === 'sheet' && 'orion-mat-sheet-overlay',
        )}
        onClick={onClose}
        aria-label="Fermer"
      />
      <aside
        className={cn(
          'relative w-full flex flex-col orion-fade-up orion-sp',
          variant === 'sheet' ? 'h-auto max-h-[min(94vh,820px)]' : 'h-full',
          widthClass,
          variant === 'sheet'
            ? 'orion-mat-sheet'
            : 'bg-[var(--cockpit-surface)] border-l border-[var(--border-soft)] shadow-2xl',
          panelClassName,
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy}
      >
        <header
          className={cn(
            'shrink-0 flex items-start justify-between gap-3',
            variant === 'sheet'
              ? 'orion-mat-sheet-header'
              : 'px-5 py-4 border-b border-[var(--border-soft)]',
          )}
        >
          {headerContent ? (
            <div className="min-w-0 flex-1">{headerContent}</div>
          ) : (
            <div className="min-w-0">
              {subtitle ? (
                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)] mb-0.5">
                  {subtitle}
                </p>
              ) : null}
              <h2
                id={titleId}
                className="text-base font-extrabold text-[var(--text-primary)] truncate"
              >
                {title}
              </h2>
            </div>
          )}
          {headerContent ? <h2 id={titleId} className="sr-only">{title}</h2> : null}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className={cn(
              'shrink-0',
              variant === 'sheet' ? 'orion-mat-sheet-close' : 'orion-icon-btn',
            )}
            aria-label="Fermer la fiche"
            title="Fermer"
          >
            <X size={18} aria-hidden />
          </button>
        </header>
        <div
          className={cn(
            'flex-1 overflow-y-auto',
            variant === 'sheet' ? 'orion-mat-sheet-body' : 'px-5 py-4',
          )}
        >
          {children}
        </div>
        {footer ? (
          <footer
            className={cn(
              'shrink-0 flex flex-wrap gap-2',
              variant === 'sheet'
                ? 'orion-mat-sheet-footer'
                : 'px-5 py-4 border-t border-[var(--border-soft)]',
            )}
          >
            {footer}
          </footer>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
