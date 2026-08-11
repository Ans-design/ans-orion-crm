/**
 * Registre mockup — 1 entrée par article catalogue (131).
 * Style : mockup 3D transparent, centré, sans gabarit technique.
 * @see https://www.pacdora.com/mockups
 */

export type MockupMaterial =
  | 'white' | 'kraft' | 'glossy' | 'matte' | 'fabric' | 'metal'
  | 'glass' | 'transparent' | 'cardboard' | 'vinyl';

export type MockupKind =
  | 'flat' | 'flyer' | 'poster' | 'invitation' | 'depliant' | 'letterhead' | 'photo_print' | 'menu'
  | 'rollup' | 'xbanner' | 'box' | 'book' | 'notebook' | 'chevalet'
  | 'flag' | 'mug' | 'bag' | 'sticker' | 'panel' | 'card' | 'tshirt' | 'polo'
  | 'sweat' | 'cap' | 'tote' | 'pen' | 'canvas' | 'pouch' | 'envelope' | 'cup'
  | 'paperbag' | 'bottle' | 'badge' | 'bracelet' | 'ticket' | 'vinyl_sheet'
  | 'mesh_banner' | 'rigid_panel' | 'playing_cards' | 'phone_case' | 'keychain'
  | 'pin' | 'umbrella' | 'usb' | 'lighter' | 'mousepad' | 'stamp' | 'lanyard'
  | 'photocall' | 'totem' | 'display' | 'gilet' | 'calendar' | 'photobook'
  | 'conception' | 'bob' | 'combinaison' | 'lambahoany' | 'survetement' | 'maillot';

export type ArticleMockupDef = {
  kind: MockupKind;
  material?: MockupMaterial;
};

