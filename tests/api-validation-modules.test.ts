import { describe, expect, it } from 'vitest';
import { globalSearchQuerySchema } from '@/lib/server/modules/search/search.validation';
import { markNotificationsSchema } from '@/lib/server/modules/notifications/notifications.validation';

describe('search validation', () => {
  it('accepte query >= 2 caractères', () => {
    expect(globalSearchQuerySchema.safeParse({ q: 'ab' }).success).toBe(true);
  });

  it('rejette query trop courte', () => {
    expect(globalSearchQuerySchema.safeParse({ q: 'a' }).success).toBe(false);
  });
});

describe('notifications validation', () => {
  it('accepte markAllRead', () => {
    expect(markNotificationsSchema.safeParse({ markAllRead: true }).success).toBe(true);
  });

  it('accepte ids', () => {
    expect(markNotificationsSchema.safeParse({ ids: ['n1'] }).success).toBe(true);
  });

  it('rejette body vide', () => {
    expect(markNotificationsSchema.safeParse({}).success).toBe(false);
  });
});

describe('cart schemas', () => {
  it('accepte checkout devis minimal', async () => {
    const { checkoutCartSchema } = await import('@/lib/validators/cart');
    expect(checkoutCartSchema.safeParse({
      action: 'devis',
      items: [{ articleId: 'flyer-a4', quantity: 100, config: {} }],
      meta: { clientId: 'clxxxxxxxxxxxxxxxxxxxxxxxxx' },
    }).success).toBe(true);
  });

  it('rejette checkout sans action', async () => {
    const { checkoutCartSchema } = await import('@/lib/validators/cart');
    expect(checkoutCartSchema.safeParse({ items: [] }).success).toBe(false);
  });

  it('rejette ligne panier sans articleId', async () => {
    const { cartLineSchema } = await import('@/lib/validators/cart');
    expect(cartLineSchema.safeParse({ quantity: 1 }).success).toBe(false);
  });
});

describe('tarifs validation', () => {
  it('accepte upsert tarif minimal', async () => {
    const { upsertTarifSchema } = await import('@/lib/server/modules/tarifs/tarifs.validation');
    expect(upsertTarifSchema.safeParse({
      articleId: 'flyer-a4',
      articleLabel: 'Flyer A4',
    }).success).toBe(true);
  });

  it('rejette articleId vide', async () => {
    const { upsertTarifSchema } = await import('@/lib/server/modules/tarifs/tarifs.validation');
    expect(upsertTarifSchema.safeParse({
      articleId: '',
      articleLabel: 'Flyer',
    }).success).toBe(false);
  });
});

describe('production dossiers validation', () => {
  it('parseDossierListQuery lit commande alias', async () => {
    const { parseDossierListQuery } = await import('@/lib/server/modules/production/production-dossiers.validation');
    const q = parseDossierListQuery(new URLSearchParams('commande=cmd-1&stats=1'));
    expect(q.commandeId).toBe('cmd-1');
    expect(q.stats).toBe('1');
  });

  it('patchDossierEtape exige etapeId', async () => {
    const { patchDossierEtapeSchema } = await import('@/lib/server/modules/production/production-dossiers.validation');
    expect(patchDossierEtapeSchema.safeParse({ statut: 'done' }).success).toBe(false);
    expect(patchDossierEtapeSchema.safeParse({ etapeId: 'e1', statut: 'done' }).success).toBe(true);
  });
});

describe('equipe metier tasks validation', () => {
  it('parseMetierTaskListQuery lit stats et commande', async () => {
    const { parseMetierTaskListQuery } = await import('@/lib/server/modules/equipe/metier-tasks.validation');
    const q = parseMetierTaskListQuery(new URLSearchParams('stats=1&commande=cmd-1&mine=1'));
    expect(q.statsOnly).toBe(true);
    expect(q.commandeId).toBe('cmd-1');
    expect(q.mine).toBe(true);
  });

  it('createMetierTaskSchema exige title', async () => {
    const { createMetierTaskSchema } = await import('@/lib/server/modules/equipe/metier-tasks.validation');
    expect(createMetierTaskSchema.safeParse({ title: 'Tâche test' }).success).toBe(true);
    expect(createMetierTaskSchema.safeParse({ title: '' }).success).toBe(false);
  });
});

