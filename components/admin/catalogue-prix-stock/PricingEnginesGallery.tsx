'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/ui/app-ui';
import type { PricingFamilyCoverage } from '@/lib/pricing/pricing-types';
import {
  PRICING_GALLERY_ENGINES,
  coverageForEngine,
  matchEngineByFamily,
  type PricingEngineDef,
} from '@/lib/pricing/pricing-engines-registry';

/**
 * Moteurs tarifaires — liste maître + panneau détail.
 * Les moteurs restent des logiques par famille : l’édition réelle se fait dans
 * le workspace de la famille (deep-link conservé) — pas de duplication de règles.
 */
type EngineDef = PricingEngineDef;

const ENGINES: EngineDef[] = PRICING_GALLERY_ENGINES;
/** ISF reste masqué (hidden: true) — deep-links conservés via registry. */

export { ENGINES, coverageForEngine, matchEngineByFamily };
export type { EngineDef };

type Props = {
  activeEngine?: string | null;
  className?: string;
};

export function PricingEnginesGallery({ activeEngine, className }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [families, setFamilies] = useState<PricingFamilyCoverage[]>([]);
  const [loaded, setLoaded] = useState(false);

  const visibleEngines = useMemo(() => ENGINES.filter((e) => !e.hidden), []);
  const urlEngine = searchParams.get('engine');
  const selectedId =
    visibleEngines.find((e) => e.id === (urlEngine ?? activeEngine))?.id
    ?? visibleEngines[0]?.id
    ?? ENGINES.find((e) => !e.hidden)?.id
    ?? 'flyers';
  const selected = ENGINES.find((e) => e.id === selectedId) ?? visibleEngines[0]!;

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/pricing/overview');
        const d = await r.json();
        if (r.ok && Array.isArray(d.families)) setFamilies(d.families);
      } catch {
        /* compteurs indisponibles — affichés « — » */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const coverage = useMemo(() => coverageForEngine(selected, families), [selected, families]);

  const selectEngine = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('engine', id);
    router.replace(`/administration/catalogue-prix-stock?${params.toString()}`, { scroll: false });
  };

  return (
    <div className={cn('cps-engines-layout', className)}>
      <aside className="cps-engines-list" aria-label="Moteurs tarifaires">
        <div className="cps-engines-list__head">
          <p className="cps-engines-list__title">Moteurs tarifaires</p>
          <p className="cps-engines-list__sub">Une logique centrale par famille.</p>
        </div>
        <ul>
          {visibleEngines.map((e) => {
            const cov = coverageForEngine(e, families);
            const isActive = e.id === selectedId;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  className={cn('cps-engines-list__item', isActive && 'is-active')}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => selectEngine(e.id)}
                >
                  <span className="min-w-0">
                    <span className="cps-engines-list__label">{e.label}</span>
                    <span className="cps-engines-list__desc">{e.desc}</span>
                  </span>
                  <span
                    className={cn(
                      'cps-engines-list__badge',
                      cov.published > 0 && 'cps-engines-list__badge--ok',
                    )}
                  >
                    {!loaded ? '…' : cov.profiles > 0 ? `${cov.profiles}` : '—'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      <section className="cps-engines-detail" aria-live="polite">
        <div className="cps-engines-detail__head">
          <div className="min-w-0">
            <h3 className="cps-engines-detail__title">{selected.label}</h3>
            <p className="cps-engines-detail__sub">{selected.desc}</p>
          </div>
          <span
            className={cn(
              'cps-prio-badge',
              coverage.published > 0 ? 'cps-prio-badge--ok' : 'cps-prio-badge--info',
            )}
          >
            {coverage.published > 0 ? 'Actif' : 'Sans profil publié'}
          </span>
        </div>

        <dl className="cps-engines-facts">
          <div>
            <dt>Unité principale</dt>
            <dd>{selected.unit}</dd>
          </div>
          <div>
            <dt>Profils tarifaires</dt>
            <dd>{!loaded ? '…' : coverage.profiles > 0 ? coverage.profiles : '—'}</dd>
          </div>
          <div>
            <dt>Actifs</dt>
            <dd>{!loaded ? '…' : coverage.published}</dd>
          </div>
          <div>
            <dt>Brouillons</dt>
            <dd>{!loaded ? '…' : coverage.draft}</dd>
          </div>
        </dl>
        {coverage.families.length > 0 ? (
          <p className="cps-engines-families">
            Familles couvertes :{' '}
            {coverage.families.map((f) => (
              <code key={f} className="cps-pricing-code">
                {f}
              </code>
            ))}
          </p>
        ) : null}

        <div className="cps-engines-rules">
          <p className="cps-engines-rules__title">Règles associées</p>
          <p className="cps-engines-rules__sub">
            Règles métier confirmées — la source canonique reste le moteur de la famille.
          </p>
          <div className="cps-engines-rules__grid">
            {selected.rules.map((r) => (
              <div key={r.label} className="cps-engines-rule">
                <span className="cps-engines-rule__label">{r.label}</span>
                <span className="cps-engines-rule__detail">{r.detail}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="cps-engines-actions">
          <AppButton asChild variant="default">
            <Link href={selected.href}>
              Ouvrir le moteur de la famille
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </AppButton>
        </div>
      </section>
    </div>
  );
}
