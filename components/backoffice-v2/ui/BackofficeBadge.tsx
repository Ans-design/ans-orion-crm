const BLOCK_TONES: Record<string, string> = {
  'Matière': 'block-matiere',
  'Matière / Support': 'block-matiere',
  Couleur: 'block-couleur',
  Impression: 'block-impression',
  Finition: 'block-finition',
  Notes: 'block-note',
  Note: 'block-note',
  Dimensions: 'block-dimensions',
  Orientation: 'block-orientation',
  Livraison: 'block-livraison',
  Particularités: 'block-part',
};

type Props = {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'indicative' | 'block';
  blockKey?: string;
};

export function BackofficeBadge({ label, tone = 'muted', blockKey }: Props) {
  const blockClass = blockKey ? BLOCK_TONES[blockKey] ?? 'block-default' : '';
  if (tone === 'block' || blockKey) {
    return <span className={`ab2-block-badge ${blockClass}`}>{label}</span>;
  }
  return <span className={`ab2-badge ab2-badge-${tone}`}>{label}</span>;
}
