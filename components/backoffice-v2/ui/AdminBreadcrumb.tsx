import { ChevronRight } from 'lucide-react';

type Crumb = { label: string; href?: string };

type Props = {
  items: Crumb[];
};

export function AdminBreadcrumb({ items }: Props) {
  return (
    <nav className="ab2-breadcrumb" aria-label="Fil d'Ariane">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="ab2-breadcrumb-item">
          {i > 0 && <ChevronRight className="ab2-breadcrumb-sep" aria-hidden />}
          {item.href ? (
            <a href={item.href} className="ab2-breadcrumb-link">
              {item.label}
            </a>
          ) : (
            <span className="ab2-breadcrumb-current" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
