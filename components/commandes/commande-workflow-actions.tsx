'use client';

import Link from 'next/link';
import { FileCheck, Package, Banknote, Factory, FileImage, ListTodo, Receipt } from 'lucide-react';

type Props = {
  commandeId: string;
  blockers: string[];
  nextJalonLabel?: string | null;
};

export function CommandeWorkflowActions({ commandeId, blockers, nextJalonLabel }: Props) {
  const text = blockers.join(' ').toLowerCase();
  const actions: { href: string; label: string; icon: typeof FileCheck; show: boolean }[] = [
    { href: `/bat?commande=${commandeId}`, label: 'Valider BAT', icon: FileCheck, show: text.includes('bat') },
    { href: `/stock?commande=${commandeId}`, label: 'Réserver stock', icon: Package, show: text.includes('stock') },
    { href: `/paiements?commande=${commandeId}`, label: 'Encaisser acompte', icon: Banknote, show: text.includes('acompte') },
    {
      href: `/production/dossiers?commande=${commandeId}`,
      label: 'Contrôle qualité GPAO',
      icon: Factory,
      show: text.includes('qualité') || text.includes('gpao') || text.includes('incident'),
    },
    { href: `/commandes/${commandeId}?tab=bat`, label: 'Déposer fichiers', icon: FileImage, show: text.includes('fichier') },
    { href: `/equipe/taches?commande=${commandeId}`, label: 'Tâches métier', icon: ListTodo, show: text.includes('tâche') },
    {
      href: `/factures?commande=${commandeId}`,
      label: 'Facturer',
      icon: Receipt,
      show: nextJalonLabel?.toLowerCase().includes('livrer') ?? false,
    },
  ];

  const visible = actions.filter((a) => a.show);
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((a) => {
        const Icon = a.icon;
        return (
          <Link key={a.href} href={a.href} className="ops-prog__btn">
            <Icon size={12} /> {a.label}
          </Link>
        );
      })}
    </>
  );
}
