/** Couleurs distinctes par famille matière (hover / sélection groupe) */

export type MaterialGroupColor = {
  border: string;
  bg: string;
  bgHover: string;
};

const GROUP_COLORS: MaterialGroupColor[] = [
  { border: 'rgba(59, 130, 246, 0.55)', bg: 'rgba(59, 130, 246, 0.09)', bgHover: 'rgba(59, 130, 246, 0.14)' },
  { border: 'rgba(16, 185, 129, 0.55)', bg: 'rgba(16, 185, 129, 0.09)', bgHover: 'rgba(16, 185, 129, 0.14)' },
  { border: 'rgba(168, 85, 247, 0.55)', bg: 'rgba(168, 85, 247, 0.09)', bgHover: 'rgba(168, 85, 247, 0.14)' },
  { border: 'rgba(245, 158, 11, 0.55)', bg: 'rgba(245, 158, 11, 0.09)', bgHover: 'rgba(245, 158, 11, 0.14)' },
  { border: 'rgba(236, 72, 153, 0.55)', bg: 'rgba(236, 72, 153, 0.09)', bgHover: 'rgba(236, 72, 153, 0.14)' },
  { border: 'rgba(34, 211, 238, 0.55)', bg: 'rgba(34, 211, 238, 0.09)', bgHover: 'rgba(34, 211, 238, 0.14)' },
  { border: 'rgba(251, 146, 60, 0.55)', bg: 'rgba(251, 146, 60, 0.09)', bgHover: 'rgba(251, 146, 60, 0.14)' },
  { border: 'rgba(129, 140, 248, 0.55)', bg: 'rgba(129, 140, 248, 0.09)', bgHover: 'rgba(129, 140, 248, 0.14)' },
];

function hashGroupKey(groupKey: string): number {
  let h = 0;
  for (let i = 0; i < groupKey.length; i++) {
    h = (h * 31 + groupKey.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function materialGroupColor(groupKey: string): MaterialGroupColor {
  if (!groupKey) return GROUP_COLORS[0]!;
  return GROUP_COLORS[hashGroupKey(groupKey) % GROUP_COLORS.length]!;
}
