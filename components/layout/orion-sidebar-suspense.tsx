'use client';

import { Suspense, type ComponentProps } from 'react';
import { OrionSidebar, OrionSidebarDrawer } from '@/components/layout/orion-sidebar';

function SidebarSkeleton() {
  return (
    <aside
      className="orion-sidebar orion-sidebar-v2 orion-sidebar-desktop hidden xl:flex flex-col shrink-0 fixed z-40 gap-2.5"
      style={{ width: 'var(--orion-sidebar-width, 252px)' }}
      aria-hidden
    >
      <div className="orion-sb-brand orion-sb-brand-outside h-14" />
      <div className="orion-sidebar-card flex-1 min-h-0" />
    </aside>
  );
}

export function OrionSidebarSuspense(props: ComponentProps<typeof OrionSidebar>) {
  return (
    <Suspense fallback={<SidebarSkeleton />}>
      <OrionSidebar {...props} />
    </Suspense>
  );
}

export function OrionSidebarDrawerSuspense(props: ComponentProps<typeof OrionSidebarDrawer>) {
  return (
    <Suspense fallback={null}>
      <OrionSidebarDrawer {...props} />
    </Suspense>
  );
}
