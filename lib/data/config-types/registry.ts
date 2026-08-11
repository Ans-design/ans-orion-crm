import type { ProductConfig } from './types';
import { migrateProductConfigPaper } from '@/lib/data/config-paper-migrate';
import { injectCustomFormatDimensionFields } from '@/lib/pos/inject-custom-format-fields';
import * as packaging from './products/packaging';
import * as textile from './products/textile';
import * as goodies from './products/goodies';
import * as plv from './products/plv';
import * as calendriers from './products/calendriers';
import * as flyers from './products/flyers';
import * as carterie from './products/carterie';
import * as livres from './products/livres';
import * as photo from './products/photo';
import * as finitions from './products/finitions';
import * as grandFormat from './products/grand-format';
import * as evenementiel from './products/evenementiel';
import * as documents from './products/documents';
import * as blocNotes from './products/bloc-notes';
import * as impressions from './products/impressions';

// ═══════════════════════════════════════════════════════════════
// EXPORT — getProductConfig()
// Maps article IDs or configType keys to their ProductConfig
// ═══════════════════════════════════════════════════════════════

const _configByArticle: Record<string, ProductConfig> = {
  // ── Packaging ──
  'pkg-hangtag': packaging.PKG_HANGTAG,
  'pkg-etiquette': packaging.PKG_ETIQUETTE,
  'pkg-boite': packaging.PKG_BOITE,
  'pkg-doypack': packaging.PKG_DOYPACK,
  'pkg-sac': packaging.PKG_SAC,
  'pkg-gobelet': packaging.PKG_GOBELET,

  // ── Textile ──
  'tx-tshirt': textile.TX_TSHIRT,
  'tx-polo': textile.TX_POLO,
  'tx-sweat': textile.TX_SWEAT,
  'tx-gilet': textile.TX_GILET,
  'tx-combinaison': textile.TX_COMBINAISON,
  'tx-survetement': textile.TX_SURVETEMENT,
  'tx-casquette': textile.TX_CASQUETTE,
  'tx-bob': textile.TX_BOB,
  'tx-maillot': textile.TX_MAILLOT,
  'tx-totebag': textile.TX_TOTEBAG,
  'tx-trousse': textile.TX_TROUSSE,
  'tx-lambahoany': textile.TX_LAMBAHOANY,

  // ── Goodies ──
  'gd-mug': goodies.GD_MUG,
  'gd-tasse': goodies.GD_TASSE,
  'gd-gourde': goodies.GD_GOURDE,
  'gd-tapis': goodies.GD_TAPIS_SOURIS,
  'gd-briquet': goodies.GD_BRIQUET,
  'gd-usb': goodies.GD_USB,
  'gd-parapluie': goodies.GD_PARAPLUIE,
  'gd-stylo': goodies.GD_STYLO,
  'gd-portecles': goodies.GD_PORTECLES,
  'gd-pins': goodies.GD_PINS,
  'gd-housse': goodies.GD_HOUSSE,

  // ── PLV (catalogue fusionné + IDs legacy) ──
  'plv-chevalet': plv.PLV_CHEVALET,
  'plv-chevalet-table': plv.PLV_CHEVALET,
  'plv-chevalet-plv': plv.PLV_CHEVALET,
  'plv-chevalet-carton': plv.PLV_CHEVALET,
  'plv-rollup': plv.PLV_ROLLUP,
  'plv-xbanner': plv.PLV_XBANNER,
  'plv-presentoir-sol': plv.PLV_PRESENTOIR_SOL,
  'plv-stop': plv.PLV_PRESENTOIR_SOL,
  'plv-totem-sol': plv.PLV_PRESENTOIR_SOL,
  'plv-porte-flyers': plv.PLV_PORTEFLYERS,
  'plv-porte-brochures': plv.PLV_PORTEFLYERS,
  'plv-porte-affiches': plv.PLV_PORTEAFFICHE,
  'plv-fronton': plv.PLV_PORTEAFFICHE,
  'plv-presentoir-magasin': plv.PLV_PRESENTOIR_MAGASIN,
  'plv-comptoir-escalier': plv.PLV_PRESENTOIR_MAGASIN,
  'plv-box-palette': plv.PLV_PRESENTOIR_MAGASIN,
  'plv-colonne': plv.PLV_PRESENTOIR_MAGASIN,
  'plv-sur-mesure': plv.PLV_PRESENTOIR_MAGASIN,
  'plv-oriflamme': plv.PLV_ORIFLAMME,

  // ── Calendriers ──
  'cal-plateau': calendriers.CAL_PLATEAUX,
  'cal-marquepage': calendriers.CAL_MARQUEPAGE,
  'cal-chevalet': calendriers.CAL_CHEVALET,
  'cal-chevalet-table': calendriers.CAL_CHEVALET_TABLE,
  'cal-mural': calendriers.CAL_MURAL,
  'cal-sousmain': calendriers.CAL_SOUSMAIN,

  // ── Flyers ──
  'fly-std': flyers.FLY_FLYER,
  'fly-a6': flyers.FLY_FLYER,
  'fly-dl': flyers.FLY_FLYER,
  'fly-a5': flyers.FLY_FLYER,
  'fly-b5': flyers.FLY_FLYER,
  'fly-a4': flyers.FLY_FLYER,
  'fly-a3': flyers.FLY_FLYER,
  'fly-90': flyers.FLY_FLYER,

  // ── Carterie ──
  'cv-std': carterie.CART_VISITE,
  'cv-fidelite': carterie.CART_FIDELITE,
  'cv-jeux': carterie.CART_JEUX,

  // ── Livres (catalogue fusionné + IDs legacy panier/URL) ──
  'bk-livres': livres.BK_LIVRES,
  'bk-booklet': livres.BK_LIVRES,
  'bk-livret': livres.BK_LIVRES,
  'bk-fascicule': livres.BK_LIVRES,
  'bk-magazine': livres.BK_LIVRES,
  'bk-menu': livres.BK_LIVRES,

  // ── Photo ──
  'ph-tirage': photo.PH_TIRAGE,
  'ph-cadre': photo.PH_CADRE,
  'ph-photobook': photo.PH_PHOTOBOOK,

  // ── Documents Admin ──
  'doc-entete': documents.DOC_ENTETE,
  'doc-facturier': documents.DOC_FACTURIER,
  'doc-tampon': documents.DOC_TAMPON,

  // ── Bloc-notes (catalogue fusionné + IDs legacy panier/URL) ──
  'bn-bloc-note': blocNotes.BLOC_NOTES,
  'bn-a4': blocNotes.BLOC_NOTES,
  'bn-b5': blocNotes.BLOC_NOTES,
  'bn-a5': blocNotes.BLOC_NOTES,
  'bn-a6': blocNotes.BLOC_NOTES,
  'bn-agenda': blocNotes.BLOC_NOTES,

  // ── Finitions ──
  'fin-pelliculage': finitions.FIN_PELLICULAGE,
  'fin-vernis': finitions.FIN_VERNIS,
  'fin-rainage': finitions.FIN_RAINAGE,
  'fin-plastification': finitions.FIN_PLASTIFICATION,
  'fin-collage': finitions.FIN_COLLAGE,
  'fin-reliure': finitions.FIN_RELIURE,
  'fin-decoupe': finitions.FIN_DECOUPE,
  'fin-perforation': finitions.FIN_PERFORATION,
  'fin-couture': finitions.FIN_COUTURE,
  'fin-dorure': finitions.FIN_DORURE,
  'fin-gaufrage': finitions.FIN_GAUFRAGE,
  'fin-coins': finitions.FIN_COINS,
  'fin-autocollant': finitions.FIN_AUTOCOLLANT,
  'fin-autres': finitions.FIN_AUTRES,

  // ── Grand Format ──
  'gf-vinyl-blanc': grandFormat.GF_VINYL,
  'gf-vinyl-transp': grandFormat.GF_VINYL_TRANSP,
  'gf-dosbleu': grandFormat.GF_DOSBLEU,
  'gf-bache': grandFormat.GF_BACHE_UNIFIED,
  'gf-bache440': grandFormat.GF_BACHE_UNIFIED,
  'gf-mesh': grandFormat.GF_BACHE_UNIFIED,
  'gf-bache320': grandFormat.GF_BACHE_UNIFIED,
  'gf-tissu': grandFormat.GF_TISSU_DRAPEAU,
  'gf-oneway': grandFormat.GF_ONEWAY,
  'gf-reflechissant': grandFormat.GF_REFLECHISSANT,
  'gf-frosted': grandFormat.GF_FROSTED,
  'gf-photo': grandFormat.GF_PAPIER_PHOTO,
  'gf-pvc': grandFormat.GF_PVC,
  'gf-pvc3': grandFormat.GF_PVC,
  'gf-pvc6': grandFormat.GF_PVC,
  'gf-plexi': grandFormat.GF_PLEXI,
  'gf-plexi3': grandFormat.GF_PLEXI,
  'gf-plexi5': grandFormat.GF_PLEXI,
  'gf-acrylic': grandFormat.GF_ACRYLIC,
  'gf-pp': grandFormat.GF_PP,
  'gf-toile': grandFormat.GF_TOILE,

  // ── Événementiel ──
  'evt-affiche': evenementiel.EVT_AFFICHE,
  'evt-cordon': evenementiel.EVT_CORDON,
  'evt-bracelet': evenementiel.EVT_BRACELET,
  'evt-carte-voeux': evenementiel.EVT_CARTE_VOEUX,
  'evt-photocall': evenementiel.EVT_PHOTOCALL,
  'evt-photobooth': evenementiel.EVT_PHOTOBOOTH,
  'evt-enveloppe': evenementiel.EVT_ENVELOPPE,
  'evt-pochette': evenementiel.EVT_POCHETTE,
  'evt-fanion': evenementiel.EVT_FANION,
  'evt-badge': evenementiel.EVT_BADGE,
  'evt-billet': evenementiel.EVT_BILLET,
  'evt-cheque': evenementiel.EVT_CHEQUE,
  'evt-comptoir': evenementiel.EVT_COMPTOIR,

  // ── Impressions ──
  'imp-impression': impressions.IMP_IMPRESSION,
  'imp-offset': impressions.IMP_IMPRESSION,
  'imp-pcb': impressions.IMP_IMPRESSION,
  'imp-autocollant': impressions.IMP_IMPRESSION,
  'imp-nb80': impressions.IMP_IMPRESSION,
  'imp-quadri': impressions.IMP_IMPRESSION,
  'imp-laser': impressions.IMP_IMPRESSION,
  'imp-sublimation': impressions.IMP_IMPRESSION,
  'imp-pvc': impressions.IMP_IMPRESSION,
  'imp-conception': impressions.IMP_CONCEPTION,
  'cg-hub': impressions.IMP_CONCEPTION,

  // ── Documents (compléments) ──
  'doc-carnet': documents.DOC_FACTURIER,
  'doc-recu': documents.DOC_FACTURIER,

  // ── Événementiel (compléments) ──
};

