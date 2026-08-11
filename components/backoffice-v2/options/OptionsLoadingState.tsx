type Props = {
  rows?: number;
  variant?: 'list' | 'table';
};

export function OptionsLoadingState({ rows = 6, variant = 'list' }: Props) {
  if (variant === 'table') {
    return (
      <div className="ab2-options-skeleton-table">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="ab2-options-skeleton-row ab2-options-skeleton-row--table" />
        ))}
      </div>
    );
  }
  return (
    <div className="ab2-options-skeleton-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ab2-options-skeleton-row" />
      ))}
    </div>
  );
}
