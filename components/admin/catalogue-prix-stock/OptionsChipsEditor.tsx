'use client';

import dynamic from 'next/dynamic';

const Loading = () => (
  <div className="p-8 text-center text-sm text-[var(--cps-muted,#64748b)]">Chargement options…</div>
);

const OptionsChipsWorkspace = dynamic(
  () =>
    import('@/components/backoffice-v2/options/OptionsChipsWorkspace').then(
      (m) => m.OptionsChipsWorkspace,
    ),
  { ssr: false, loading: Loading },
);

type Props = {
  canEdit: boolean;
  onDataChanged?: () => void;
};

/**
 * Split-screen Options / Chips — workspace réel, sans cadre superflu.
 */
export function OptionsChipsEditor({ canEdit, onDataChanged }: Props) {
  return (
    <div className="cps-content-flat min-h-[480px] w-full">
      <OptionsChipsWorkspace canEdit={canEdit} embedded onDataChanged={onDataChanged} />
    </div>
  );
}
