import { PageHeader } from '@/components/layouts/page-header';

export type OrionPageHeaderProps = React.ComponentProps<typeof PageHeader>;

/** En-tête de module ANS ORION — alias typé du PageHeader design system. */
export function OrionPageHeader(props: OrionPageHeaderProps) {
  return <PageHeader {...props} />;
}
