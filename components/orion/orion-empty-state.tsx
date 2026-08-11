import { EmptyState } from '@/components/ui/empty-state';

export type OrionEmptyStateProps = React.ComponentProps<typeof EmptyState>;

export function OrionEmptyState(props: OrionEmptyStateProps) {
  return <EmptyState {...props} />;
}