// Fallback by configType (used when article ID doesn't have a specific mapping)
const _configByType: Record<string, ProductConfig> = {
  'packaging': packaging.PKG_BOITE,
  'textile': textile.TX_TSHIRT,
  'goodies': goodies.GD_MUG,
  'goodie': goodies.GD_MUG,
  'plv': plv.PLV_CHEVALET,
  'calendrier': calendriers.CAL_PLATEAUX,
  'flyer': flyers.FLY_FLYER,
  'carte_visite': carterie.CART_VISITE,
  'carte_fidelite': carterie.CART_FIDELITE,
  'jeux_cartes': carterie.CART_JEUX,
  'livre': livres.BK_LIVRES,
  'photo': photo.PH_TIRAGE,
  'finition': finitions.FIN_PELLICULAGE,
  'grand_format': grandFormat.GF_VINYL,
  'evenementiel': evenementiel.EVT_AFFICHE,
  'bloc_note': blocNotes.BLOC_NOTES,
  'impression': impressions.IMP_IMPRESSION,
  'conception': impressions.IMP_CONCEPTION,
  'document': documents.DOC_ENTETE,
  'doc_admin': documents.DOC_FACTURIER,
};

export function getProductConfig(articleId: string, configType?: string): ProductConfig | null {
  const raw = _configByArticle[articleId] ?? (configType ? _configByType[configType] : null);
  if (!raw) return null;
  const migrated = migrateProductConfigPaper(raw);
  return injectCustomFormatDimensionFields(migrated);
}

// Re-export types for external use

