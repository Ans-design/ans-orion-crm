'use client';

const STEPS = [
  { n: 1, label: 'Prestation' },
  { n: 2, label: 'Niveau' },
  { n: 3, label: 'Options' },
  { n: 4, label: 'Brief' },
  { n: 5, label: 'Récap' },
  { n: 6, label: 'BAT' },
  { n: 7, label: 'Panier' },
];

type Props = {
  step: number;
  onStep: (n: number) => void;
};

/** Stepper 7 étapes — conservé (legacy / deep-links).
 *  L’écran POS Conception utilise désormais une config mono-écran sans Suivant. */
export function ConceptionStepper({ step, onStep }: Props) {
  return (
    <div className="bg-card border border-border rounded-[7px] p-4 overflow-x-auto">
      <div className="flex items-center gap-1 min-w-max">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <button
              type="button"
              onClick={() => onStep(s.n)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                step === s.n
                  ? 'bg-primary/15 text-primary ring-1 ring-primary/30'
                  : step > s.n
                    ? 'text-green-500'
                    : 'text-muted-foreground hover:bg-accent'
              }`}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                step === s.n ? 'bg-primary text-white' : step > s.n ? 'bg-green-500/20' : 'bg-accent'
              }`}>{s.n}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`w-6 h-0.5 mx-1 ${step > s.n ? 'bg-green-500/50' : 'bg-border'}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export { STEPS as CONCEPTION_STEPS };
