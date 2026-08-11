'use client';

import type { EnterpriseHealth } from '@/lib/cockpit/enterprise-health';
import { ANS } from '@/lib/ans-colors';

const STATUS_COLORS = {
  ok: '#64748B',
  warn: ANS.yellow,
  alert: ANS.red,
};

type Props = {
  health: EnterpriseHealth;
};

export function EnterpriseHealthScore({ health }: Props) {
  const globalColor = STATUS_COLORS[health.globalStatus];

  return (
    <div className="dashboard-chart-card rounded-[7px]">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display font-semibold text-sm">Santé entreprise</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{health.summary}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold font-mono" style={{ color: globalColor }}>
            {health.globalScore}%
          </div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Score global</div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {health.domains.map((d) => (
          <div
            key={d.id}
            className="rounded-[7px] border border-border p-2.5 bg-card/50"
            title={d.hint}
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-semibold uppercase text-muted-foreground truncate">{d.label}</span>
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: STATUS_COLORS[d.status] }}
              />
            </div>
            <div className="text-lg font-bold font-mono" style={{ color: STATUS_COLORS[d.status] }}>
              {d.score}%
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{d.hint}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
