import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isDevPreviewEnabled } from '@/lib/local-dev';
import { DEV_PREVIEW_MODULES, getDevPreviewModule } from '@/lib/dev-preview/registry';
import { DevPreviewModuleView } from '@/components/dev-preview/module-view';

type Props = { params: { module: string } };

export function generateStaticParams() {
  return DEV_PREVIEW_MODULES.map((m) => ({ module: m.slug }));
}

export default function DevPreviewModulePage({ params }: Props) {
  if (!isDevPreviewEnabled()) notFound();
  const mod = getDevPreviewModule(params.module);
  if (!mod) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-[var(--orion-surface-soft)] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <Link href="/dev-preview" className="text-sm text-muted-foreground hover:text-foreground">
            ← Hub local
          </Link>
          <span className="text-xs font-mono text-[var(--orion-yellow)]">LOCAL ONLY</span>
        </div>
      </header>
      <DevPreviewModuleView module={mod} />
    </div>
  );
}
