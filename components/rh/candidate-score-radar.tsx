'use client';

type ScoreRadarProps = {
  /** Score /10 */
  score: number;
  /** Progression 0–100 */
  progression: number;
  skillsCsv?: string | null;
  stageWeight?: number;
};

/** Mini radar 5 axes (score, progression, skills, fit, maturité stage) — SVG léger, pas Chart.js. */
export function CandidateScoreRadar({
  score,
  progression,
  skillsCsv,
  stageWeight = 0.4,
}: ScoreRadarProps) {
  const skillCount = (skillsCsv ?? '')
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  const axes = [
    { label: 'Score', value: Math.max(0, Math.min(1, score / 10)) },
    { label: 'Progression', value: Math.max(0, Math.min(1, progression / 100)) },
    { label: 'Skills', value: Math.max(0, Math.min(1, skillCount / 6)) },
    { label: 'Fit atelier', value: Math.max(0, Math.min(1, (score / 10) * 0.7 + stageWeight * 0.3)) },
    { label: 'Maturité', value: Math.max(0, Math.min(1, stageWeight)) },
  ];

  const cx = 54;
  const cy = 54;
  const r = 40;
  const n = axes.length;

  const point = (i: number, v: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return {
      x: cx + Math.cos(angle) * r * v,
      y: cy + Math.sin(angle) * r * v,
    };
  };

  const gridLevels = [0.33, 0.66, 1];
  const poly = axes
    .map((_, i) => {
      const p = point(i, axes[i]!.value);
      return `${p.x},${p.y}`;
    })
    .join(' ');

  return (
    <div className="radar-wrap">
      <svg className="radar-svg" viewBox="0 0 108 108" aria-hidden>
        {gridLevels.map((lvl) => (
          <polygon
            key={lvl}
            points={axes
              .map((_, i) => {
                const p = point(i, lvl);
                return `${p.x},${p.y}`;
              })
              .join(' ')}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.18}
            strokeWidth={1}
          />
        ))}
        {axes.map((_, i) => {
          const p = point(i, 1);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke="currentColor"
              strokeOpacity={0.2}
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={poly}
          fill="rgba(204, 0, 51, 0.28)"
          stroke="#FF174D"
          strokeWidth={1.5}
        />
      </svg>
      <div className="radar-legend">
        {axes.map((a) => (
          <div key={a.label}>
            <strong>{a.label}</strong> · {Math.round(a.value * 100)}%
          </div>
        ))}
      </div>
    </div>
  );
}

export function stageWeightFromLabel(stage: string): number {
  const order = [
    'Présélection',
    'Test Technique',
    'Entretien RH',
    'Offre envoyée',
    'Recruté',
    'Refusé',
  ];
  const i = order.indexOf(stage);
  if (stage === 'Refusé') return 0.1;
  if (i < 0) return 0.35;
  return (i + 1) / order.length;
}
