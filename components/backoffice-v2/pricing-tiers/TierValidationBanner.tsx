import type { TierValidationResult } from '@/lib/server/modules/backoffice-v2/admin-backoffice-tiers.types';

type Props = {
  validation: TierValidationResult;
};

export function TierValidationBanner({ validation }: Props) {
  const tone = validation.errors.length
    ? 'error'
    : validation.warnings.length
      ? 'warning'
      : 'success';

  const message = validation.errors[0]
    ?? validation.warnings[0]
    ?? validation.info[0]
    ?? 'Configuration valide';

  return (
    <div className={`ab2-tier-validation ab2-tier-validation--${tone}`}>
      {message}
      {validation.errors.length > 1 && (
        <span className="ab2-tier-validation-more"> +{validation.errors.length - 1} erreur(s)</span>
      )}
    </div>
  );
}
