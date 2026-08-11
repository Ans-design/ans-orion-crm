import { parsePaperGrammageG } from '@/lib/pos/thick-paper-grammage-policy';

function isCustomGrammageLabel(label: string): boolean {
  return /personnalis|autres|sur devis/i.test(label);
}

/** Trie les grammages par valeur numérique croissante — options personnalisées en dernier. */
export function sortGrammageChipOptions(options: string[]): string[] {
  if (options.length <= 1) return options;

  const custom = options.filter(isCustomGrammageLabel);
  const regular = options.filter((o) => !isCustomGrammageLabel(o));

  const sorted = [...regular].sort((a, b) => {
    const ga = parsePaperGrammageG(a);
    const gb = parsePaperGrammageG(b);
    if (ga != null && gb != null && ga !== gb) return ga - gb;
    if (ga != null && gb == null) return -1;
    if (ga == null && gb != null) return 1;
    return options.indexOf(a) - options.indexOf(b);
  });

  return [...sorted, ...custom];
}
