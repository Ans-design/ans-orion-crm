import { cn } from '@/lib/utils';

import { ORION_PAGE, ORION_SECTION_SPACE } from '@/lib/design/spacing-system';



type Props = {

  children: React.ReactNode;

  className?: string;

  /** default = space-y-6 · compact = space-y-4 */

  density?: 'default' | 'compact';

};



/** Conteneur page standard — sans padding (géré par le shell). */

export function PageContainer({ children, className, density = 'default' }: Props) {

  return (

    <div

      className={cn(

        'orion-page-container w-full max-w-none',

        density === 'compact' ? ORION_PAGE.stackCompact : ORION_PAGE.stack,

        className,

      )}

    >

      {children}

    </div>

  );

}



/** Alias historique — même rythme, pas de padding interne */

export function OrionPageStack({ children, className, density = 'default' }: Props) {

  return <PageContainer className={className} density={density}>{children}</PageContainer>;

}



/** Grille KPI — gouttière gap-4 unifiée */

export function KpiGridLayout({

  children,

  className,

  columns = 'auto',

}: {

  children: React.ReactNode;

  className?: string;

  columns?: 'auto' | 2 | 3 | 4 | 6;

}) {

  const cols =

    columns === 'auto'

      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'

      : columns === 2

        ? 'grid-cols-1 sm:grid-cols-2'

        : columns === 3

          ? 'grid-cols-2 sm:grid-cols-3'

          : columns === 4

            ? 'grid-cols-2 lg:grid-cols-4'

            : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6';



  return (

    <div className={cn('grid gap-4', cols, className)}>{children}</div>

  );

}



/** Grille cartes standard */

export function CardGridLayout({ children, className }: { children: React.ReactNode; className?: string }) {

  return (

    <div className={cn('grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4', className)}>

      {children}

    </div>

  );

}



/** Grille formulaire 2 colonnes */

export function FormGridLayout({ children, className }: { children: React.ReactNode; className?: string }) {

  return (

    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4', className)}>

      {children}

    </div>

  );

}



/** Barre d'outils module */

export function ToolbarLayout({ children, className, dense }: { children: React.ReactNode; className?: string; dense?: boolean }) {

  return (

    <div className={cn('orion-toolbar-layout', dense ? 'gap-2 mb-3' : 'gap-3 mb-4', className)}>

      {children}

    </div>

  );

}



/** Contenu sous onglets */

export function TabsPanelLayout({ children, className }: { children: React.ReactNode; className?: string }) {

  return (

    <div className={cn(ORION_SECTION_SPACE.standard, className)}>

      {children}

    </div>

  );

}



/** Groupe de boutons */

export function ActionGroupLayout({ children, className }: { children: React.ReactNode; className?: string }) {

  return (

    <div className={cn('flex flex-wrap items-center gap-2', className)}>

      {children}

    </div>

  );

}


