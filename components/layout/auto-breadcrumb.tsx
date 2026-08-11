'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { MODULE_REGISTRY } from '@/lib/modules';
import { cpsMacroFromSearch } from '@/lib/administration/admin-macro-modules';

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  commandes: 'Commandes',
  devis: 'Devis',
  clients: 'Clients',
  pos: 'POS',
  production: 'Production',
  livraisons: 'Livraisons',
  factures: 'Factures',
  paiements: 'Paiements',
  messagerie: 'ANS Talk',
  rapports: 'Rapports',
  stock: 'Stock',
  rh: 'Ressources humaines',
  finance: 'Finance',
  parametres: 'Mon compte',
  apparence: 'Apparence',
  notifications: 'Notifications',
  regles: 'Règles métier',
  matieres: 'Matières',
  configuration: 'Configuration',
  donnees: 'Données',
  securite: 'Sécurité',
  admin: 'Administration',
  aide: 'Centre d\'aide',
  qualite: 'Contrôle qualité',
  'catalogue-prix-stock': 'Catalogue, Prix & Stock',
  'prix-articles': 'Articles finis',
  'articles-vente-directe': 'Articles vente directe',
};

function labelForSegment(seg: string, path: string, search = ''): string {
  if (seg === 'catalogue-prix-stock') {
    return cpsMacroFromSearch(search) === 'formules' ? 'Formules & moteurs' : 'Matières';
  }
  const fromModule = Object.values(MODULE_REGISTRY).find((m) => m.href === path || m.href === `/${seg}`);
  if (fromModule) return fromModule.label;
  return SEGMENT_LABELS[seg] ?? seg.replace(/-/g, ' ');
}

/**
 * Fil Ariane optionnel — désactivé dans le shell (titre déjà dans AppPageHeader).
 * Pour réactiver localement : `<AutoBreadcrumb force />`.
 */
export function AutoBreadcrumb({ force = false }: { force?: boolean }) {
  const pathname = usePathname() ?? '/';
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : '';
  const parts = pathname.split('/').filter(Boolean);

  if (!force) return null;
  if (parts.length <= 1) return null;

  const crumbs: { href: string; label: string; isLast: boolean }[] = [];
  let acc = '';
  parts.forEach((seg, i) => {
    acc += `/${seg}`;
    const isCuid = seg.length > 20 && !seg.includes('-');
    crumbs.push({
      href: acc,
      label: isCuid ? 'Détail' : labelForSegment(seg, acc, search),
      isLast: i === parts.length - 1,
    });
  });

  return (
    <Breadcrumb className="mb-3 md:mb-4 orion-hide-on-phone">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">ORION</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {crumbs.map((c) => (
          <span key={c.href} className="contents">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {c.isLast ? (
                <BreadcrumbPage>{c.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={c.href}>{c.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </span>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
