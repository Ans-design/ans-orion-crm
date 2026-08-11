import { cn } from '@/lib/utils';
import { formatPriceAr } from '@/lib/format/french-typography';

export function OrionPriceDisplay({
  amount,
  className,
  size = 'md',
  muted = false,
  nullLabel = '—',
}: {
  amount: number | null | undefined;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  muted?: boolean;
  nullLabel?: string;
}) {
  const sizeClass =
    size === 'lg' ? 'text-xl font-semibold' : size === 'sm' ? 'text-sm font-medium' : 'text-base font-semibold';

  return (
    <span
      className={cn(
        'font-variant-numeric tabular-nums tracking-tight',
        sizeClass,
        muted ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)]',
        className,
      )}
    >
      {formatPriceAr(amount, nullLabel)}
    </span>
  );
}
