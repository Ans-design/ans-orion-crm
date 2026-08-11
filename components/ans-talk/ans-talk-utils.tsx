import { ANS } from '@/lib/ans-colors';

export function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatTalkDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    relative: d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
  };
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

const AVATAR_COLORS = [ANS.red, ANS.orange, '#38bdf8', '#22c55e', '#a855f7', ANS.yellow];

export function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}

export function roleLabel(role: string | null | undefined) {
  const map: Record<string, string> = {
    admin: 'Admin',
    manager: 'Direction',
    commercial: 'Commercial',
    designer: 'Graphiste',
    production: 'Impression',
    logistique: 'Livraison',
    user: 'Employé',
  };
  return role ? map[role] ?? role : '';
}

export function fileIcon(ext: string) {
  if (ext === 'pdf') return 'PDF';
  if (['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'svg'].includes(ext)) return 'IMG';
  if (['ai', 'psd', 'eps', 'indd', 'cdr', 'xd', 'fig'].includes(ext)) return 'ART';
  if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP';
  if (['mp4', 'mov', 'avi'].includes(ext)) return 'VID';
  return 'DOC';
}

const MENTION_RE = /(@[\w\u00C0-\u024F-]+)/gi;

export function renderMessageBody(body: string) {
  const parts = body.split(MENTION_RE);
  return parts.map((part, i) => {
    if (part.startsWith('@')) {
      return (
        <span key={i} className="text-[var(--orion-red-vivid)] font-semibold">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function orderStatusBadge(statut: string) {
  const s = statut.toLowerCase();
  if (s.includes('valid') || s.includes('prêt') || s.includes('pret') || s.includes('accord')) {
    return { label: 'Bon pour accord', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
  }
  if (s.includes('production') || s.includes('impression')) {
    return { label: 'En production', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
  }
  if (s.includes('bat') || s.includes('épreuve') || s.includes('epreuve')) {
    return { label: 'BAT en attente', className: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' };
  }
  if (s.includes('livraison') || s.includes('expédi')) {
    return { label: 'En livraison', className: 'bg-[color-mix(in_srgb,var(--primary)_15%,transparent)] text-[var(--primary)]' };
  }
  return { label: statut, className: 'bg-muted/50 text-muted-foreground' };
}

export const TALK_SHELL = {
  bg: 'hsl(var(--background))',
  panel: 'hsl(var(--card))',
  panel2: 'hsl(var(--muted))',
  border: 'hsl(var(--border))',
  red: 'var(--orion-red-vivid)',
};

/** Classe Tailwind — rayon standard projet (7px via --radius) */
export const TALK_R = 'rounded-lg';
