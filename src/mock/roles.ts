export type MockRole = {
  id: string;
  label: string;
  description: string;
  modules: string[];
};

export const mockRoles: MockRole[] = [
  { id: 'admin', label: 'Administrateur', description: 'Accès complet backoffice et paramètres', modules: ['*'] },
  { id: 'commercial', label: 'Commercial', description: 'CRM, devis, POS, commandes', modules: ['crm', 'pos', 'dashboard'] },
  { id: 'designer', label: 'Graphiste', description: 'Studio, BAT, prépresse', modules: ['studio', 'production'] },
  { id: 'demo', label: 'Démo CRM', description: 'Parcours démo sans données sensibles', modules: ['dashboard', 'pos', 'crm'] },
  { id: 'lecture', label: 'Lecture seule', description: 'Consultation sans modification', modules: ['dashboard', 'rapports'] },
];
