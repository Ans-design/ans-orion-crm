/** Métadonnées publiques des comptes démo — sans mot de passe (safe client bundle). */
export type DemoAccountPublic = {
  email: string;
  name: string;
  role: 'admin' | 'demo';
  badge: string;
  hint: string;
};

export const DEMO_ACCOUNTS_PUBLIC: DemoAccountPublic[] = [
  {
    email: 'john@doe.com',
    name: 'Admin ANS',
    role: 'admin',
    badge: 'Accès complet',
    hint: 'CRUD, export, paramètres, suppression',
  },
  {
    email: 'demo@ansdesign.mg',
    name: 'Compte Démo',
    role: 'demo',
    badge: 'CRM interactif',
    hint: 'Création clients/devis — sans export ni suppression',
  },
];
