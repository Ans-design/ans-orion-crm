import { prisma } from '@/lib/prisma';
import { logAudit } from '@/lib/audit';
import { buildDefaultAdminSnapshot, CONFIG_KEYS, DEFAULT_ADMIN_META } from '@/lib/admin-config/defaults';
import { computeCatalogDrift, mergeCatalogIntoDraft, reconcileCatalogDraft } from '@/lib/admin-config/catalog-drift';
import type {
  AdminConfigMeta,
  AdminConfigSnapshot,
  ChipAdminEntry,
  ConfigChangeSummary,
  EffectiveArticleState,
  EffectivePosConfig,
  ProductOptionGroup,
  VisibilityMode,
} from '@/lib/admin-config/types';
import { groupChipsByField } from '@/lib/admin-config/group-chips';

export { groupChipsByField };

const ADMIN_ROLES = new Set(['admin', 'manager']);

function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

function resolveVisibility(
  visibility: VisibilityMode,
  role: string,
): EffectiveArticleState {
  switch (visibility) {
    case 'HIDDEN':
      return { visibility, selectable: false, greyed: false };
    case 'DISABLED_VISIBLE':
      return { visibility, selectable: false, greyed: true };
    case 'ADMIN_ONLY':
      if (isAdminRole(role)) {
        return { visibility, selectable: true, greyed: false };
      }
      return { visibility, selectable: false, greyed: false };
    case 'SCHEDULED':
      return { visibility: 'ACTIVE', selectable: true, greyed: false };
    default:
      return { visibility: 'ACTIVE', selectable: true, greyed: false };
  }
}

async function readConfigKey(key: string): Promise<AdminConfigSnapshot | null> {
  const row = await prisma.systemConfig.findUnique({ where: { configKey: key } });
  if (!row?.data) return null;
  return row.data as unknown as AdminConfigSnapshot;
}

async function writeConfigKey(key: string, data: AdminConfigSnapshot, userId?: string) {
  await prisma.systemConfig.upsert({
    where: { configKey: key },
    create: { configKey: key, data: data as object, updatedBy: userId ?? null },
    update: { data: data as object, updatedBy: userId ?? null },
  });
}

export async function getAdminMeta(): Promise<AdminConfigMeta> {
  const row = await prisma.systemConfig.findUnique({ where: { configKey: CONFIG_KEYS.meta } });
  if (!row?.data) return { ...DEFAULT_ADMIN_META };
  return { ...DEFAULT_ADMIN_META, ...(row.data as object) } as AdminConfigMeta;
}

async function saveMeta(meta: AdminConfigMeta, userId?: string) {
  await prisma.systemConfig.upsert({
    where: { configKey: CONFIG_KEYS.meta },
    create: { configKey: CONFIG_KEYS.meta, data: meta as object, updatedBy: userId ?? null },
    update: { data: meta as object, updatedBy: userId ?? null },
  });
}

/** Initialise draft + publié si absent */
export async function ensureAdminConfigSeeded(): Promise<void> {
  const published = await readConfigKey(CONFIG_KEYS.published);
  if (published) return;
  const snapshot = buildDefaultAdminSnapshot('published');
  await writeConfigKey(CONFIG_KEYS.published, snapshot);
  await writeConfigKey(CONFIG_KEYS.draft, { ...snapshot, status: 'draft' });
  await saveMeta({ ...DEFAULT_ADMIN_META, lastPublishedAt: new Date().toISOString() });
}

export async function getDraftConfig(): Promise<AdminConfigSnapshot> {
  await ensureAdminConfigSeeded();
  const draft = await readConfigKey(CONFIG_KEYS.draft);
  if (draft) return draft;
  const pub = await getPublishedConfig();
  return { ...pub, status: 'draft' };
}

export async function getPublishedConfig(): Promise<AdminConfigSnapshot> {
  await ensureAdminConfigSeeded();
  const published = await readConfigKey(CONFIG_KEYS.published);
  return published ?? buildDefaultAdminSnapshot('published');
}

export async function saveDraftConfig(
  snapshot: AdminConfigSnapshot,
  userId?: string,
  userName?: string,
): Promise<AdminConfigSnapshot> {
  const meta = await getAdminMeta();
  const next: AdminConfigSnapshot = {
    ...snapshot,
    status: 'draft',
    version: meta.draftVersion,
    updatedAt: new Date().toISOString(),
  };
  await writeConfigKey(CONFIG_KEYS.draft, next, userId);
  await logAudit({
    userId,
    userName,
    action: 'UPDATE',
    entity: 'AdminConfig',
    entityLabel: 'Configuration brouillon',
    details: { version: next.version, articles: Object.keys(next.articles).length },
  });
  return next;
}

