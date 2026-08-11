'use client';

import { OrionMonogram } from '@/components/branding/orion-monogram';
import { cn } from '@/lib/utils';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  companyName?: string;
  companySubtitle?: string;
  logoUrl?: string | null;
  className?: string;
};

/** Tailles marques — un peu plus grand qu’avant, hiérarchie claire */
const SIZES = {
  sm: {
    root: 'orion-logo--sm',
    mono: 'orion-logo__mark--sm',
  },
  md: {
    root: 'orion-logo--md',
    mono: 'orion-logo__mark--md',
  },
  lg: {
    root: 'orion-logo--lg',
    mono: 'orion-logo__mark--lg',
  },
} as const;

/**
 * Marque ORION — layout maquette :
 * monogramme ans.com | filet vertical | ORION + sous-titre
 */
export function OrionLogo({
  size = 'md',
  showSubtitle = true,
  companyName = 'A.N.S DESIGN ORION',
  companySubtitle = '',
  logoUrl,
  className = '',
}: Props) {
  const s = SIZES[size];
  const nameUpper = companyName.trim().toUpperCase();
  const subUpper = companySubtitle.trim().toUpperCase();
  const subtitle = subUpper ? `${nameUpper} · ${subUpper}` : nameUpper;

  return (
    <div
      className={cn('orion-logo', s.root, className)}
      role="img"
      aria-label={`ORION — ${nameUpper}`}
    >
      <span className={cn('orion-logo__mark', s.mono)}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="orion-logo__img" />
        ) : (
          <OrionMonogram className="orion-logo__mono orion-ans-monogram" />
        )}
      </span>

      <span className="orion-logo__filet" aria-hidden />

      <div className="orion-logo__text">
        <span className="orion-logo__title">ORION</span>
        {showSubtitle ? <OrionLogoSubtitle text={subtitle} /> : null}
      </div>
    </div>
  );
}

/** Sous-titre : A.N.S plus gras · DESIGN en rouge · reste normal */
function OrionLogoSubtitle({ text }: { text: string }) {
  const m = text.match(/^(A\.N\.S)\s+(DESIGN)\s*(.*)$/i);
  if (!m) {
    return <span className="orion-logo__sub">{text}</span>;
  }
  const rest = m[3]?.trim();
  return (
    <span className="orion-logo__sub">
      <span className="orion-logo__sub-ans">{m[1]}</span>
      {' '}
      <span className="orion-logo__sub-design">{m[2]}</span>
      {rest ? (
        <>
          {' '}
          <span className="orion-logo__sub-rest">{rest}</span>
        </>
      ) : null}
    </span>
  );
}
