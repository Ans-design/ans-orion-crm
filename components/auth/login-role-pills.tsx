'use client';

import { ORION_V29_PUBLIC } from '@/lib/orion-v29-accounts';

type V29Public = (typeof ORION_V29_PUBLIC)[number];

/** Raccourcis rôle style HTML v29 — un profil représentatif par métier. */
const ROLE_PILL_MATRICULES = [
  'DIRECTEUR',
  'ADM01',
  'GRA01',
  'COM01',
  'LOG01',
  'FAC01',
  'CM01',
  'TECH01',
] as const;

const TONE_BY_MATRICULE: Record<string, string> = {
  DIRECTEUR: 'dir',
  ADM01: 'adm',
  GRA01: 'des',
  COM01: 'vte',
  LOG01: 'liv',
  FAC01: 'fac',
  CM01: 'cm',
  TECH01: 'tech',
};

const SHORT_LABEL: Record<string, string> = {
  DIRECTEUR: 'Direction',
  ADM01: 'Admin',
  GRA01: 'Studio',
  COM01: 'Vente',
  LOG01: 'Livraison',
  FAC01: 'Façonnage',
  CM01: 'CM',
  TECH01: 'Tech',
};

export function getLoginRolePills(): Array<V29Public & { short: string; tone: string }> {
  return ROLE_PILL_MATRICULES.map((m) => {
    const acc = ORION_V29_PUBLIC.find((p) => p.matricule === m);
    if (!acc) return null;
    return {
      ...acc,
      short: SHORT_LABEL[m] ?? acc.profile,
      tone: TONE_BY_MATRICULE[m] ?? 'tech',
    };
  }).filter(Boolean) as Array<V29Public & { short: string; tone: string }>;
}

type LoginRolePillsProps = {
  disabled?: boolean;
  onQuickLogin: (acc: V29Public) => void;
};

/** Grille compacte 4×2 — connexion 1 clic par rôle (maquette v29). */
export function LoginRolePills({ disabled, onQuickLogin }: LoginRolePillsProps) {
  const pills = getLoginRolePills();
  if (pills.length === 0) return null;

  return (
    <div className="login-role-pills" role="group" aria-label="Connexion rapide par profil">
      <span className="login-role-pills__label">Accès rapide par profil</span>
      <div className="login-role-pills__grid">
        {pills.map((pill) => (
          <button
            key={pill.matricule}
            type="button"
            disabled={disabled}
            className={`login-role-pill login-role-pill--${pill.tone}`}
            onClick={() => onQuickLogin(pill)}
            title={`${pill.name} · ${pill.matricule}`}
            aria-label={`Connexion ${pill.short} (${pill.matricule})`}
          >
            <span className="login-role-pill__name">{pill.short}</span>
            <span className="login-role-pill__mat">{pill.matricule}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