/** 131 articles — mapping explicite */
export const ARTICLE_MOCKUP_REGISTRY: Record<string, ArticleMockupDef> = {
  // ── Packaging (6) ──
  'pkg-hangtag': { kind: 'sticker', material: 'white' },
  'pkg-etiquette': { kind: 'sticker', material: 'vinyl' },
  'pkg-boite': { kind: 'box', material: 'white' },
  'pkg-doypack': { kind: 'pouch', material: 'kraft' },
  'pkg-sac': { kind: 'paperbag', material: 'kraft' },
  'pkg-gobelet': { kind: 'cup', material: 'white' },

  // ── Calendrier (5) ──
  'cal-plateau': { kind: 'calendar', material: 'glossy' },
  'cal-marquepage': { kind: 'flyer', material: 'glossy' },
  'cal-sousmain': { kind: 'calendar', material: 'matte' },
  'cal-chevalet': { kind: 'chevalet', material: 'white' },
  'cal-chevalet-table': { kind: 'chevalet', material: 'white' },
  'cal-mural': { kind: 'calendar', material: 'matte' },

  // ── Bloc-notes (5) ──
  'bn-bloc-note': { kind: 'notebook', material: 'white' },
  'bn-a4': { kind: 'notebook', material: 'white' },
  'bn-b5': { kind: 'notebook', material: 'white' },
  'bn-a5': { kind: 'notebook', material: 'white' },
  'bn-a6': { kind: 'notebook', material: 'white' },
  'bn-agenda': { kind: 'notebook', material: 'white' },

  // ── PLV (8 canoniques + legacy) ──
  'plv-chevalet': { kind: 'chevalet', material: 'white' },
  'plv-chevalet-table': { kind: 'chevalet', material: 'white' },
  'plv-rollup': { kind: 'rollup', material: 'matte' },
  'plv-xbanner': { kind: 'xbanner', material: 'matte' },
  'plv-presentoir-sol': { kind: 'rigid_panel', material: 'white' },
  'plv-stop': { kind: 'rigid_panel', material: 'white' },
  'plv-totem-sol': { kind: 'totem', material: 'white' },
  'plv-porte-flyers': { kind: 'display', material: 'white' },
  'plv-porte-brochures': { kind: 'display', material: 'cardboard' },
  'plv-porte-affiches': { kind: 'display', material: 'transparent' },
  'plv-fronton': { kind: 'display', material: 'white' },
  'plv-presentoir-magasin': { kind: 'display', material: 'white' },
  'plv-comptoir-escalier': { kind: 'display', material: 'white' },
  'plv-box-palette': { kind: 'box', material: 'cardboard' },
  'plv-colonne': { kind: 'totem', material: 'white' },
  'plv-sur-mesure': { kind: 'display', material: 'white' },
  'plv-chevalet-plv': { kind: 'chevalet', material: 'transparent' },
  'plv-chevalet-carton': { kind: 'chevalet', material: 'cardboard' },
  'plv-oriflamme': { kind: 'flag', material: 'fabric' },

  // ── Livres (5) ──
  'bk-livres': { kind: 'book', material: 'glossy' },
  'bk-booklet': { kind: 'book', material: 'glossy' },
  'bk-magazine': { kind: 'book', material: 'glossy' },
  'bk-livret': { kind: 'book', material: 'matte' },
  'bk-fascicule': { kind: 'book', material: 'matte' },
  'bk-menu': { kind: 'menu', material: 'glossy' },

  // ── Carterie (3) ──
  'cv-std': { kind: 'card', material: 'glossy' },
  'cv-fidelite': { kind: 'card', material: 'matte' },
  'cv-jeux': { kind: 'playing_cards', material: 'glossy' },

  // ── Flyers (7) ──
  'fly-std': { kind: 'flyer', material: 'matte' },

  // ── Finitions (13) ──
  'fin-pelliculage': { kind: 'flyer', material: 'glossy' },
  'fin-vernis': { kind: 'flyer', material: 'glossy' },
  'fin-rainage': { kind: 'flyer', material: 'matte' },
  'fin-plastification': { kind: 'flyer', material: 'glossy' },
  'fin-reliure': { kind: 'book', material: 'matte' },
  'fin-decoupe': { kind: 'sticker', material: 'vinyl' },
  'fin-perforation': { kind: 'flyer', material: 'matte' },
  'fin-couture': { kind: 'flag', material: 'fabric' },
  'fin-dorure': { kind: 'card', material: 'metal' },
  'fin-gaufrage': { kind: 'card', material: 'glossy' },
  'fin-coins': { kind: 'flyer', material: 'matte' },
  'fin-collage': { kind: 'flyer', material: 'matte' },
  'fin-autocollant': { kind: 'sticker', material: 'vinyl' },
  'fin-autres': { kind: 'sticker', material: 'white' },

  // ── Grand format (18) ──
  'gf-vinyl-blanc': { kind: 'vinyl_sheet', material: 'white' },
  'gf-vinyl-transp': { kind: 'vinyl_sheet', material: 'transparent' },
  'gf-dosbleu': { kind: 'poster', material: 'matte' },
  'gf-bache': { kind: 'mesh_banner', material: 'matte' },
  'gf-bache440': { kind: 'mesh_banner', material: 'matte' },
  'gf-mesh': { kind: 'mesh_banner', material: 'matte' },
  'gf-bache320': { kind: 'mesh_banner', material: 'matte' },
  'gf-tissu': { kind: 'flag', material: 'fabric' },
  'gf-oneway': { kind: 'vinyl_sheet', material: 'transparent' },
  'gf-reflechissant': { kind: 'vinyl_sheet', material: 'metal' },
  'gf-frosted': { kind: 'vinyl_sheet', material: 'glass' },
  'gf-photo': { kind: 'photo_print', material: 'glossy' },
  'gf-pvc': { kind: 'rigid_panel', material: 'white' },
  'gf-pvc3': { kind: 'rigid_panel', material: 'white' },
  'gf-pvc6': { kind: 'rigid_panel', material: 'white' },
  'gf-plexi': { kind: 'rigid_panel', material: 'transparent' },
  'gf-plexi3': { kind: 'rigid_panel', material: 'transparent' },
  'gf-plexi5': { kind: 'rigid_panel', material: 'transparent' },
  'gf-acrylic': { kind: 'rigid_panel', material: 'transparent' },
  'gf-pp': { kind: 'poster', material: 'matte' },
  'gf-toile': { kind: 'canvas', material: 'fabric' },

  // ── Textile (12) ──
  'tx-tshirt': { kind: 'tshirt', material: 'fabric' },
  'tx-polo': { kind: 'polo', material: 'fabric' },
  'tx-sweat': { kind: 'sweat', material: 'fabric' },
  'tx-gilet': { kind: 'gilet', material: 'fabric' },
  'tx-casquette': { kind: 'cap', material: 'fabric' },
  'tx-bob': { kind: 'bob', material: 'fabric' },
  'tx-maillot': { kind: 'maillot', material: 'fabric' },
  'tx-totebag': { kind: 'tote', material: 'fabric' },
  'tx-trousse': { kind: 'bag', material: 'fabric' },
  'tx-combinaison': { kind: 'combinaison', material: 'fabric' },
  'tx-survetement': { kind: 'survetement', material: 'fabric' },
  'tx-lambahoany': { kind: 'lambahoany', material: 'fabric' },

  // ── Goodies (11) ──
  'gd-mug': { kind: 'mug', material: 'white' },
  'gd-gourde': { kind: 'bottle', material: 'metal' },
  'gd-tasse': { kind: 'mug', material: 'white' },
  'gd-tapis': { kind: 'mousepad', material: 'matte' },
  'gd-briquet': { kind: 'lighter', material: 'metal' },
  'gd-usb': { kind: 'usb', material: 'metal' },
  'gd-parapluie': { kind: 'umbrella', material: 'fabric' },
  'gd-stylo': { kind: 'pen', material: 'white' },
  'gd-portecles': { kind: 'keychain', material: 'metal' },
  'gd-housse': { kind: 'phone_case', material: 'matte' },
  'gd-pins': { kind: 'pin', material: 'metal' },

  // ── Événementiel (13) ──
  'evt-enveloppe': { kind: 'envelope', material: 'white' },
  'evt-badge': { kind: 'badge', material: 'glossy' },
  'evt-bracelet': { kind: 'bracelet', material: 'fabric' },
  'evt-cheque': { kind: 'ticket', material: 'glossy' },
  'evt-photocall': { kind: 'photocall', material: 'matte' },
  'evt-fanion': { kind: 'flag', material: 'fabric' },
  'evt-billet': { kind: 'ticket', material: 'matte' },
  'evt-pochette': { kind: 'envelope', material: 'glossy' },
  'evt-affiche': { kind: 'poster', material: 'glossy' },
  'evt-cordon': { kind: 'lanyard', material: 'fabric' },
  'evt-carte-voeux': { kind: 'invitation', material: 'glossy' },
  'evt-photobooth': { kind: 'photocall', material: 'matte' },
  'evt-comptoir': { kind: 'display', material: 'white' },

  // ── Photo (3) ──
  'ph-tirage': { kind: 'photo_print', material: 'glossy' },
  'ph-cadre': { kind: 'canvas', material: 'white' },
  'ph-photobook': { kind: 'photobook', material: 'glossy' },

  // ── Documents (5) ──
  'doc-carnet': { kind: 'notebook', material: 'white' },
  'doc-entete': { kind: 'letterhead', material: 'white' },
  'doc-recu': { kind: 'notebook', material: 'white' },
  'doc-facturier': { kind: 'notebook', material: 'white' },
  'doc-tampon': { kind: 'stamp', material: 'matte' },

  // ── Impression ──
  'imp-impression': { kind: 'letterhead', material: 'matte' },
  'imp-offset': { kind: 'letterhead', material: 'matte' },
  'imp-pcb': { kind: 'flyer', material: 'glossy' },
  'imp-autocollant': { kind: 'sticker', material: 'vinyl' },
  'imp-pvc': { kind: 'card', material: 'transparent' },
  'imp-sublimation': { kind: 'photo_print', material: 'glossy' },

  // ── Conception (2) ──
  'cg-hub': { kind: 'conception', material: 'matte' },
  'imp-conception': { kind: 'conception', material: 'matte' },
};

export function getArticleMockupDef(articleId: string): ArticleMockupDef | null {
  return ARTICLE_MOCKUP_REGISTRY[articleId] ?? null;
}

export const MOCKUP_REGISTRY_COUNT = Object.keys(ARTICLE_MOCKUP_REGISTRY).length;
