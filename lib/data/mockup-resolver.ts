import type { MockupKind, ArticleMockupDef } from '@/lib/data/article-mockup-registry';
import { ARTICLE_MOCKUP_REGISTRY, getArticleMockupDef as getBaseMockupDef } from '@/lib/data/article-mockup-registry';

export const MOCKUP_FAMILY_LABELS: Record<string, string> = {
  flyer: 'Flyer',
  poster: 'Affiche / Poster',
  invitation: 'Carte invitation',
  depliant: 'Dépliant plié',
  letterhead: 'Papier en-tête',
  photo_print: 'Tirage photo',
  menu: 'Menu restaurant',
  card: 'Carte de visite',
  book: 'Livret / Brochure',
  notebook: 'Bloc-notes',
  rollup: 'Roll-up',
  xbanner: 'X-Banner',
  box: 'Packaging 3D',
  pouch: 'Doypack',
  paperbag: 'Sac papier',
  sticker: 'Autocollant / Vinyle',
  vinyl_sheet: 'Vinyle adhésif',
  mesh_banner: 'Banderole',
  canvas: 'Toile châssis',
  rigid_panel: 'Panneau rigide',
  tshirt: 'T-shirt',
  polo: 'Polo',
  sweat: 'Sweat',
  gilet: 'Gilet sans manches',
  cap: 'Casquette',
  bob: 'Bob',
  maillot: 'Maillot sportif',
  combinaison: 'Combinaison',
  survetement: 'Survêtement',
  lambahoany: 'Lambahoany',
  tote: 'Tote bag',
  mug: 'Mug',
  cup: 'Gobelet',
  chevalet: 'Chevalet PLV',
  display: 'Présentoir',
  totem: 'Totem',
  flag: 'Oriflamme',
  calendar: 'Calendrier',
  stamp: 'Tampon',
  conception: 'Conception graphique',
  flat: 'Document papier',
};

/** Remplace kind "flat" générique par un mockup familial reconnaissable */
export function resolveMockupKind(
  articleId: string,
  category: string,
  config?: Record<string, unknown>,
): MockupKind {
  const base = getBaseMockupDef(articleId);
  const id = articleId.toLowerCase();
  const cfg = config ?? {};

  const pliage = String(cfg.pliage ?? cfg.type ?? '');
  if (pliage.toLowerCase().includes('3') || pliage.toLowerCase().includes('tri')) return 'depliant';
  if (pliage.toLowerCase().includes('2') || pliage.toLowerCase().includes('bi')) return 'depliant';

  if (base && base.kind !== 'flat') return base.kind;

  if (id.startsWith('fly-') || category === 'flyers') return 'flyer';
  if (id.includes('depliant') || id.includes('depliant')) return 'depliant';
  if (id.includes('affiche') || id === 'evt-affiche') return 'poster';
  if (id.includes('carte-voeux') || id.includes('invitation')) return 'invitation';
  if (id.includes('ph-tirage') || category === 'photo') return 'photo_print';
  if (id.includes('entete') || id === 'doc-entete') return 'letterhead';
  if (id.includes('menu') || id === 'bk-menu') return 'menu';
  if (id.startsWith('imp-')) {
    if (id.includes('autocollant')) return 'sticker';
    if (id.includes('pvc')) return 'card';
    if (id.includes('sublimation')) return 'photo_print';
    return 'letterhead';
  }
  if (id.startsWith('gf-')) {
    if (id.includes('vinyl') || id.includes('oneway') || id.includes('frosted') || id.includes('reflechissant')) return 'vinyl_sheet';
    if (id.includes('bache') || id.includes('mesh') || id.includes('tissu')) return 'mesh_banner';
    if (id.includes('photo')) return 'photo_print';
    if (id.includes('toile')) return 'canvas';
    if (id.includes('pvc') || id.includes('plexi') || id.includes('acrylic')) return 'rigid_panel';
    if (id.includes('flex')) return 'sticker';
    return 'poster';
  }
  if (id.startsWith('fin-')) return id.includes('autocollant') ? 'sticker' : 'flyer';
  if (category === 'livres') return id.includes('menu') ? 'menu' : 'book';
  if (category === 'carterie') return 'card';
  if (category === 'evenementiel') return id.includes('affiche') ? 'poster' : 'invitation';
  if (category === 'impression') return 'letterhead';
  if (category === 'document') return 'letterhead';

  return base?.kind ?? 'flat';
}

export function getResolvedMockupDef(
  articleId: string,
  category: string,
  config?: Record<string, unknown>,
): ArticleMockupDef | null {
  const base = getBaseMockupDef(articleId);
  const kind = resolveMockupKind(articleId, category, config);
  if (!base && kind === 'flat') return null;
  return { kind, material: base?.material };
}

export function getMockupFamilyLabel(kind: MockupKind): string {
  return MOCKUP_FAMILY_LABELS[kind] ?? kind;
}

/** Contrôle anti-redondance : familles catalogue → kinds distincts attendus */
export function auditMockupDistinctness(): { ok: boolean; issues: string[] } {
  const issues: string[] = [];
  const categoryKinds: Record<string, Set<string>> = {};

  for (const [id, def] of Object.entries(ARTICLE_MOCKUP_REGISTRY)) {
    const cat = id.split('-')[0];
    const kind = resolveMockupKind(id, cat);
    if (kind === 'flat') {
      issues.push(`${id} utilise encore mockup générique "flat"`);
    }
    if (!categoryKinds[cat]) categoryKinds[cat] = new Set();
    categoryKinds[cat].add(kind);
  }

  const crossFamily: Record<string, string[]> = {
    flyers: ['flyer'],
    grand_format: ['poster', 'vinyl_sheet', 'mesh_banner', 'canvas', 'rigid_panel', 'sticker'],
    carterie: ['card', 'playing_cards'],
    plv: ['rollup', 'xbanner', 'chevalet', 'display', 'totem', 'flag', 'rigid_panel'],
    textile: ['tshirt', 'polo', 'sweat', 'cap', 'tote', 'gilet', 'bob', 'maillot', 'combinaison', 'survetement', 'lambahoany'],
    packaging: ['box', 'pouch', 'paperbag', 'cup', 'sticker'],
  };

  for (const [family, expected] of Object.entries(crossFamily)) {
    const prefix = family === 'flyers' ? 'fly' : family === 'grand_format' ? 'gf' : family === 'carterie' ? 'cv' : family === 'plv' ? 'plv' : family === 'textile' ? 'tx' : 'pkg';
    const kinds = new Set<string>();
    for (const [id] of Object.entries(ARTICLE_MOCKUP_REGISTRY)) {
      if (id.startsWith(prefix) || (family === 'flyers' && id.startsWith('fly-'))) {
        kinds.add(resolveMockupKind(id, family));
      }
    }
    if (kinds.size === 1 && kinds.has('flat')) {
      issues.push(`Famille ${family} : tous les articles partagent le mockup générique`);
    }
    const hasExpected = [...kinds].some((k) => expected.includes(k));
    if (!hasExpected && kinds.size > 0) {
      issues.push(`Famille ${family} : aucun mockup reconnaissable (${[...kinds].join(', ')})`);
    }
  }

  return { ok: issues.length === 0, issues };
}
