/**
 * Métadonnées conformité Madagascar — à valider par expert local (non certifiant).
 */

export const MADA_EXPERT_VALIDATION_ITEMS = [
  'TVA collectée / déductible — taux et assiette',
  'IRSA retenue à la source salaires',
  'CNaPS cotisations employeur / salarié',
  'Mentions obligatoires facture (NIF, adresse, TVA)',
  'Export comptable SYSCOHADA / plan de comptes',
  'e-Déclaration DGI — format et périodicité',
] as const;

export const MADA_EXPORT_DISCLAIMER_LINES = [
  '# ANS ORION — Export comptable Madagascar',
  '# NON CERTIFIE DGI / IRSA / CNaPS — validation expert local obligatoire',
  `# Points à valider: ${MADA_EXPERT_VALIDATION_ITEMS.slice(0, 4).join('; ')}…`,
] as const;

export function madaExportDisclaimerBlock(): string {
  return MADA_EXPORT_DISCLAIMER_LINES.join('\n');
}