describe('wave 15 admin validation', () => {
  it('rollbackConfigVersionSchema exige version >= 1', async () => {
    const { rollbackConfigVersionSchema } = await import('@/lib/validators/admin-config');
    expect(rollbackConfigVersionSchema.safeParse({ version: 3 }).success).toBe(true);
    expect(rollbackConfigVersionSchema.safeParse({ version: 0 }).success).toBe(false);
  });

  it('updateUserRoleSchema valide role connu', async () => {
    const { updateUserRoleSchema } = await import('@/lib/server/modules/users/users.validation');
    expect(updateUserRoleSchema.safeParse({ userId: 'u1', role: 'admin' }).success).toBe(true);
    expect(updateUserRoleSchema.safeParse({ userId: 'u1', role: 'invalid' }).success).toBe(false);
  });

  it('updateUserSettingsSchema accepte appearance', async () => {
    const { updateUserSettingsSchema } = await import('@/lib/server/modules/settings/settings.validation');
    expect(updateUserSettingsSchema.safeParse({ category: 'appearance', data: { theme: 'dark' } }).success).toBe(true);
    expect(updateUserSettingsSchema.safeParse({ category: 'invalid' }).success).toBe(false);
  });

  it('updateFiscalConfigSchema borne les taux', async () => {
    const { updateFiscalConfigSchema } = await import('@/lib/validators/admin-config');
    expect(updateFiscalConfigSchema.safeParse({ tvaRate: 20 }).success).toBe(true);
    expect(updateFiscalConfigSchema.safeParse({ tvaRate: 150 }).success).toBe(false);
  });

  it('createArticleFromTemplateSchema exige articleId', async () => {
    const { createArticleFromTemplateSchema } = await import('@/lib/validators/admin-config');
    expect(createArticleFromTemplateSchema.safeParse({ articleId: 'art-new' }).success).toBe(true);
    expect(createArticleFromTemplateSchema.safeParse({ articleId: '' }).success).toBe(false);
  });
});

describe('wave 16 pricing & regles validation', () => {
  it('pricingSimulateSchema exige articleId', async () => {
    const { pricingSimulateSchema } = await import('@/lib/server/modules/pricing/pricing-api.validation');
    expect(pricingSimulateSchema.safeParse({ articleId: 'fly-std', config: {} }).success).toBe(true);
    expect(pricingSimulateSchema.safeParse({ articleId: '' }).success).toBe(false);
  });

  it('posPricePreviewSchema accepte alias article', async () => {
    const { posPricePreviewSchema } = await import('@/lib/server/modules/pricing/pricing-api.validation');
    const r = posPricePreviewSchema.safeParse({ article: 'fly-std', configuration: { qty: 1 } });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.articleId).toBe('fly-std');
  });

  it('createBusinessRuleSchema exige ruleKey', async () => {
    const { createBusinessRuleSchema } = await import('@/lib/server/modules/regles/regles.validation');
    expect(createBusinessRuleSchema.safeParse({
      ruleKey: 'k1',
      ruleName: 'Règle',
      ruleType: 'filter',
    }).success).toBe(true);
    expect(createBusinessRuleSchema.safeParse({ ruleKey: '', ruleName: 'R', ruleType: 'filter' }).success).toBe(false);
  });

  it('markRelanceSentSchema exige action sent', async () => {
    const { markRelanceSentSchema } = await import('@/lib/server/modules/cm/cm-relances.validation');
    expect(markRelanceSentSchema.safeParse({ action: 'sent' }).success).toBe(true);
    expect(markRelanceSentSchema.safeParse({ action: 'other' }).success).toBe(false);
  });
});

describe('wave 17 validation', () => {
  it('updateBusinessRuleSchema accepte patch partiel', async () => {
    const { updateBusinessRuleSchema } = await import('@/lib/server/modules/regles/regles.validation');
    expect(updateBusinessRuleSchema.safeParse({ active: false }).success).toBe(true);
    expect(updateBusinessRuleSchema.safeParse({ priority: -1 }).success).toBe(false);
  });

  it('reglesVersionsQuerySchema borne limit', async () => {
    const { reglesVersionsQuerySchema } = await import('@/lib/server/modules/regles/regles.validation');
    expect(reglesVersionsQuerySchema.safeParse({ limit: 200 }).success).toBe(true);
    expect(reglesVersionsQuerySchema.safeParse({ limit: 500 }).success).toBe(false);
  });

  it('posStockCheckSchema accepte alias quantity', async () => {
    const { posStockCheckSchema } = await import('@/lib/server/modules/pricing/pricing-api.validation');
    const r = posStockCheckSchema.safeParse({ articleId: 'fly-std', quantity: 10 });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.qty).toBe(10);
  });

  it('forgotPasswordSchema exige identifier ou email', async () => {
    const { forgotPasswordSchema } = await import('@/lib/validators/auth');
    expect(forgotPasswordSchema.safeParse({ email: 'demo@ansdesign.mg' }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({}).success).toBe(false);
  });
});

