import { describe, it, expect } from 'vitest';
import { hasPermission, isDemoBlockedRoute, isDemoRole, isReadOnlyRole } from '../lib/auth/permissions';
import { createPaiementSchema, createClientSchema } from '../lib/validators/crm';

describe('permissions CRM', () => {
  it('admin a tous les droits sensibles', () => {
    expect(hasPermission('admin', 'export:run')).toBe(true);
    expect(hasPermission('admin', 'import:run')).toBe(true);
    expect(hasPermission('admin', 'users:manage')).toBe(true);
    expect(hasPermission('admin', 'config:publish')).toBe(true);
    expect(hasPermission('admin', 'config:import')).toBe(true);
  });

  it('manager peut voir config mais pas publier', () => {
    expect(hasPermission('manager', 'config:view')).toBe(true);
    expect(hasPermission('manager', 'config:publish')).toBe(false);
    expect(hasPermission('manager', 'config:edit_chips')).toBe(false);
  });

  it('caisse peut créer paiements mais pas devis', () => {
    expect(hasPermission('caisse', 'paiements:write')).toBe(true);
    expect(hasPermission('caisse', 'devis:write')).toBe(false);
  });

  it('finance peut exporter rapports et gérer factures', () => {
    expect(hasPermission('finance', 'factures:write')).toBe(true);
    expect(hasPermission('finance', 'rapports:export')).toBe(true);
    expect(hasPermission('finance', 'config:publish')).toBe(false);
  });

  it('workspaces cockpit — commercial ou production peuvent lire KPIs', () => {
    expect(hasPermission('commercial', 'commandes:read')).toBe(true);
    expect(hasPermission('commercial', 'rapports:read')).toBe(false);
    expect(hasPermission('technicien', 'production:read')).toBe(true);
    expect(hasPermission('technicien', 'commandes:read')).toBe(false);
  });

  it('designer peut créer devis mais pas gérer utilisateurs', () => {
    expect(hasPermission('designer', 'devis:write')).toBe(true);
    expect(hasPermission('designer', 'users:manage')).toBe(false);
  });

  it('compte demo peut modifier le CRM léger mais routes sensibles bloquées', () => {
    expect(isReadOnlyRole('demo')).toBe(false);
    expect(isDemoRole('demo')).toBe(true);
    expect(hasPermission('demo', 'clients:write')).toBe(true);
    expect(hasPermission('demo', 'commandes:write')).toBe(false);
    expect(isDemoBlockedRoute('/api/export', 'GET')).toBe(true);
    expect(isDemoBlockedRoute('/api/caisse/session', 'GET')).toBe(true);
    expect(isDemoBlockedRoute('/api/clients', 'GET')).toBe(false);
    expect(isDemoBlockedRoute('/api/paiements', 'POST', 'demo')).toBe(true);
    expect(hasPermission('demo', 'export:run')).toBe(false);
    expect(isDemoBlockedRoute('/api/clients', 'DELETE', 'admin')).toBe(false);
    expect(isDemoBlockedRoute('/api/export', 'GET', 'admin')).toBe(false);
  });

  it('caisse peut clôturer caisse mais pas forcer prix', () => {
    expect(hasPermission('caisse', 'pos:close_register')).toBe(true);
    expect(hasPermission('caisse', 'pos:force_price')).toBe(false);
  });

  it('marges visibles direction/finance uniquement (pos:view_margin)', () => {
    expect(hasPermission('admin', 'pos:view_margin')).toBe(true);
    expect(hasPermission('manager', 'pos:view_margin')).toBe(true);
    expect(hasPermission('commercial', 'pos:view_margin')).toBe(false);
    expect(hasPermission('production', 'pos:view_margin')).toBe(false);
    expect(hasPermission('designer', 'pos:view_margin')).toBe(false);
    expect(hasPermission('caisse', 'pos:view_margin')).toBe(false);
  });
});

describe('validators CRM', () => {
  it('rejette client sans nom', () => {
    const r = createClientSchema.safeParse({ name: '' });
    expect(r.success).toBe(false);
  });

  it('rejette paiement sans facture ni commande', () => {
    const r = createPaiementSchema.safeParse({ montant: 1000 });
    expect(r.success).toBe(false);
  });

  it('accepte paiement valide', () => {
    const r = createPaiementSchema.safeParse({
      factureId: 'clxyz123456789012345678901',
      montant: 50000,
      mode: 'Mobile Money',
    });
    expect(r.success).toBe(true);
  });
});
