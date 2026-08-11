import { describe, expect, it } from 'vitest';
import { summarizeConfigSnapshot } from '@/lib/commande/config-snapshot-lines';
import { CALENDAR_SNAPSHOT_VERSION } from '@/lib/calendar/calendar-snapshot';

describe('config-snapshot-lines calendar', () => {
  it('affiche le récap calendrier depuis _calendarSnapshot', () => {
    const summary = summarizeConfigSnapshot(
      'Calendrier plateau',
      100,
      {
        format: 'A3 — 297×420 mm',
        _calendarSnapshot: {
          formulaVersion: CALENDAR_SNAPSHOT_VERSION,
          formatLabel: 'A3 — 297×420 mm',
          widthMm: 297,
          heightMm: 420,
          material: 'PCB',
          grammage: '350g',
          printMode: 'Recto seul',
          numberOfSheets: 12,
          totalGrossSurfaceM2: 0.6,
        },
      },
      'cal-plateau',
    );
    expect(summary.lines.some((l) => l.key === 'Format')).toBe(true);
    expect(summary.lines.some((l) => l.key === 'Feuillets')).toBe(true);
    expect(summary.lines.some((l) => l.key === 'Surface brute tot.')).toBe(true);
  });
});
