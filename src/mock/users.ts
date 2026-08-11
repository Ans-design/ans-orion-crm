export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  matricule?: string;
  active: boolean;
};

export const mockUsers: MockUser[] = [
  { id: 'u-1', name: 'Admin ANS', email: 'john@doe.com', role: 'admin', matricule: 'ADM01', active: true },
  { id: 'u-2', name: 'Rakoto Commercial', email: 'commercial@ansdesign.mg', role: 'commercial', matricule: 'COM01', active: true },
  { id: 'u-3', name: 'Sitraka Graphiste', email: 'designer@ansdesign.mg', role: 'designer', matricule: 'DES01', active: true },
  { id: 'u-4', name: 'Compte Démo', email: 'demo@ansdesign.mg', role: 'demo', active: true },
  { id: 'u-5', name: 'Lecture Seule', email: 'lecture@ansdesign.mg', role: 'lecture', active: false },
];
