import { notFound } from 'next/navigation';
import { isDevPreviewEnabled } from '@/lib/local-dev';
import { AuthUiPreview } from '@/components/dev-preview/auth-ui-preview';

export const metadata = {
  title: 'Aperçu Login & RH — ANS ORION',
  description: 'Prévisualisation locale login et déclaration de retard',
};

export default function DevPreviewAuthUiPage() {
  if (!isDevPreviewEnabled()) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-[var(--orion-surface-soft)] px-4 py-2 text-center text-xs text-muted-foreground">
        Aperçu local — Login & déclaration de retard RH · aucune donnée production
      </div>
      <AuthUiPreview />
    </div>
  );
}