describe('wave 18 validation', () => {
  it('patchPermissionSchema exige role connu', async () => {
    const { patchPermissionSchema } = await import('@/lib/server/modules/permissions/permissions.validation');
    expect(patchPermissionSchema.safeParse({
      role: 'admin',
      moduleId: 'pos',
      flags: { canView: true },
    }).success).toBe(true);
    expect(patchPermissionSchema.safeParse({ role: 'unknown', moduleId: 'pos', flags: {} }).success).toBe(false);
  });

  it('createBackofficeArticleSchema exige articleId', async () => {
    const { createBackofficeArticleSchema } = await import('@/lib/server/modules/backoffice/backoffice-articles.validation');
    expect(createBackofficeArticleSchema.safeParse({ articleId: 'art-new' }).success).toBe(true);
    expect(createBackofficeArticleSchema.safeParse({ articleId: '' }).success).toBe(false);
  });

  it('patchPurchaseOrderSchema accepte receive', async () => {
    const { patchPurchaseOrderSchema } = await import('@/lib/server/modules/purchase-orders/purchase-orders.validation');
    expect(patchPurchaseOrderSchema.safeParse({ action: 'receive' }).success).toBe(true);
    expect(patchPurchaseOrderSchema.safeParse({ statut: 'Invalid' }).success).toBe(false);
  });
});

describe('wave 19 validation', () => {
  it('updateBrandingConfigSchema valide email', async () => {
    const { updateBrandingConfigSchema } = await import('@/lib/validators/admin-config');
    expect(updateBrandingConfigSchema.safeParse({ contactEmail: 'contact@ansdesign.mg' }).success).toBe(true);
    expect(updateBrandingConfigSchema.safeParse({ contactEmail: 'bad' }).success).toBe(false);
  });

  it('openCaisseSessionSchema accepte openingFloat', async () => {
    const { openCaisseSessionSchema } = await import('@/lib/validators/admin-config');
    expect(openCaisseSessionSchema.safeParse({ openingFloat: 50000 }).success).toBe(true);
    expect(openCaisseSessionSchema.safeParse({ openingFloat: -1 }).success).toBe(false);
  });

  it('loginFailSchema accepte email optionnel', async () => {
    const { loginFailSchema } = await import('@/lib/validators/auth');
    expect(loginFailSchema.safeParse({ email: 'demo@ansdesign.mg' }).success).toBe(true);
    expect(loginFailSchema.safeParse({}).success).toBe(true);
  });
});

describe('wave 19b fusion & dynamic-pricing validation', () => {
  it('fusionMaterialPatchSchema exige id et actif', async () => {
    const { fusionMaterialPatchSchema } = await import('@/lib/server/modules/fusion/fusion.validation');
    expect(fusionMaterialPatchSchema.safeParse({ id: 'm1', actif: true }).success).toBe(true);
    expect(fusionMaterialPatchSchema.safeParse({ id: 'm1' }).success).toBe(false);
  });

  it('dynamicPricingSyncActionSchema accepte sync', async () => {
    const { dynamicPricingSyncActionSchema } = await import('@/lib/server/modules/pricing/dynamic-pricing-api.validation');
    expect(dynamicPricingSyncActionSchema.safeParse({ action: 'sync' }).success).toBe(true);
    expect(dynamicPricingSyncActionSchema.safeParse({ action: 'other' }).success).toBe(false);
  });

  it('dynamicPricingPatchSchema valide section profile', async () => {
    const { dynamicPricingPatchSchema } = await import('@/lib/server/modules/pricing/dynamic-pricing-api.validation');
    expect(dynamicPricingPatchSchema.safeParse({ section: 'profile', prixBase: 1000 }).success).toBe(true);
    expect(dynamicPricingPatchSchema.safeParse({ section: 'unknown' }).success).toBe(false);
  });
});

