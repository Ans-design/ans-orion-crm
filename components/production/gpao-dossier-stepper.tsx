'use client';

import Link from 'next/link';
import { Check, Circle, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusBadgeClass } from '@/lib/ui/status-styles';
import { resolveGpaoEtapeModuleLink } from '@/lib/gpao/gpao-module-links';

type Etape = {
  ordre: number;
  nom: string;
  statut: string;
};

function stepState(statut: string): 'done' | 'active' | 'pending' | 'blocked' {
  const s = statut.toLowerCase();
  if (s.includes('termin') || s.includes('valid') || s.includes('fait') || s.includes('sauté')) return 'done';
  if (s.includes('cours') || s.includes('active')) return 'active';
  if (s.includes('bloq') || s.includes('incident')) return 'blocked';
  return 'pending';
}

type Props = {
  etapes: Etape[];
  compact?: boolean;
  /** Deep-link chaque étape vers le module métier réel */
  commandeId?: string | null;
};

export function GpaoDossierStepper({ etapes, compact, commandeId }: Props) {
  const sorted = [...etapes].sort((a, b) => a.ordre - b.ordre);
  const doneCount = sorted.filter((e) => stepState(e.statut) === 'done').length;
  const current = sorted.find((e) => {
    const st = stepState(e.statut);
    return st === 'active' || st === 'blocked' || st === 'pending';
  }) ?? sorted[sorted.length - 1];
  const currentState = current ? stepState(current.statut) : 'pending';

  if (compact) {
    return (
      <div className="gpao-step-mini" aria-label="Progression dossier GPAO">
        <div className="gpao-step-mini__head">
          <span className={`gpao-step-mini__current gpao-step-mini__current--${currentState}`}>
            {current ? `${current.ordre}. ${current.nom}` : '—'}
          </span>
          <span className="gpao-step-mini__count tabular-nums">
            {doneCount}/{sorted.length}
          </span>
        </div>
        <div className="gpao-step-mini__rail" role="list">
          {sorted.map((e) => {
            const st = stepState(e.statut);
            const link = resolveGpaoEtapeModuleLink(e.nom, { commandeId });
            return (
              <Link
                key={`${e.ordre}-${e.nom}`}
                href={link.href}
                role="listitem"
                title={`${e.ordre}. ${e.nom} — ${e.statut} → ${link.label}`}
                className={`gpao-step-mini__dot gpao-step-mini__dot--${st}`}
                onClick={(ev) => ev.stopPropagation()}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <ol className="gpao-step-timeline" aria-label="Timeline dossier GPAO">
      {sorted.map((e, i) => {
        const state = stepState(e.statut);
        const isLast = i === sorted.length - 1;
        const link = resolveGpaoEtapeModuleLink(e.nom, { commandeId });
        return (
          <li key={`${e.ordre}-${e.nom}`} className="gpao-step-timeline__item">
            <div className="gpao-step-timeline__axis">
              <span className={`gpao-step-timeline__node gpao-step-timeline__node--${state}`}>
                {state === 'done' ? <Check size={10} /> : state === 'active' ? <Loader2 size={10} className="animate-spin" /> : <Circle size={8} />}
              </span>
              {!isLast && <span className="gpao-step-timeline__line" aria-hidden />}
            </div>
            <div className="gpao-step-timeline__body">
              <Link
                href={link.href}
                className="gpao-step-timeline__name gpao-step-timeline__name--link"
                title={`Ouvrir ${link.label}`}
              >
                {e.nom}
                <ExternalLink size={11} aria-hidden />
              </Link>
              <span className={cn('gpao-step-timeline__badge', statusBadgeClass(e.statut))}>
                {e.statut}
              </span>
              <span className="gpao-step-timeline__module">{link.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
