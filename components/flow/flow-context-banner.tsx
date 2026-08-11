'use client';

import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import type { NextAction } from '@/lib/flow/next-action';
import { AppButton } from '@/components/ui/app-ui';
import { cn } from '@/lib/utils';

type Props = {
  processStep: string;
  status: string;
  nextAction?: NextAction | null;
  impactedModules?: string[];
  className?: string;
};

/** Bannière « 4 questions » du flow métier — surface soft, zéro cadre. */
export function FlowContextBanner({
  processStep,
  status,
  nextAction,
  impactedModules = [],
  className = '',
}: Props) {
  return (
    <div
      className={cn('orion-flow-banner', className)}
      role="region"
      aria-label="Contexte processus métier"
    >
      <div className="orion-flow-banner__row">
        <MapPin size={13} className="orion-flow-banner__pin" aria-hidden />
        <p className="orion-flow-banner__process">
          <span className="orion-flow-banner__label">Processus</span>
          <span className="orion-flow-banner__value">{processStep}</span>
          <span className="orion-flow-banner__sep" aria-hidden>
            ·
          </span>
          <span className="orion-flow-banner__label">Statut</span>
          <span className="orion-flow-banner__status">{status}</span>
        </p>
      </div>

      {nextAction ? (
        <div className="orion-flow-banner__next">
          <div className="min-w-0">
            <p className="orion-flow-banner__next-kicker">Prochaine action</p>
            <p className="orion-flow-banner__next-title">{nextAction.label}</p>
            {nextAction.description ? (
              <p className="orion-flow-banner__next-desc">{nextAction.description}</p>
            ) : null}
          </div>
          <AppButton
            asChild
            size="sm"
            variant="outline"
            className={cn(
              'shrink-0',
              /facture/i.test(nextAction.label)
                ? 'bg-[#7b1fa2]/10 text-[#7b1fa2] border-[#7b1fa2]/30 hover:bg-[#7b1fa2]/20'
                : undefined,
            )}
          >
            <Link href={nextAction.href} className="inline-flex items-center gap-1.5">
              {nextAction.label}
              <ArrowRight size={14} aria-hidden />
            </Link>
          </AppButton>
        </div>
      ) : null}

      {impactedModules.length > 0 ? (
        <p className="orion-flow-banner__modules">
          Modules impactés : {impactedModules.join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
