import type { DiscountTier } from '@prisma/client';

export function formatTiersSummary(tiers: Pick<DiscountTier, 'minQty' | 'maxQty' | 'unitPrice' | 'active'>[]): string {
  const active = tiers.filter((t) => t.active !== false && (t.unitPrice ?? 0) > 0);
  if (active.length === 0) return '—';
  return active
    .slice(0, 4)
    .map((t) => {
      const max = t.maxQty != null ? String(t.maxQty) : '+';
      const price = t.unitPrice != null ? Math.round(t.unitPrice) : '—';
      return `${t.minQty}–${max} = ${price}`;
    })
    .join(' · ');
}

export function mapFormulaStatus(
  versions: { version: number; status: string }[],
): { status: 'published' | 'draft' | 'none'; version: number | null } {
  if (versions.length === 0) return { status: 'none', version: null };
  const published = versions.find((v) => v.status === 'published');
  if (published) return { status: 'published', version: published.version };
  return { status: 'draft', version: versions[0]?.version ?? null };
}
