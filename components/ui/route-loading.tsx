import { LoadingState } from '@/components/ui/loading-state';

export function RouteLoading({
  message = 'Chargement…',
  hint,
}: {
  message?: string;
  hint?: string;
}) {
  return (
    <div className="orion-page py-16">
      <LoadingState message={message} hint={hint} />
    </div>
  );
}
