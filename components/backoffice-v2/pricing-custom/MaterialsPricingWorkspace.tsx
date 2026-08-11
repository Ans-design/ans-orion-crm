'use client';

import { MaterialsUnifiedWorkspace } from '@/components/administration/materials/MaterialsUnifiedWorkspace';

type Props = { canEdit: boolean; articleId?: string | null; showLegacy?: boolean };

/** Onglet backoffice Matières — délègue à la page unifiée Administration > Matières. */
export function MaterialsPricingWorkspace({ canEdit }: Props) {
  return <MaterialsUnifiedWorkspace canEdit={canEdit} />;
}
