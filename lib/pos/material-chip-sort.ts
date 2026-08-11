/**
 * Ordre métier matières papier — du plus standard au plus premium.
 * « Matière personnalisée » toujours en dernier (via isCustomLabel).
 */
const PAPER_MATERIAL_RANK: Array<{ rank: number; match: RegExp }> = [
  { rank: 10, match: /^offset\b/i },
  { rank: 20, match: /papier\s*standard/i },
  { rank: 30, match: /papier\s*journal|newsprint/i },
  { rank: 40, match: /autocopiant/i },
  { rank: 50, match: /\bpcm\b|couch[eé]\s*mat/i },
  { rank: 60, match: /\bpcb\b|couch[eé]\s*brillant/i },
  { rank: 70, match: /^glossy\b/i },
  { rank: 80, match: /photo\s*glossy/i },
  { rank: 90, match: /papier\s*photo|photo\s*(brillant|mat|satin|pearl)|fine\s*art|photo\s*tissu/i },
  { rank: 100, match: /bristol/i },
  { rank: 110, match: /textur/i },
  { rank: 120, match: /satin/i },
  { rank: 130, match: /toile\s*fin/i },
  { rank: 140, match: /sp[eé]cial\s*invitation|invitation/i },
  { rank: 150, match: /dos\s*bleu/i },
  { rank: 160, match: /kraft/i },
  { rank: 170, match: /recycl/i },
  { rank: 180, match: /\bpvc\b/i },
  { rank: 190, match: /autocollant|adh[eé]sif/i },
];

function isCustomMaterialLabel(label: string): boolean {
  return /personnalis|autres|sur devis/i.test(label);
}

export function paperMaterialSortRank(label: string): number | null {
  const s = String(label ?? '').trim();
  if (!s || isCustomMaterialLabel(s)) return null;
  for (const row of PAPER_MATERIAL_RANK) {
    if (row.match.test(s)) return row.rank;
  }
  return 500; // inconnu : après les connus, avant personnalisé
}

/** Trie matières papier : ordre métier officiel, personnalisée en dernier. */
export function sortMatiereChipOptions(options: string[]): string[] {
  if (options.length <= 1) return options;
  const custom = options.filter(isCustomMaterialLabel);
  const regular = options.filter((o) => !isCustomMaterialLabel(o));
  const sorted = [...regular].sort((a, b) => {
    const ra = paperMaterialSortRank(a) ?? 500;
    const rb = paperMaterialSortRank(b) ?? 500;
    if (ra !== rb) return ra - rb;
    return options.indexOf(a) - options.indexOf(b);
  });
  return [...sorted, ...custom];
}
