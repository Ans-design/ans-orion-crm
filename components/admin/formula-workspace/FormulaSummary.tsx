'use client';

import { Sparkles } from 'lucide-react';

type Props = {
  naturalLanguage: string;
};

/** Bandeau bleu « Formule métier sans code » — résumé lisible du calcul. */
export function FormulaSummary({ naturalLanguage }: Props) {
  return (
    <section className="fw-nl-banner" aria-label="Résumé de la formule">
      <Sparkles className="fw-nl-banner__icon" aria-hidden />
      <div className="min-w-0">
        <p className="fw-nl-banner__title">Formule métier sans code</p>
        <p className="fw-nl-banner__text">
          {naturalLanguage}
          <span className="fw-nl-banner__hint"> Sélectionnez un bloc pour modifier sa configuration.</span>
        </p>
      </div>
    </section>
  );
}
