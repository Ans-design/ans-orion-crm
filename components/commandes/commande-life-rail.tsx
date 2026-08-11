'use client';

import {
  COMMANDE_LIFE_RAIL,
  isLifeRailStepUnlocked,
  lifeRailStepIndex,
  type CommandeLifeRailStepId,
} from '@/lib/commande/commande-life-rail';

type Props = {
  activeId: CommandeLifeRailStepId;
  selectedId: CommandeLifeRailStepId;
  onSelect: (id: CommandeLifeRailStepId) => void;
};

export function CommandeLifeRail({ activeId, selectedId, onSelect }: Props) {
  const activeIdx = lifeRailStepIndex(activeId);
  const last = COMMANDE_LIFE_RAIL.length - 1;

  return (
    <nav className="cmd-node-rail cmd-life-rail cmd-node-rail--shell" aria-label="Parcours de la commande">
      <p className="cmd-node-rail__caption">Parcours de la commande</p>
      <ol className="cmd-node-rail__list">
        {COMMANDE_LIFE_RAIL.map((step, idx) => {
          const unlocked = isLifeRailStepUnlocked(step.id, activeId);
          const done = idx < activeIdx;
          const current = step.id === activeId;
          const selected = step.id === selectedId && unlocked;
          const locked = !unlocked;
          return (
            <li key={step.id} className="cmd-node-rail__item">
              <button
                type="button"
                title={
                  locked
                    ? 'Étape à venir — se débloque quand la tâche précédente est terminée'
                    : step.label
                }
                onClick={() => {
                  if (!unlocked) return;
                  onSelect(step.id);
                }}
                className={[
                  'cmd-node-rail__node',
                  done ? 'is-done' : '',
                  current ? 'is-current' : '',
                  selected ? 'is-selected' : '',
                  locked ? 'is-locked' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                aria-current={selected ? 'step' : undefined}
                aria-disabled={locked || undefined}
                tabIndex={locked ? -1 : undefined}
              >
                {current && <span className="cmd-node-rail__marker" aria-hidden />}
                <span className="cmd-node-rail__dot">{done ? '✓' : idx + 1}</span>
                <span className="cmd-node-rail__label">
                  <span className="cmd-life-rail__label-full">{step.label}</span>
                  <span className="cmd-life-rail__label-short">{step.shortLabel}</span>
                </span>
              </button>
              {idx < last && (
                <span
                  className={`cmd-node-rail__line ${idx < activeIdx ? 'is-done' : ''}`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
