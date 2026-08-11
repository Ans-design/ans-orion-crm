/**
 * Monogramme marque ANS (ans.com) — wordmark rouge + .com jaune, sans cadre.
 * Asset : /branding/ans-logo-wordmark.png (fond transparent).
 */

type Props = {
  className?: string;
  /**
   * brand = wordmark rouge/.com jaune (défaut, tout fond)
   * onDark conservé pour alias legacy
   */
  variant?: 'brand' | 'onDark';
};

const SRC = {
  brand: '/branding/ans-logo-wordmark.png',
  onDark: '/branding/ans-logo-wordmark.png',
} as const;

export function OrionMonogram({ className = '', variant = 'brand' }: Props) {
  const src = SRC[variant] ?? SRC.brand;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- marque statique hors optimisation dynamique
    <img
      src={src}
      alt=""
      width={56}
      height={56}
      decoding="async"
      className={`orion-ans-monogram object-contain ${className}`.trim()}
      data-brand="ans.com"
    />
  );
}
