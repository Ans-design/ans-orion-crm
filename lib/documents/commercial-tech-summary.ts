/**
 * Résumé technique pour documents commerciaux (devis / proforma / facture).
 * La fiche atelier complète reste dans work-order-lines (GPAO).
 */

const DROP_RE = [
  /stock consomm/i,
  /surface réelle/i,
  /÷|\/\s*10[\s.]?000/i,
  /prix sur devis/i,
  /^quantit/i,
  /^laize\b/i,
  /^orientation/i,
  /^dos\b/i,
  /incomplète|non chiffrable/i,
  /^assemblage/i,
  /^bandes?\b/i,
];

/** Ordre de priorité des libellés conservés (max ~4). */
const KEEP_PRIORITY: { re: RegExp; rank: number }[] = [
  { re: /^type\b/i, rank: 1 },
  { re: /^dimension/i, rank: 2 },
  { re: /^impression\b|^face\b/i, rank: 3 },
  { re: /^surface facturable/i, rank: 4 },
  { re: /^format\b/i, rank: 5 },
  { re: /^aspect\b/i, rank: 6 },
  { re: /^papier\b|^grammage\b|^matériau|^matiere/i, rank: 7 },
  { re: /^finition\b/i, rank: 8 },
  { re: /^taille|^coloris|^couleur/i, rank: 9 },
];

function cleanTechLine(line: string): string {
  // « Surface facturable : 84 x 119 cm ÷ 10 000 = 25.00 m² » → valeur seule
  const formula = line.match(/^(Surface facturable)\s*:\s*.*?=\s*(.+)$/i);
  if (formula) return `${formula[1]} : ${formula[2]!.trim()}`;
  return line.trim();
}

function labelKey(line: string): string {
  const i = line.indexOf(':');
  const raw = (i >= 0 ? line.slice(0, i) : line).trim().toLowerCase();
  if (raw.startsWith('dimension')) return 'dimension';
  if (raw.startsWith('impression') || raw === 'face') return 'impression';
  if (raw.startsWith('surface facturable')) return 'surface facturable';
  if (raw.startsWith('format')) return 'format';
  return raw;
}

/**
 * Garde uniquement les infos client utiles (max 4 lignes).
 */
export function summarizeCommercialTechLines(lines: string[], max = 4): string[] {
  const cleaned = lines
    .map(cleanTechLine)
    .filter((l) => l.length > 0)
    .filter((l) => !DROP_RE.some((re) => re.test(l)));

  const scored: { line: string; rank: number; key: string }[] = [];
  for (const line of cleaned) {
    const hit = KEEP_PRIORITY.find((p) => p.re.test(line));
    if (!hit) continue;
    scored.push({ line, rank: hit.rank, key: labelKey(line) });
  }

  // Dédupliquer par libellé, garder le meilleur rang
  const byKey = new Map<string, { line: string; rank: number }>();
  for (const row of scored) {
    const prev = byKey.get(row.key);
    if (!prev || row.rank < prev.rank) byKey.set(row.key, row);
  }

  return [...byKey.values()]
    .sort((a, b) => a.rank - b.rank)
    .slice(0, max)
    .map((r) => r.line);
}
