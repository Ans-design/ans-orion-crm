'use client';

type Props = {
  icon?: string;
  label?: string;
  className?: string;
};

/** Fallback si mockup / 3D indisponible */
export function ProductPreviewFallback({ icon = '📄', label = 'Aperçu', className = '' }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 rounded-[7px] border border-dashed border-border/60 bg-muted/20 ${className}`}
      style={{ minHeight: 120 }}
    >
      <span className="text-4xl opacity-80" aria-hidden>
        {icon}
      </span>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
