import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { EmptyState } from '@/components/ui/empty-state';
import type { LucideIcon } from 'lucide-react';

export function BackofficeLoading({ message = 'Chargement…' }: { message?: string }) {
  return (
    <div className="pta-empty-state !py-10">
      <LoadingState message={message} size="sm" className="!py-0 bg-transparent border-0 shadow-none" />
    </div>
  );
}

export function BackofficeError({
  message,
  onRetry,
  title = 'Erreur',
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <ErrorState
      title={title}
      message={message}
      onRetry={onRetry}
      className="pta-empty-state !border-dashed !bg-[var(--pta-bg3)]"
    />
  );
}

export function BackofficeEmpty({
  title,
  description,
  icon,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <EmptyState
      title={title}
      description={description}
      icon={icon}
      className="pta-empty-state !py-10"
    />
  );
}
