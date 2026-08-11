/**
 * États de synchronisation publication Admin ↔ POS (Ultra-Prompt §11 / §13).
 * Source unique pour UI et tests — pas de mock.
 *
 * « Synchronisé » n’est accordé que si une comparaison POS explicite réussit.
 * Profil + formule publiés seuls → « Actif (projection à vérifier) ».
 */

export type PublicationParityTone = 'ok' | 'warn' | 'danger' | 'muted';

export type PublicationParityInput = {
  profileStatus: string;
  latestFormula?: { version: number; status: string; coherenceHash?: string | null } | null;
  /** true uniquement si Admin = POS vérifié (prix / hash / diff). */
  posParityVerified?: boolean;
  /** Écarts détectés lors d’un contrôle POS. */
  posDriftCount?: number;
};

export type PublicationParityState = {
  label: string;
  tone: PublicationParityTone;
  cause: string;
  coherenceHash?: string | null;
};

export function resolvePublicationParity(input: PublicationParityInput): PublicationParityState {
  const fv = input.latestFormula ?? null;
  const publishedFormula = fv?.status === 'published';
  const profilePublished = input.profileStatus === 'published';
  const hash = fv?.coherenceHash ?? null;
  const drift = Number(input.posDriftCount ?? 0);
  const verified = input.posParityVerified === true && drift === 0;

  if (profilePublished && publishedFormula && verified) {
    return {
      label: 'Synchronisé',
      tone: 'ok',
      cause: hash
        ? `Parité Admin↔POS vérifiée · hash ${hash.slice(0, 8)}…`
        : 'Parité Admin↔POS vérifiée',
      coherenceHash: hash,
    };
  }
  if (profilePublished && publishedFormula && drift > 0) {
    return {
      label: 'Écart POS',
      tone: 'danger',
      cause: `${drift} écart(s) Admin↔POS — resynchroniser ou corriger`,
      coherenceHash: hash,
    };
  }
  if (profilePublished && publishedFormula) {
    return {
      label: 'Actif — parité à vérifier',
      tone: 'warn',
      cause: 'Profil et formule actifs — la parité POS n’a pas encore été contrôlée',
      coherenceHash: hash,
    };
  }
  if (profilePublished && !publishedFormula) {
    return {
      label: 'À appliquer',
      tone: 'warn',
      cause: fv ? 'Formule non active — Enregistrer en brouillon puis Activer' : 'Aucune formule — à compléter',
      coherenceHash: hash,
    };
  }
  if (!profilePublished && publishedFormula) {
    return {
      label: 'Profil inactif',
      tone: 'warn',
      cause: 'Formule active mais produit non disponible POS',
      coherenceHash: hash,
    };
  }
  if (!fv) {
    return {
      label: 'À compléter',
      tone: 'muted',
      cause: 'Sans formule — à compléter ou sur devis',
      coherenceHash: null,
    };
  }
  return {
    label: 'Non synchronisé',
    tone: 'danger',
    cause: 'Configuration non appliquée au POS',
    coherenceHash: hash,
  };
}
