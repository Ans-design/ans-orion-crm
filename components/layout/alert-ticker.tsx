'use client';

import { useEffect, useLayoutEffect, useState, useCallback, type CSSProperties } from 'react';
import Link from 'next/link';
import { AlertTriangle, Info, Radio } from 'lucide-react';
import { unwrapApiData } from '@/lib/api-client';
import { useBottomActionStackOptional } from '@/components/responsive/bottom-action-stack';

type TickerAlert = {
  id: string;
  type: string;
  label: string;
  href: string;
  severity: 'info' | 'warn' | 'critical';
};

const TICKER_H = 44;

export function AlertTicker() {
  const [alertes, setAlertes] = useState<TickerAlert[]>([]);
  const [paused, setPaused] = useState(false);
  const stack = useBottomActionStackOptional();
  const setLayerHeight = stack?.setLayerHeight;
  const offsetAbove = stack?.offsetAbove;

  const load = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    try {
      const r = await fetch('/api/alerts/ticker');
      if (r.ok) {
        const d = unwrapApiData<{ alertes?: TickerAlert[] }>(await r.json());
        setAlertes((d.alertes ?? []).filter((a: TickerAlert) => a.id !== 'ok'));
      }
    } catch {
      /* silencieux */
    }
  }, []);

  useEffect(() => {
    const boot = window.setTimeout(() => {
      void load();
    }, 400);
    const id = setInterval(load, 90_000);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(boot);
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [load]);

  const visible = alertes.length > 0;

  /* Réserve inset bas — ticker toujours fixed (phone + desktop) */
  useLayoutEffect(() => {
    if (!setLayerHeight) return;
    if (!visible) {
      setLayerHeight('ticker', 0);
      return () => setLayerHeight('ticker', 0);
    }
    /* barre + filet (~5mm) */
    setLayerHeight('ticker', TICKER_H + 20);
    return () => setLayerHeight('ticker', 0);
  }, [visible, setLayerHeight]);

  /* Marqueur HTML pour CSS (clearance / scroll-padding) — sync avant paint */
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (visible) root.setAttribute('data-orion-ticker', '1');
    else root.removeAttribute('data-orion-ticker');
    return () => root.removeAttribute('data-orion-ticker');
  }, [visible]);

  if (!visible) return null;

  const items = [...alertes, ...alertes];
  /* Stack bas (mobile nav) — 0 sur tablette/desktop (CSS gère l’inset) */
  const stackBottom = offsetAbove ? offsetAbove('ticker') : 0;

  return (
    <>
      {/* Même couche que le ticker — masque l’inset bas (évite body::after derrière le shell) */}
      <div className="orion-alert-ticker-scrim" aria-hidden />
      <div
        data-alert-ticker
        className="orion-alert-ticker"
        style={{ '--orion-ticker-stack': `${stackBottom}px` } as CSSProperties}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        role="region"
        aria-label="Alertes opérationnelles"
      >
        <div className="orion-alert-ticker__inner">
          <div className="orion-alert-ticker__brand" title="Alertes live">
            <Radio size={12} className="orion-alert-ticker__brand-icon" aria-hidden />
            <span className="orion-alert-ticker__brand-label">Live</span>
            <span className="orion-alert-ticker__count" aria-hidden>
              {alertes.length}
            </span>
          </div>

          <div className="orion-alert-ticker__track">
            <div
              className="orion-alert-ticker__rail"
              style={{
                animation:
                  alertes.length > 1 ? 'orion-ticker-scroll 55s linear infinite' : undefined,
                animationPlayState: paused ? 'paused' : 'running',
              }}
            >
              {items.map((a, i) => (
                <span key={`${a.id}-${i}`} className="orion-alert-ticker__item">
                  <Link
                    href={a.href}
                    className={`orion-alert-ticker__link orion-alert-ticker__link--${a.severity}`}
                  >
                    <span className="orion-alert-ticker__dot" aria-hidden />
                    {a.severity === 'info' ? (
                      <Info size={11} strokeWidth={2} aria-hidden />
                    ) : (
                      <AlertTriangle size={11} strokeWidth={2} aria-hidden />
                    )}
                    <span className="orion-alert-ticker__text">{a.label}</span>
                  </Link>
                  {i < items.length - 1 ? (
                    <span className="orion-alert-ticker__sep" aria-hidden>
                      ·
                    </span>
                  ) : null}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
