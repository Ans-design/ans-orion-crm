/** IDs catalogue textile — sans dépendance Prisma (safe client). */

export const TEXTILE_CATALOGUE_IDS = [
  'tx-tshirt',
  'tx-polo',
  'tx-sweat',
  'tx-gilet',
  'tx-casquette',
  'tx-bob',
  'tx-maillot',
  'tx-totebag',
  'tx-trousse',
  'tx-combinaison',
  'tx-survetement',
  'tx-lambahoany',
] as const;

export function isTextileArticleId(articleId: string): boolean {
  return (
    articleId.startsWith('tx-')
    || TEXTILE_CATALOGUE_IDS.includes(articleId as (typeof TEXTILE_CATALOGUE_IDS)[number])
  );
}

export function isLambahoanyArticleId(articleId: string): boolean {
  return articleId === 'tx-lambahoany' || /lambahoan/i.test(articleId);
}
