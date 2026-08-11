'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SidebarUniverseNav } from '@/lib/navigation/build-sidebar-universes';
import { isNavItemActive } from '@/lib/navigation/sidebar-active';

type FlyoutAnchor = { top: number; left: number };

type Props = {
  universe: SidebarUniverseNav;
  anchor: FlyoutAnchor;
  pathname: string;
  locationSearch: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function SidebarMiniFlyout({
  universe,
  anchor,
  pathname,
  locationSearch,
  onClose,
  children,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState(anchor);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setPos(anchor);
  }, [anchor]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const update = () => setPos(anchor);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [anchor]);

  if (!mounted) return null;

  const hasActiveChild = universe.items.some((item) =>
    isNavItemActive(pathname, item.href, locationSearch),
  );

  return createPortal(
    <>
      <button
        type="button"
        className="orion-sb-flyout-backdrop fixed inset-0 z-[45] cursor-default border-0 p-0"
        onClick={onClose}
        aria-label="Fermer le menu"
        tabIndex={-1}
      />
      <div
        className="orion-sb-flyout orion-sb-flyout-fixed z-[50]"
        style={{ top: pos.top, left: pos.left }}
        role="dialog"
        aria-modal="true"
        aria-label={universe.label}
      >
        <p className="orion-sb-flyout-title">{universe.label}</p>
        {hasActiveChild && (
          <p className="orion-sb-flyout-subtitle">Module actif dans cet univers</p>
        )}
        {children}
      </div>
    </>,
    document.body,
  );
}
