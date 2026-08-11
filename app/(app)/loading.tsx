import { StatsSkeleton } from '@/components/ui/list-skeleton';
import { AppSkeleton } from '@/components/ui/app-ui';

export default function AppLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Chargement de la page">
      <div className="space-y-2 pb-6 border-b border-border">
        <AppSkeleton className="h-8 w-48" />
        <AppSkeleton className="h-4 w-72" />
      </div>
      <StatsSkeleton count={4} />
      <AppSkeleton className="h-10 w-full max-w-md" />
    </div>
  );
}
