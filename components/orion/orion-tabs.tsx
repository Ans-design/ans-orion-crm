'use client';

import * as React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export function OrionTabs(props: React.ComponentProps<typeof Tabs>) {
  return <Tabs {...props} />;
}

export function OrionTabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return (
    <TabsList
      className={cn(
        'h-auto w-full justify-start gap-1 rounded-[var(--orion-radius)] border border-[var(--border-soft)] bg-[var(--bg-card-soft)] p-1',
        className,
      )}
      {...props}
    />
  );
}

export function OrionTabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsTrigger>) {
  return (
    <TabsTrigger
      className={cn(
        'rounded-[calc(var(--orion-radius)-2px)] data-[state=active]:bg-[var(--bg-card)] data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

export const OrionTabsContent = TabsContent;