describe('wave 20 validation', () => {
  it('adminConfigSnapshotSchema exige articles et chips', async () => {
    const { adminConfigSnapshotSchema } = await import('@/lib/validators/admin-config');
    expect(adminConfigSnapshotSchema.safeParse({
      articles: { a1: { id: 'a1', name: 'Art' } },
      chips: { c1: { id: 'c1' } },
    }).success).toBe(true);
    expect(adminConfigSnapshotSchema.safeParse({ articles: {} }).success).toBe(false);
  });

  it('adminConfigImportSchema accepte draft ou published', async () => {
    const { adminConfigImportSchema } = await import('@/lib/validators/admin-config');
    const snap = { articles: { a1: { id: 'a1' } }, chips: { c1: { id: 'c1' } } };
    expect(adminConfigImportSchema.safeParse({ draft: snap }).success).toBe(true);
    expect(adminConfigImportSchema.safeParse({}).success).toBe(false);
  });

  it('resetPasswordSchema exige token et password', async () => {
    const { resetPasswordSchema } = await import('@/lib/validators/auth');
    expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'Secret123!' }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ token: '' }).success).toBe(false);
  });

  it('posAuditSchema exige action', async () => {
    const { posAuditSchema } = await import('@/lib/server/modules/pos/pos-audit.validation');
    expect(posAuditSchema.safeParse({ action: 'cart_clear' }).success).toBe(true);
    expect(posAuditSchema.safeParse({}).success).toBe(false);
  });

  it('annexPostSchema accepte set_filter', async () => {
    const { annexPostSchema } = await import('@/lib/server/modules/annexes/annexes.validation');
    expect(annexPostSchema.safeParse({ action: 'set_filter', activeSite: 'TANA' }).success).toBe(true);
    expect(annexPostSchema.safeParse({ code: 'TN', name: 'Tana' }).success).toBe(true);
  });

  it('commandeBlocagePostSchema accepte resolve', async () => {
    const { commandeBlocagePostSchema } = await import('@/lib/server/modules/commandes/commandes-blocages.validation');
    expect(commandeBlocagePostSchema.safeParse({
      action: 'resolve',
      blocageId: 'b1',
    }).success).toBe(true);
  });

  it('parseStockPatchBody distingue mouvement et update', async () => {
    const { parseStockPatchBody } = await import('@/lib/server/modules/stock/stock.validation');
    const move = parseStockPatchBody({ type: 'entree', quantity: 5 });
    expect(move.ok).toBe(true);
    if (move.ok) expect(move.kind).toBe('adjust');
    const upd = parseStockPatchBody({ label: 'Papier A4' });
    expect(upd.ok).toBe(true);
    if (upd.ok) expect(upd.kind).toBe('update');
  });
});

describe('wave 21 validation & payment utils', () => {
  it('batClientActionSchema borne commentaire', async () => {
    const { batClientActionSchema } = await import('@/lib/validators/bat-client.validation');
    expect(batClientActionSchema.safeParse({ action: 'accept', commentaire: 'OK' }).success).toBe(true);
    expect(batClientActionSchema.safeParse({ action: 'invalid' }).success).toBe(false);
  });

  it('cmCampaignPatchStatutSchema rejette postId', async () => {
    const { cmCampaignPatchStatutSchema } = await import('@/lib/server/modules/cm/cm-campagnes.validation');
    expect(cmCampaignPatchStatutSchema.safeParse({ statut: 'active' }).success).toBe(true);
    expect(cmCampaignPatchStatutSchema.safeParse({ statut: 'active', postId: 'p1' }).success).toBe(false);
  });

  it('computePaidTotal soustrait remboursements', async () => {
    const { computePaidTotal } = await import('@/lib/finance/payment-totals');
    expect(computePaidTotal([
      { montant: 10000, type: 'Acompte' },
      { montant: 2000, type: 'Remboursement' },
    ])).toBe(8000);
  });
});

describe('maintenance / materiels / proofs / messaging validation', () => {
  it('createMaintenanceTicketSchema exige titre >= 3', async () => {
    const { createMaintenanceTicketSchema } = await import('@/lib/server/modules/maintenance/maintenance.validation');
    expect(createMaintenanceTicketSchema.safeParse({ titre: 'ab' }).success).toBe(false);
    expect(createMaintenanceTicketSchema.safeParse({ titre: 'Panne presse' }).success).toBe(true);
  });

  it('createMaterielSchema exige code et name', async () => {
    const { createMaterielSchema } = await import('@/lib/server/modules/materiels/materiels.validation');
    expect(createMaterielSchema.safeParse({ code: 'X', name: 'Y' }).success).toBe(false);
    expect(createMaterielSchema.safeParse({ code: 'PC-01', name: 'Poste RH', category: 'IT' }).success).toBe(true);
  });

  it('createProofVersionSchema exige versionLabel', async () => {
    const { createProofVersionSchema } = await import('@/lib/server/modules/proofs/proof-versions.validation');
    expect(createProofVersionSchema.safeParse({ versionLabel: '' }).success).toBe(false);
    expect(createProofVersionSchema.safeParse({ versionLabel: 'V2' }).success).toBe(true);
  });

  it('messagingUploadMetaSchema exige conversationId', async () => {
    const { messagingUploadMetaSchema, validateMessagingUploadFiles } = await import(
      '@/lib/server/modules/messaging/messaging-upload.validation'
    );
    expect(messagingUploadMetaSchema.safeParse({ conversationId: '' }).success).toBe(false);
    expect(messagingUploadMetaSchema.safeParse({ conversationId: 'conv-1' }).success).toBe(true);
    expect(validateMessagingUploadFiles([]).ok).toBe(false);
    expect(validateMessagingUploadFiles([{ buffer: Buffer.from('x'), originalFileName: 'a.pdf' }]).ok).toBe(true);
  });
});
