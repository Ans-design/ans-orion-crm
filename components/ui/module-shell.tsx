import { cn } from '@/lib/utils';
import { ORION_SECTION_SPACE } from '@/lib/design/spacing-system';

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Densité : default = espacement standard, compact = listes denses */
  density?: 'default' | 'compact';
};

/** Enveloppe standard d'une page module ORION */
export function ModuleShell({ children, className, density = 'default' }: Props) {
  return (
    <div
      className={cn(
        'orion-module-page orion-ux-fade-in w-full min-w-0 max-w-full',
        density === 'compact' ? ORION_SECTION_SPACE.standard : ORION_SECTION_SPACE.relaxed,
        className,
      )}
    >
      {children}
    </div>
  );
}