export function computeChangeSummary(
  draft: AdminConfigSnapshot,
  published: AdminConfigSnapshot,
): ConfigChangeSummary {
  const details: string[] = [];
  let articlesChanged = 0;
  let articlesDisabled = 0;
  let chipsChanged = 0;
  let priceChanges = 0;
  let variablesChanged = 0;
  let featuresChanged = 0;

  for (const [id, art] of Object.entries(draft.articles)) {
    const prev = published.articles[id];
    if (!prev || prev.visibility !== art.visibility) {
      articlesChanged++;
      if (art.visibility !== 'ACTIVE') {
        articlesDisabled++;
        details.push(`Article ${art.name} → ${art.visibility}`);
      }
    }
  }

  for (const [id, chip] of Object.entries(draft.chips)) {
    const prev = published.chips[id];
    if (!prev) continue;
    if (
      prev.visibility !== chip.visibility
      || prev.label !== chip.label
      || prev.priceImpact !== chip.priceImpact
    ) {
      chipsChanged++;
      if (prev.priceImpact !== chip.priceImpact) {
        priceChanges++;
        details.push(`Prix chip ${chip.label} (${chip.productId})`);
      }
    }
  }

  for (const [key, v] of Object.entries(draft.variables)) {
    const prev = published.variables[key];
    if (!prev || prev.value !== v.value) {
      variablesChanged++;
      details.push(`Variable ${v.label}: ${prev?.value ?? '—'} → ${v.value}`);
    }
  }

  for (const [key, f] of Object.entries(draft.featureFlags)) {
    const prev = published.featureFlags[key];
    if (!prev || prev.enabled !== f.enabled) {
      featuresChanged++;
      details.push(`Fonction ${f.label}: ${f.enabled ? 'activée' : 'désactivée'}`);
    }
  }

  return {
    articlesChanged,
    chipsChanged,
    variablesChanged,
    featuresChanged,
    articlesDisabled,
    chipsModified: chipsChanged,
    priceChanges,
    details: details.slice(0, 30),
  };
}

export async function publishDraftConfig(
  userId?: string,
  userName?: string,
): Promise<{ published: AdminConfigSnapshot; summary: ConfigChangeSummary; version: number }> {
  const draft = await getDraftConfig();
  const current = await getPublishedConfig();
  const meta = await getAdminMeta();
  const summary = computeChangeSummary(draft, current);
  const nextVersion = meta.publishedVersion + 1;

  const published: AdminConfigSnapshot = {
    ...draft,
    status: 'published',
    version: nextVersion,
    updatedAt: new Date().toISOString(),
  };

  await writeConfigKey(CONFIG_KEYS.published, published, userId);
  await writeConfigKey(CONFIG_KEYS.draft, { ...published, status: 'draft' }, userId);

  await prisma.configVersion.create({
    data: {
      version: nextVersion,
      status: 'published',
      label: `Configuration v${nextVersion}`,
      snapshot: published as object,
      changeSummary: summary as object,
      publishedBy: userId ?? null,
    },
  });

  const archived = await prisma.configVersion.findMany({
    where: { status: 'published', version: { lt: nextVersion } },
    orderBy: { version: 'desc' },
    skip: 10,
  });
  if (archived.length) {
    await prisma.configVersion.updateMany({
      where: { id: { in: archived.map((v) => v.id) } },
      data: { status: 'archived' },
    });
  }

  const newMeta: AdminConfigMeta = {
    draftVersion: nextVersion,
    publishedVersion: nextVersion,
    lastPublishedAt: new Date().toISOString(),
    lastPublishedBy: userName ?? userId ?? null,
  };
  await saveMeta(newMeta, userId);

  await logAudit({
    userId,
    userName,
    action: 'PUBLISH',
    entity: 'AdminConfig',
    entityLabel: `Configuration v${nextVersion} publiée`,
    details: summary,
  });

  return { published, summary, version: nextVersion };
}

export async function rollbackToVersion(
  targetVersion: number,
  userId?: string,
  userName?: string,
): Promise<AdminConfigSnapshot> {
  const row = await prisma.configVersion.findUnique({ where: { version: targetVersion } });
  if (!row) throw new Error('Version introuvable');

  const snapshot = row.snapshot as unknown as AdminConfigSnapshot;
  const restored: AdminConfigSnapshot = {
    ...snapshot,
    status: 'published',
    updatedAt: new Date().toISOString(),
  };

  await writeConfigKey(CONFIG_KEYS.published, restored, userId);
  await writeConfigKey(CONFIG_KEYS.draft, { ...restored, status: 'draft' }, userId);

  const meta = await getAdminMeta();
  await saveMeta({
    ...meta,
    publishedVersion: targetVersion,
    draftVersion: targetVersion,
    lastPublishedAt: new Date().toISOString(),
    lastPublishedBy: userName ?? userId ?? null,
  }, userId);

  await logAudit({
    userId,
    userName,
    action: 'ROLLBACK',
    entity: 'AdminConfig',
    entityLabel: `Rollback vers v${targetVersion}`,
  });

  return restored;
}

