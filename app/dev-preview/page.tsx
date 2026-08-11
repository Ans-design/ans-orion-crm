import { notFound } from 'next/navigation';
import { isDevPreviewEnabled } from '@/lib/local-dev';
import { DevPreviewHub } from '@/components/dev-preview/module-view';

export const metadata = {
  title: 'Local Preview — ANS ORION',
  description: 'Hub de test local sans Hostinger',
};

export default function DevPreviewPage() {
  if (!isDevPreviewEnabled()) notFound();
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-[var(--orion-surface-soft)] px-4 py-2 text-center text-xs text-muted-foreground">
        Environnement local — aucune donnée production
      </div>
      <DevPreviewHub />
    </div>
  );
}
