import { prisma } from '@/lib/prisma';

const DEFAULT_TICKER = [
  { text: "⚠ Retard Planning — BAT en attente de validation. Délai d'impression en péril.", priority: 'critical' },
  { text: '🚨 Panne Critique — Intervention machine nécessaire immédiatement.', priority: 'critical' },
  { text: '⚠ Stock — Rupture détectée. Réapprovisionner immédiatement.', priority: 'warn' },
  { text: "ℹ Réunion d'équipe — Présence obligatoire.", priority: 'info' },
];

export async function ensureDefaultTickerMessages() {
  const count = await prisma.tickerMessage.count();
  if (count > 0) return;
  await prisma.tickerMessage.createMany({
    data: DEFAULT_TICKER.map((m) => ({ text: m.text, priority: m.priority, active: true })),
  });
}

export async function listTickerMessages() {
  await ensureDefaultTickerMessages();
  return prisma.tickerMessage.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function listActiveTickerTexts(): Promise<string[]> {
  const msgs = await listTickerMessages();
  return msgs.filter((m) => m.active).map((m) => m.text);
}

export async function createTickerMessage(text: string, priority = 'normal') {
  return prisma.tickerMessage.create({ data: { text: text.trim(), priority, active: true } });
}

export async function updateTickerMessage(
  id: string,
  data: Partial<{ text: string; active: boolean; priority: string }>,
) {
  return prisma.tickerMessage.update({ where: { id }, data });
}

export async function deleteTickerMessage(id: string) {
  return prisma.tickerMessage.delete({ where: { id } });
}
