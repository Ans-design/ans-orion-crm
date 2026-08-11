import { SectionBlock, SectionCard } from '@/components/ui/section-layout';

export type OrionSectionProps = React.ComponentProps<typeof SectionBlock> & {
  variant?: 'block' | 'card';
  padded?: boolean;
};

/** Section de page — bloc ouvert ou carte selon `variant`. */
export function OrionSection({ variant = 'block', padded, ...props }: OrionSectionProps) {
  if (variant === 'card') {
    return <SectionCard padded={padded ?? true} {...props} />;
  }
  return <SectionBlock {...props} />;
}

export { SectionCard as OrionSectionCard, SectionBlock as OrionSectionBlock } from '@/components/ui/section-layout';
