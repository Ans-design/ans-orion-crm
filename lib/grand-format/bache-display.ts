import { evaluateBache, bacheCartSummaryLine } from '@/lib/grand-format/bache-rules';

export function bacheSummaryLines(config: Record<string, unknown>): string[] {
  const ev = evaluateBache(config);
  return ev.summaryLines.length ? ev.summaryLines : [];
}

export function bacheWorkOrderBlock(config: Record<string, unknown>): string[] {
  const lines = bacheSummaryLines(config);
  const face = String(config.face ?? 'Recto seul');
  lines.push(`Impression : ${face}`);
  return lines;
}

export { bacheCartSummaryLine };
