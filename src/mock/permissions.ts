export type MockPermission = {
  id: string;
  resource: string;
  action: string;
  roles: string[];
};

export const mockPermissions: MockPermission[] = [
  { id: 'p-1', resource: 'catalogue', action: 'read', roles: ['admin', 'commercial', 'demo'] },
  { id: 'p-2', resource: 'catalogue', action: 'write', roles: ['admin'] },
  { id: 'p-3', resource: 'commandes', action: 'read', roles: ['admin', 'commercial', 'designer'] },
  { id: 'p-4', resource: 'commandes', action: 'write', roles: ['admin', 'commercial'] },
  { id: 'p-5', resource: 'finance', action: 'read', roles: ['admin'] },
  { id: 'p-6', resource: 'rh', action: 'read', roles: ['admin'] },
  { id: 'p-7', resource: 'production', action: 'write', roles: ['admin', 'designer'] },
];
