import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function OrionSkeleton({
  className,
  ...props
}: React.ComponentProps<typeof Skeleton>) {
  return <Skeleton className={cn('orion-ds-skeleton', className)} {...props} />;
}
