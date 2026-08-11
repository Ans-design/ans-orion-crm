'use client';

import { useMemo, useRef, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import { Check, ChevronDown, ListOrdered } from 'lucide-react';
import type { ProductConfig } from '@/lib/data/config-types';
import {
  buildPosSteps,
  buildPosWizardStages,
  resolveWizardStageIndex,
  type PosWizardStage,
} from '@/lib/pos/step-assistant';
import { locatePosField } from '@/lib/pos/locate-pos-field';

/** Largeur pastille commune POS (= Packaging ~227px) — tous les articles. */
const POS_STEP_PILL_MIN_PX = 228;

type Props = {
  productConfig: ProductConfig | null;
  config: Record<string, unknown>;
  completion: { done: number; total: number; pct: number };
  className?: string;
  /** Mode wizard : étape active contrôlée (clé champ ou primaryKey de stage) */
  activeFieldKey?: string | null;
  onSelectField?: (key: string) => void;
  /** Étapes compactes (matière+grammage, dimensions…) — fournies par PosConfigWizard */
  wizardStages?: PosWizardStage[];
};

/** Stepper premium — scroll horizontal, jamais compressé */
export function PosStepAssistant({
  productConfig,
  config,
  completion,
  className = '',
  activeFieldKey = null,
  onSelectField,
  wizardStages,
}: Props) {
  const flatSteps = useMemo(
    () => buildPosSteps(productConfig, config),
    [productConfig, config],
  );

  /** Toujours le compactage type Packaging (boîte) : dimensions / matière+grammage regroupés. */
  const stages = useMemo(() => {
    if (wizardStages && wizardStages.length > 0) return wizardStages;
    return buildPosWizardStages(productConfig, config);
  }, [wizardStages, productConfig, config]);

  const useStages = stages.length > 0;

  const currentIdx = useStages
    ? resolveWizardStageIndex(stages, activeFieldKey)
    : activeFieldKey
      ? Math.max(0, flatSteps.findIndex((s) => s.field.key === activeFieldKey))
      : flatSteps.findIndex((s) => s.isCurrent);

  const stageCurrent = useStages ? stages[currentIdx] : undefined;
  const flatCurrent = !useStages && currentIdx >= 0 ? flatSteps[currentIdx] : undefined;
  const stepCount = useStages ? stages.length : flatSteps.length;
  const currentLabel = useStages
    ? (stageCurrent?.label ?? 'Configuration')
    : (flatCurrent?.field.label ?? 'Configuration');
  const currentComplete = useStages
    ? Boolean(stageCurrent?.complete)
    : Boolean(flatCurrent?.complete);

  const allDone = completion.done >= completion.total && completion.total > 0;
  const remaining = Math.max(0, completion.total - completion.done);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Étape cliquée — reste mise en avant pour savoir où l’on se situe */
  const [navKey, setNavKey] = useState<string | null>(null);
  /** Largeur pastille unique (min Packaging, ou plus si libellé plus long). */
  const [pillW, setPillW] = useState(POS_STEP_PILL_MIN_PX);

  const stageLabelsKey = useStages
    ? stages.map((s) => s.label).join('|')
    : flatSteps.map((s) => s.field.label).join('|');

  const displayIdx = useMemo(() => {
    if (!navKey) return currentIdx;
    if (useStages) return resolveWizardStageIndex(stages, navKey);
    const idx = flatSteps.findIndex((s) => s.field.key === navKey);
    return idx >= 0 ? idx : currentIdx;
  }, [navKey, currentIdx, useStages, stages, flatSteps]);

  const displayLabel = useMemo(() => {
    if (displayIdx < 0) return currentLabel;
    if (useStages) return stages[displayIdx]?.label ?? currentLabel;
    return flatSteps[displayIdx]?.field.label ?? currentLabel;
  }, [displayIdx, useStages, stages, flatSteps, currentLabel]);

  const pillStyle = useMemo(
    () =>
      ({
        width: pillW,
        minWidth: pillW,
        maxWidth: pillW,
        flex: `0 0 ${pillW}px`,
      }) satisfies CSSProperties,
    [pillW],
  );

  /** Largeur unique = max(libellé le plus long, plancher Packaging) — même aspect tous articles. */
  useLayoutEffect(() => {
    const root = scrollRef.current;
    const wrap = scrollWrapRef.current;
    if (!root || !wrap) return;

    const measure = () => {
      const items = Array.from(
        root.querySelectorAll<HTMLElement>('.pos-stepper-premium__item:not(.is-mobile-current)'),
      );
      if (!items.length) {
        setPillW(POS_STEP_PILL_MIN_PX);
        return;
      }

      // Mesure naturelle hors contrainte --pos-step-item-w
      root.style.setProperty('--pos-step-item-w', 'max-content');
      for (const el of items) {
        el.style.width = 'max-content';
        el.style.minWidth = '0';
        el.style.maxWidth = 'none';
        el.style.flex = '0 0 auto';
      }

      let contentMax = 0;
      for (const el of items) {
        contentMax = Math.max(contentMax, Math.ceil(el.getBoundingClientRect().width));
      }

      for (const el of items) {
        el.style.width = '';
        el.style.minWidth = '';
        el.style.maxWidth = '';
        el.style.flex = '';
      }

      const next = Math.max(contentMax, POS_STEP_PILL_MIN_PX);
      root.style.setProperty('--pos-step-item-w', `${next}px`);
      setPillW(next);

      const overflow = items.length * next > root.clientWidth + 1
        || root.scrollWidth > root.clientWidth + 1;
      wrap.classList.toggle('is-overflow', overflow);
      const sl = root.scrollLeft;
      wrap.classList.toggle('can-scroll-left', overflow && sl > 2);
      wrap.classList.toggle(
        'can-scroll-right',
        overflow && sl < root.scrollWidth - root.clientWidth - 2,
      );
    };

    measure();
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(() => requestAnimationFrame(measure));
    ro.observe(wrap);
    root.addEventListener('scroll', measure, { passive: true });
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (root.scrollWidth <= root.clientWidth + 1) return;
      e.preventDefault();
      root.scrollLeft += e.deltaY;
    };
    root.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      root.removeEventListener('scroll', measure);
      root.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', measure);
    };
  }, [stepCount, stageLabelsKey]);

  /** Glisser pour défiler — capture uniquement après un vrai drag (ne bloque pas le clic). */
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const drag = {
      tracking: false,
      active: false,
      pointerId: -1,
      startX: 0,
      startScroll: 0,
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (root.scrollWidth <= root.clientWidth + 1) return;
      // Ne pas capturer ici : sinon le click n’atteint jamais les pastilles.
      drag.tracking = true;
      drag.active = false;
      drag.pointerId = e.pointerId;
      drag.startX = e.clientX;
      drag.startScroll = root.scrollLeft;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!drag.tracking || e.pointerId !== drag.pointerId) return;
      const dx = e.clientX - drag.startX;
      if (!drag.active) {
        if (Math.abs(dx) < 8) return;
        drag.active = true;
        root.classList.add('is-dragging');
        try {
          root.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      e.preventDefault();
      root.scrollLeft = drag.startScroll - dx;
    };

    const endDrag = (e: PointerEvent) => {
      if (!drag.tracking || e.pointerId !== drag.pointerId) return;
      const wasDrag = drag.active;
      drag.tracking = false;
      drag.active = false;
      drag.pointerId = -1;
      root.classList.remove('is-dragging');
      try {
        if (root.hasPointerCapture(e.pointerId)) {
          root.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      if (wasDrag) {
        const blockClick = (ev: Event) => {
          ev.preventDefault();
          ev.stopPropagation();
          root.removeEventListener('click', blockClick, true);
        };
        root.addEventListener('click', blockClick, true);
        window.setTimeout(() => root.removeEventListener('click', blockClick, true), 0);
      }
    };

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('pointermove', onPointerMove);
    root.addEventListener('pointerup', endDrag);
    root.addEventListener('pointercancel', endDrag);
    return () => {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('pointermove', onPointerMove);
      root.removeEventListener('pointerup', endDrag);
      root.removeEventListener('pointercancel', endDrag);
      root.classList.remove('is-dragging');
    };
  }, [stepCount, stageLabelsKey]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || displayIdx < 0) return;
    const el = root.querySelector<HTMLElement>(`[data-step-idx="${displayIdx}"]`);
    if (!el) return;
    const left = el.offsetLeft - (root.clientWidth - el.clientWidth) / 2;
    root.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }, [displayIdx, stepCount, stageLabelsKey]);

  if (!productConfig || stepCount === 0) return null;

  const selectKey = (key: string) => {
    setNavKey(key);
    onSelectField?.(key);
    // Toujours animer (contour rouge + flash) — même principe Packaging / tous articles
    locatePosField(key);
    setMobileOpen(false);
  };

  const keyAt = (idx: number) =>
    useStages ? stages[idx]!.primaryKey : flatSteps[idx]!.field.key;

  const footerCopy = allDone
    ? 'Configuration complète — prêt pour le panier'
    : displayLabel
      ? `Étape ${displayIdx + 1}/${stepCount} — ${displayLabel}${
          remaining > 0
            ? ` · ${remaining} champ${remaining > 1 ? 's' : ''} restant${remaining > 1 ? 's' : ''}`
            : ''
        }`
      : `${completion.done}/${completion.total} champs`;

  return (
    <nav
      className={`pos-stepper-premium ${className}`}
      aria-label="Assistant configuration POS"
      style={{ ['--pos-step-item-w' as string]: `${pillW}px` }}
    >
      <div ref={scrollWrapRef} className="pos-stepper-premium__scroll-wrap hidden sm:block">
        <div ref={scrollRef} className="pos-stepper-premium__scroll">
          {useStages
            ? stages.map((stage, idx) => {
                const isCurrent = idx === displayIdx;
                return (
                  <button
                    key={stage.id}
                    type="button"
                    data-step-idx={idx}
                    onClick={() => selectKey(stage.primaryKey)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Étape ${idx + 1} : ${stage.label}${stage.complete ? ' — complétée' : ''}`}
                    className={`pos-stepper-premium__item ${
                      isCurrent ? 'is-current' : stage.complete ? 'is-done' : 'is-pending'
                    }`}
                    style={pillStyle}
                  >
                    <span className="pos-stepper-premium__num" aria-hidden>
                      {stage.complete && !isCurrent ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span className="pos-stepper-premium__text">
                      <span className="pos-stepper-premium__meta">Étape {idx + 1}</span>
                      <span className="pos-stepper-premium__label">{stage.label}</span>
                    </span>
                  </button>
                );
              })
            : flatSteps.map(({ field, complete }, idx) => {
                const isCurrent = idx === displayIdx;
                return (
                  <button
                    key={field.key}
                    type="button"
                    data-step-idx={idx}
                    onClick={() => selectKey(field.key)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Étape ${idx + 1} : ${field.label}${complete ? ' — complétée' : ''}`}
                    className={`pos-stepper-premium__item ${
                      isCurrent ? 'is-current' : complete ? 'is-done' : 'is-pending'
                    }`}
                    style={pillStyle}
                  >
                    <span className="pos-stepper-premium__num" aria-hidden>
                      {complete && !isCurrent ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <span className="pos-stepper-premium__text">
                      <span className="pos-stepper-premium__meta">Étape {idx + 1}</span>
                      <span className="pos-stepper-premium__label">{field.label}</span>
                    </span>
                  </button>
                );
              })}
        </div>
      </div>

      <div className="sm:hidden space-y-2">
        <div className="flex items-center gap-2">
          {displayIdx > 0 && (
            <button
              type="button"
              className="pos-stepper-premium__nav-btn"
              onClick={() => selectKey(keyAt(displayIdx - 1))}
              aria-label="Étape précédente"
            >
              ←
            </button>
          )}
          <div className="pos-stepper-premium__item is-current is-mobile-current flex-1 min-w-0">
            <span className="pos-stepper-premium__num">
              {currentComplete && displayIdx === stepCount - 1 ? (
                <Check size={14} strokeWidth={3} />
              ) : (
                (displayIdx >= 0 ? displayIdx + 1 : 1)
              )}
            </span>
            <span className="pos-stepper-premium__text min-w-0">
              <span className="pos-stepper-premium__meta">
                Étape {Math.max(1, displayIdx + 1)}/{stepCount}
              </span>
              <span className="pos-stepper-premium__label truncate">
                {displayLabel}
              </span>
            </span>
          </div>
          {displayIdx >= 0 && displayIdx < stepCount - 1 && (
            <button
              type="button"
              className="pos-stepper-premium__nav-btn"
              onClick={() => selectKey(keyAt(displayIdx + 1))}
              aria-label="Étape suivante"
            >
              →
            </button>
          )}
        </div>
        <button
          type="button"
          className="pos-stepper-premium__all-btn"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
        >
          <ListOrdered size={14} />
          Voir les {stepCount} étapes
          <ChevronDown
            size={14}
            className={`transition-transform ${mobileOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {mobileOpen && (
          <div className="pos-stepper-premium__mobile-list">
            {useStages
              ? stages.map((stage, idx) => {
                  const isCurrent = idx === displayIdx;
                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() => selectKey(stage.primaryKey)}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`pos-stepper-premium__mobile-row ${
                        isCurrent ? 'is-current' : stage.complete ? 'is-done' : ''
                      }`}
                    >
                      <span className="pos-stepper-premium__num">
                        {stage.complete && !isCurrent ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="font-semibold truncate">{stage.label}</span>
                    </button>
                  );
                })
              : flatSteps.map(({ field, complete }, idx) => {
                  const isCurrent = idx === displayIdx;
                  return (
                    <button
                      key={field.key}
                      type="button"
                      onClick={() => selectKey(field.key)}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`pos-stepper-premium__mobile-row ${
                        isCurrent ? 'is-current' : complete ? 'is-done' : ''
                      }`}
                    >
                      <span className="pos-stepper-premium__num">
                        {complete && !isCurrent ? (
                          <Check size={12} strokeWidth={3} />
                        ) : (
                          idx + 1
                        )}
                      </span>
                      <span className="font-semibold truncate">{field.label}</span>
                    </button>
                  );
                })}
          </div>
        )}
      </div>

      <div className="pos-stepper-premium__footer">
        <p className="pos-stepper-premium__footer-copy">{footerCopy}</p>
        <span className="pos-stepper-premium__pct tabular-nums">{completion.pct}%</span>
      </div>

      <div className="pos-stepper-premium__track" aria-hidden>
        <div
          className={`pos-stepper-premium__fill ${allDone ? 'is-done' : ''}`}
          style={{ width: `${completion.pct}%` }}
        />
      </div>
    </nav>
  );
}
