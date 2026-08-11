import { prisma } from '@/lib/prisma';
import { isPrix2026LegacyEnabled } from '@/lib/pricing/prix-2026-legacy';

export type FormulaAuditResult = {
  articleId: string;
  articleLabel: string;
  formulaVersion: number | null;
  formulaStatus: string | null;
  usesPrix2026: boolean;
  usesMaterialsDb: boolean;
  priceImpactVariables: string[];
  indicativeVariables: string[];
  anomalies: string[];
};

export async function auditArticleFormula(articleId: string): Promise<FormulaAuditResult | null> {
  const profile = await prisma.articlePricingProfile.findUnique({
    where: { articleId },
    include: {
      formulaVersions: { orderBy: { version: 'desc' }, take: 1 },
      optionGroups: { include: { values: { where: { active: true } } } },
      materialPrices: { where: { active: true } },
    },
  });

  if (!profile) return null;

  const formula = profile.formulaVersions[0];
  const expression = formula?.expression ?? '';
  const pipeline = JSON.stringify(formula?.pipeline ?? {});

  const usesPrix2026 =
    /prix.?2026|salePrice2026|PRIX_2026/i.test(expression + pipeline) ||
    (isPrix2026LegacyEnabled() && profile.status !== 'published');

  const usesMaterialsDb =
    profile.materialPrices.length > 0 ||
    /material|matiere|MaterialPrice|baseMaterial|basePrinting/i.test(expression + pipeline);

  const priceImpactVariables: string[] = [];
  const indicativeVariables: string[] = [];
  const anomalies: string[] = [];

  for (const g of profile.optionGroups) {
    for (const v of g.values) {
      if (g.impactsPrice && v.priceModifier != null && v.priceModifier !== 0) {
        priceImpactVariables.push(`${g.label}:${v.label}`);
      } else if (g.isInformational || !g.impactsPrice) {
        indicativeVariables.push(`${g.label}:${v.label}`);
      }
    }
      if (g.impactsPrice && g.isInformational) {
      anomalies.push(`Groupe ${g.label} : impact prix et indicatif simultanés`);
    }
  }

  if (usesPrix2026) {
    anomalies.push('Formule ou profil référence encore PRIX 2026');
  }
  if (!usesMaterialsDb && profile.status === 'published') {
    anomalies.push('Profil publié sans matières DB');
  }
  if (!formula) {
    anomalies.push('Aucune formule active');
  }

  return {
    articleId,
    articleLabel: profile.articleLabel,
    formulaVersion: formula?.version ?? null,
    formulaStatus: formula?.status ?? null,
    usesPrix2026,
    usesMaterialsDb,
    priceImpactVariables,
    indicativeVariables,
    anomalies,
  };
}
