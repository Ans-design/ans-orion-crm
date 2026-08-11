export type MetierTaskEvaluation = {
  quality: number;
  delay: number;
  comment?: string;
  problemEncountered?: string;
  evaluatedBy: string;
  evaluatedAt: string;
};

export function parseTaskEvaluation(raw: unknown): MetierTaskEvaluation | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.quality !== 'number' || typeof o.delay !== 'number') return null;
  return {
    quality: o.quality,
    delay: o.delay,
    comment: typeof o.comment === 'string' ? o.comment : undefined,
    problemEncountered: typeof o.problemEncountered === 'string' ? o.problemEncountered : undefined,
    evaluatedBy: String(o.evaluatedBy ?? ''),
    evaluatedAt: String(o.evaluatedAt ?? ''),
  };
}

export function buildTaskEvaluation(
  data: { quality: number; delay: number; comment?: string; problemEncountered?: string },
  author: string,
): MetierTaskEvaluation {
  return {
    quality: data.quality,
    delay: data.delay,
    comment: data.comment?.trim() || undefined,
    problemEncountered: data.problemEncountered?.trim() || undefined,
    evaluatedBy: author,
    evaluatedAt: new Date().toISOString(),
  };
}

export type AssigneeTaskKpi = {
  assigneeName: string;
  completed: number;
  avgQuality: number;
  avgDelay: number;
  avgElapsedMin: number;
  onTimePct: number;
};

export function aggregateTaskKpis(
  tasks: {
    assigneeName: string | null;
    status: string;
    elapsedSec: number;
    estimatedMin: number | null;
    evaluation: unknown;
  }[],
): AssigneeTaskKpi[] {
  const byName = new Map<string, {
    completed: number;
    qualitySum: number;
    qualityCount: number;
    delaySum: number;
    delayCount: number;
    elapsedSum: number;
    onTime: number;
    withEstimate: number;
  }>();

  for (const t of tasks) {
    if (t.status !== 'Terminée' || !t.assigneeName) continue;
    const name = t.assigneeName;
    const bucket = byName.get(name) ?? {
      completed: 0, qualitySum: 0, qualityCount: 0,
      delaySum: 0, delayCount: 0, elapsedSum: 0, onTime: 0, withEstimate: 0,
    };
    bucket.completed += 1;
    bucket.elapsedSum += t.elapsedSec;
    if (t.estimatedMin && t.estimatedMin > 0) {
      bucket.withEstimate += 1;
      if (t.elapsedSec <= t.estimatedMin * 60) bucket.onTime += 1;
    }
    const ev = parseTaskEvaluation(t.evaluation);
    if (ev) {
      bucket.qualitySum += ev.quality;
      bucket.qualityCount += 1;
      bucket.delaySum += ev.delay;
      bucket.delayCount += 1;
    }
    byName.set(name, bucket);
  }

  return [...byName.entries()].map(([assigneeName, b]) => ({
    assigneeName,
    completed: b.completed,
    avgQuality: b.qualityCount ? Math.round((b.qualitySum / b.qualityCount) * 10) / 10 : 0,
    avgDelay: b.delayCount ? Math.round((b.delaySum / b.delayCount) * 10) / 10 : 0,
    avgElapsedMin: b.completed ? Math.round(b.elapsedSum / b.completed / 60) : 0,
    onTimePct: b.withEstimate ? Math.round((b.onTime / b.withEstimate) * 100) : 0,
  })).sort((a, b) => b.completed - a.completed);
}
