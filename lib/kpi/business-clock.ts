/**
 * BusinessClock — fuseau métier Indian/Antananarivo, bornes [from, to).
 * Sans dépendance luxon : calcul via Intl + décalage fixe +03 (EAT, sans DST).
 */

export const DEFAULT_BUSINESS_TIMEZONE = 'Indian/Antananarivo';

/** Offset fixe EAT (Antananarivo n’observe pas l’heure d’été). */
const TANA_OFFSET_MS = 3 * 60 * 60 * 1000;

export type BusinessPeriodPreset = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

export type BusinessPeriod = {
  from: Date;
  to: Date;
  fromIso: string;
  toIso: string;
  timezone: string;
  preset: BusinessPeriodPreset;
  label: string;
};

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Parties calendaires dans le fuseau métier. */
export function zonedParts(date: Date, timeZone = DEFAULT_BUSINESS_TIMEZONE) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Instant UTC correspondant à minuit métier (début de jour Tana). */
export function startOfBusinessDay(date: Date, timeZone = DEFAULT_BUSINESS_TIMEZONE): Date {
  const p = zonedParts(date, timeZone);
  // Tana = UTC+3 → minuit local = 21:00 UTC veille
  const utcMs = Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0, 0) - TANA_OFFSET_MS;
  return new Date(utcMs);
}

export function addBusinessDays(start: Date, days: number, timeZone = DEFAULT_BUSINESS_TIMEZONE): Date {
  const p = zonedParts(start, timeZone);
  const utcMs = Date.UTC(p.year, p.month - 1, p.day + days, 0, 0, 0, 0) - TANA_OFFSET_MS;
  return new Date(utcMs);
}

export function resolveBusinessPeriod(input: {
  preset?: BusinessPeriodPreset;
  fromIso?: string;
  toIso?: string;
  now?: Date;
  timeZone?: string;
}): BusinessPeriod {
  const timeZone = input.timeZone ?? DEFAULT_BUSINESS_TIMEZONE;
  const now = input.now ?? new Date();
  const preset = input.preset ?? 'week';

  if (preset === 'custom' && input.fromIso && input.toIso) {
    const from = new Date(input.fromIso);
    const to = new Date(input.toIso);
    return {
      from,
      to,
      fromIso: from.toISOString(),
      toIso: to.toISOString(),
      timezone: timeZone,
      preset,
      label: `${input.fromIso.slice(0, 10)} → ${input.toIso.slice(0, 10)}`,
    };
  }

  const dayStart = startOfBusinessDay(now, timeZone);
  let from = dayStart;
  let to = addBusinessDays(dayStart, 1, timeZone);
  let label = 'Aujourd’hui';

  if (preset === 'week') {
    from = addBusinessDays(dayStart, -6, timeZone);
    to = addBusinessDays(dayStart, 1, timeZone);
    label = '7 jours';
  } else if (preset === 'month') {
    const p = zonedParts(now, timeZone);
    from = new Date(Date.UTC(p.year, p.month - 1, 1, 0, 0, 0, 0) - TANA_OFFSET_MS);
    to = new Date(Date.UTC(p.year, p.month, 1, 0, 0, 0, 0) - TANA_OFFSET_MS);
    label = `${pad(p.month)}/${p.year}`;
  } else if (preset === 'quarter') {
    const p = zonedParts(now, timeZone);
    const qStartMonth = Math.floor((p.month - 1) / 3) * 3;
    from = new Date(Date.UTC(p.year, qStartMonth, 1, 0, 0, 0, 0) - TANA_OFFSET_MS);
    to = new Date(Date.UTC(p.year, qStartMonth + 3, 1, 0, 0, 0, 0) - TANA_OFFSET_MS);
    label = `T${Math.floor(qStartMonth / 3) + 1} ${p.year}`;
  } else if (preset === 'year') {
    const p = zonedParts(now, timeZone);
    from = new Date(Date.UTC(p.year, 0, 1, 0, 0, 0, 0) - TANA_OFFSET_MS);
    to = new Date(Date.UTC(p.year + 1, 0, 1, 0, 0, 0, 0) - TANA_OFFSET_MS);
    label = String(p.year);
  } else if (preset === 'day') {
    label = 'Aujourd’hui';
  }

  return {
    from,
    to,
    fromIso: from.toISOString(),
    toIso: to.toISOString(),
    timezone: timeZone,
    preset,
    label,
  };
}

/** Prisma where pour champ DateTime inclusif début / exclusif fin. */
export function prismaDateRangeFilter(period: BusinessPeriod) {
  return { gte: period.from, lt: period.to };
}