export async function listConfigVersions(limit = 20) {
  return prisma.configVersion.findMany({
    orderBy: { version: 'desc' },
    take: limit,
    select: {
      id: true,
      version: true,
      status: true,
      label: true,
      changeSummary: true,
      publishedBy: true,
      publishedAt: true,
    },
  });
}

/** Service runtime — POS consomme la config publiée filtrée par rôle */
export function buildEffectivePosConfig(
  snapshot: AdminConfigSnapshot,
  meta: AdminConfigMeta,
  role: string,
): EffectivePosConfig {
  const articles: Record<string, EffectiveArticleState> = {};

  for (const [id, art] of Object.entries(snapshot.articles)) {
    articles[id] = resolveVisibility(art.visibility, role);
  }

  const featureFlags: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(snapshot.featureFlags)) {
    featureFlags[key] = flag.enabled && (
      flag.rolesAllowed.length === 0 || flag.rolesAllowed.includes(role)
    );
  }

  const variables: Record<string, number | string> = {};
  for (const [key, v] of Object.entries(snapshot.variables)) {
    variables[key] = v.value;
  }

  return { meta, articles, featureFlags, productPreviews: snapshot.productPreviews ?? {}, variables, role };
}

export async function getEffectivePosConfig(role: string): Promise<EffectivePosConfig> {
  const [published, meta] = await Promise.all([getPublishedConfig(), getAdminMeta()]);
  return buildEffectivePosConfig(published, meta, role);
}

/** Preview brouillon — réservé admin/manager */
export async function getDraftEffectivePosConfig(role: string): Promise<EffectivePosConfig & { preview: true; source: 'draft' }> {
  const [draft, meta] = await Promise.all([getDraftConfig(), getAdminMeta()]);
  return { ...buildEffectivePosConfig(draft, meta, role), preview: true, source: 'draft' };
}

export function getEffectiveProductConfig(
  productId: string,
  role: string,
  published: AdminConfigSnapshot,
): {
  article: EffectiveArticleState;
  chips: AdminConfigSnapshot['chips'];
  variables: AdminConfigSnapshot['variables'];
  featureFlags: AdminConfigSnapshot['featureFlags'];
} {
  const artEntry = published.articles[productId];
  const article = resolveVisibility(artEntry?.visibility ?? 'ACTIVE', role);

  const chips: AdminConfigSnapshot['chips'] = {};
  for (const [id, chip] of Object.entries(published.chips)) {
    if (chip.archived) continue;
    if (chip.productId !== productId && chip.scope !== 'global') continue;
    const vis = resolveVisibility(chip.visibility, role);
    if (vis.visibility === 'HIDDEN') continue;
    if (chip.rolesVisible.length && !chip.rolesVisible.includes(role)) continue;
    chips[id] = chip;
  }

  return {
    article,
    chips,
    variables: published.variables,
    featureFlags: published.featureFlags,
  };
}

/** Réaligne le brouillon admin sur le catalogue code (chips/articles/libellés). */
export async function repairConfigCatalogDrift(userId?: string, userName?: string) {
  const draft = await getDraftConfig();
  const before = computeCatalogDrift(draft);
  const reconciled = reconcileCatalogDraft(draft);
  const saved = await saveDraftConfig(reconciled, userId, userName);
  const after = computeCatalogDrift(saved);
  return {
    driftBefore: before.totalDrift,
    driftAfter: after.totalDrift,
    addedChips: before.missingChipIds.length,
    addedArticles: before.missingArticleIds.length,
    labelFixes: before.labelMismatches.length,
    details: before.details,
  };
}

export { mergeCatalogIntoDraft, reconcileCatalogDraft, computeCatalogDrift };

export async function getConfigHealth() {
  const [draft, published, meta, versions] = await Promise.all([
    getDraftConfig(),
    getPublishedConfig(),
    getAdminMeta(),
    listConfigVersions(1),
  ]);
  const summary = computeChangeSummary(draft, published);
  const articlesActive = Object.values(published.articles).filter((a) => a.visibility === 'ACTIVE').length;
  const chipsActive = Object.values(published.chips).filter((c) => c.visibility === 'ACTIVE').length;
  const chipsDisabledVisible = Object.values(published.chips).filter((c) => c.visibility === 'DISABLED_VISIBLE').length;
  const hasUnpublishedChanges = summary.articlesChanged + summary.chipsChanged + summary.variablesChanged + summary.featuresChanged > 0;
  const catalogDrift = computeCatalogDrift(draft);

  return {
    meta,
    articlesActive,
    articlesTotal: Object.keys(published.articles).length,
    chipsActive,
    chipsTotal: Object.keys(published.chips).length,
    chipsDisabledVisible,
    blockingRules: 0,
    anomalies: summary.articlesDisabled + catalogDrift.totalDrift,
    catalogDrift,
    configStatus: hasUnpublishedChanges ? 'draft' : 'published',
    lastPublishedAt: meta.lastPublishedAt,
    pendingChanges: summary,
    latestVersion: versions[0]?.version ?? meta.publishedVersion,
  };
}
