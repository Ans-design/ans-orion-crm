'use client';

import { FormulesMoteursWorkspace } from './FormulesMoteursWorkspace';

type Props = {
  canEdit: boolean;
};

/**
 * Domaine « Formules & moteurs » —
 * refonte 3 vues (moteurs · paramètres · règles) + formule HT.
 * Constructeur / paliers via panneau avancé ; galleries legacy conservées.
 */
export function PricingCalculsStudio({ canEdit }: Props) {
  return <FormulesMoteursWorkspace canEdit={canEdit} />;
}
