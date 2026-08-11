type Props = {
  source: string;
};

export function OptionsSourceBadge({ source }: Props) {
  const s = source.toLowerCase();
  if (s.includes('2026') || s.includes('prix')) {
    return <span className="ab2-source-tag source-prix2026">PRIX 2026</span>;
  }
  if (s.includes('admin')) {
    return <span className="ab2-source-tag source-admin">admin</span>;
  }
  return <span className="ab2-source-tag source-catalogue">catalogue</span>;
}
