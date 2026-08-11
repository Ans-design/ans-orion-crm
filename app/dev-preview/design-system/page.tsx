'use client';

import { ModuleHeader } from '@/components/layouts/module-header';
import { AppButton, AppSyncStateBadge } from '@/components/ui/app-ui';
import { ORION_COLORS, ORION_RADIUS } from '@/lib/design/tokens';

/** Galerie design system V11 — route interne /dev-preview/design-system */
export default function DesignSystemPreviewPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <ModuleHeader
        title="Design system V11"
        description="Tokens, rayons sémantiques, sync states — preview interne."
        syncStatus="synced"
        syncAsOf={new Date().toISOString()}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Couleurs</h2>
        <div className="flex flex-wrap gap-3">
          {[
            ['Brand', ORION_COLORS.red500],
            ['Info', ORION_COLORS.info],
            ['Danger', ORION_COLORS.danger],
            ['Success', ORION_COLORS.success],
          ].map(([label, color]) => (
            <div key={label} className="flex items-center gap-2 text-sm">
              <span
                className="h-8 w-8 border border-[var(--border-soft)]"
                style={{ background: color, borderRadius: ORION_RADIUS.control }}
              />
              {label} <code className="text-xs">{color}</code>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Info ({ORION_COLORS.info}) ≠ brand ({ORION_COLORS.red500}).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Rayons</h2>
        <div className="flex flex-wrap gap-4">
          {(['control', 'card', 'overlay'] as const).map((k) => (
            <div
              key={k}
              className="border border-[var(--border-soft)] bg-[var(--bg-card)] px-4 py-6 text-sm"
              style={{ borderRadius: ORION_RADIUS[k] }}
            >
              {k}: {ORION_RADIUS[k]}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Sync states</h2>
        <div className="flex flex-wrap gap-2">
          {(['saved', 'publishing', 'synced', 'queued', 'partial', 'error', 'stale'] as const).map((s) => (
            <AppSyncStateBadge key={s} status={s} />
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <AppButton variant="default">Primary</AppButton>
        <AppButton variant="secondary">Secondary</AppButton>
        <AppButton variant="ghost">Ghost</AppButton>
        <AppButton variant="destructive">Destructive</AppButton>
      </section>
    </div>
  );
}
