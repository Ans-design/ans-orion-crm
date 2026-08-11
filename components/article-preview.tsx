'use client';

import { CATEGORIES } from '@/lib/data/catalogue';
import type { CatalogueItem } from '@/lib/data/catalogue';
import {
  fitSilhouetteSize,
  resolveSilhouette,
  type SilhouetteSpec,
} from '@/lib/data/article-silhouette';
import {
  type MockupKind,
  type ArticleMockupDef,
} from '@/lib/data/article-mockup-registry';
import {
  getResolvedMockupDef,
  getMockupFamilyLabel,
  resolveMockupKind,
} from '@/lib/data/mockup-resolver';
import { resolveProductPreview, type PreviewAdminOverride } from '@/lib/data/product-preview-resolver';
import { resolvePreviewProductColor } from '@/lib/data/preview-product-color';
import type { ProductPreviewAdminEntry } from '@/lib/admin-config/types';
import { ENABLE_PRODUCT_PREVIEWS } from '@/lib/pos/features';
import {
  EcommerceStudioFrame,
  PreviewVariantBadges,
  StudioImagePreview,
} from '@/components/pos/studio-product-preview';
import {
  TShirtMockup,
  PoloMockup,
  SweatMockup,
  CapMockup,
  ToteBagMockup,
  MugMockup3D,
  RollUpMockup,
  XBannerMockup,
  PaperMockup,
  FlyerMockup,
  PosterMockup,
  InvitationMockup,
  DepliantMockup,
  LetterheadMockup,
  PhotoPrintMockup,
  MenuMockup,
  BobMockup,
  MaillotMockup,
  CombinaisonMockup,
  SurvetementMockup,
  LambahoanyMockup,
  BoxMockup3D,
  BusinessCardMockup,
  NotebookMockup,
  PenMockup,
  CanvasMockup,
  ChevaletMockup,
  FlagMockup,
  StickerMockup,
  PouchMockup,
  PaperBagMockup,
  PaperCupMockup,
  EnvelopeMockup,
  BottleMockup,
  BadgeMockup,
  RigidPanelMockup,
  MeshBannerMockup,
  VinylSheetMockup,
  BookMockup3D,
  PlayingCardsMockup,
  DisplayStandMockup,
  TotemMockup,
  PhotocallMockup,
  CalendarMockup,
  PhotobookMockup,
  LanyardMockup,
  TicketMockup,
  BraceletMockup,
  KeychainMockup,
  PinMockup,
  UsbMockup,
  UmbrellaMockup,
  LighterMockup,
  MousepadMockup,
  PhoneCaseMockup,
  StampMockup,
  ConceptionMockup,
  GiletMockup,
  GenericProductMockup,
} from '@/components/article-mockups';

const PREVIEW_MAX_W = 220;
const PREVIEW_MAX_H = 260;
const PREVIEW_SCALE = 1.15;

/** Objets 3D — remplissent le cadre studio au lieu du ratio mm papier */
const STUDIO_FILL_KINDS = new Set<MockupKind>([
  'mug', 'cup', 'bottle', 'pen', 'cap', 'bob', 'keychain', 'pin', 'usb', 'lighter',
  'badge', 'bracelet', 'stamp', 'phone_case', 'mousepad', 'tshirt', 'polo', 'sweat',
  'gilet', 'tote', 'bag', 'maillot', 'combinaison', 'survetement', 'lambahoany',
]);

function studioFillSize(
  kind: MockupKind,
  compact: boolean,
): { width: number; height: number } | null {
  if (!STUDIO_FILL_KINDS.has(kind)) return null;
  const studioW = compact ? 168 : 340;
  const studioH = compact ? 120 : 280;
  const fill = Math.min(studioW * 0.52, studioH * 0.62);
  const tallObjects = new Set<MockupKind>(['mug', 'cup', 'bottle', 'pen', 'rollup', 'xbanner', 'totem']);
  if (tallObjects.has(kind)) {
    return { width: Math.round(fill * 0.85), height: Math.round(fill * 1.05) };
  }
  return { width: Math.round(fill), height: Math.round(fill * 0.92) };
}

/** Aperçu produit style catalogue e-commerce B2B */
export function ArticlePreview({
  item,
  className = '',
  showDimensions = true,
  config,
  compact = false,
  previewOverride,
  fillStudio = false,
  topOverlay,
  customMockup,
  hideFrameLabel = false,
}: {
  item: Pick<CatalogueItem, 'id' | 'name' | 'category' | 'icon'>;
  className?: string;
  showDimensions?: boolean;
  config?: Record<string, unknown>;
  compact?: boolean;
  previewOverride?: PreviewAdminOverride | ProductPreviewAdminEntry | null;
  /** Agrandit la silhouette pour remplir le fond blanc studio (mug, textile…) */
  fillStudio?: boolean;
  /** Badges / contrôles en overlay dans le cadre blanc */
  topOverlay?: React.ReactNode;
  /** Remplace le mockup SVG (ex. pseudo-3D) tout en restant dans le studio */
  customMockup?: React.ReactNode;
  hideFrameLabel?: boolean;
}) {
  if (!ENABLE_PRODUCT_PREVIEWS) return null;

  const cat = CATEGORIES.find((c) => c.id === item.category);
  const spec = resolveSilhouette(item, config);
  const preview = resolveProductPreview(item.id, item.category, config, previewOverride ?? undefined);
  const mockDef = getResolvedMockupDef(item.id, item.category, config);
  const kind = preview.previewType ?? mockDef?.kind ?? resolveMockupKind(item.id, item.category, config);
  const color = resolvePreviewProductColor(
    item.category,
    kind,
    cat?.color ?? '#f5f5f0',
    config,
  );
  const maxW = compact ? 140 : PREVIEW_MAX_W;
  const maxH = compact ? 120 : PREVIEW_MAX_H;
  const scale = compact ? 1 : PREVIEW_SCALE;
  const base = fitSilhouetteSize(spec, maxW, maxH);
  const fill = fillStudio ? studioFillSize(kind, compact) : null;
  const width = fill ? fill.width : Math.round(base.width * scale);
  const height = fill ? fill.height : Math.round(base.height * scale);
  const landscape = preview.landscape || spec.orientation === 'landscape';
  const isFallback = kind === 'flat';
  const familyLabel = preview.previewLabel || getMockupFamilyLabel(kind);

  const mockupNode = customMockup ?? (
    <MockupRenderer
      kind={kind}
      spec={spec}
      mockDef={mockDef}
      color={color}
      w={width}
      h={height}
      icon={item.icon}
      articleId={item.id}
      config={config}
      landscape={landscape}
      roundedCorners={preview.roundedCorners}
    />
  );

  const frameHeight = compact ? maxH + 8 : fillStudio ? 300 : maxH + 20;

  return (
    <div className={`relative ${className}`}>
      <EcommerceStudioFrame
        width={compact ? 168 : 340}
        height={frameHeight}
        compact={compact}
        categoryLabel={hideFrameLabel || compact ? undefined : familyLabel}
        topOverlay={topOverlay}
      >
        <div className="relative w-full flex items-center justify-center min-h-[200px]">
          <StudioImagePreview
            preview={preview}
            width={width}
            height={height}
            fallback={mockupNode}
          />
          <PreviewVariantBadges
            rectoVerso={preview.showRectoVersoBadge}
            roundedCorners={preview.roundedCorners}
          />
        </div>
      </EcommerceStudioFrame>
      {showDimensions && (
        <div className={`relative text-center border-t border-border/40 ${compact ? 'px-2 pb-2 pt-1' : 'px-4 pb-3 pt-1'}`}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {isFallback ? 'Aperçu catalogue' : 'Aperçu produit'}
          </p>
          {!isFallback && (
            <p className="text-[10px] text-[#FF174D]/80 mt-0.5">{familyLabel}</p>
          )}
          <p className={`font-mono text-[#FF174D] mt-0.5 ${compact ? 'text-[10px]' : 'text-xs'}`}>{spec.label}</p>
          {mockDef?.material && (
            <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{mockDef.material}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MockupRenderer({
  kind,
  spec,
  mockDef,
  color,
  w,
  h,
  icon,
  articleId,
  config,
  landscape,
  roundedCorners,
}: {
  kind: MockupKind;
  spec: SilhouetteSpec;
  mockDef: ArticleMockupDef | null;
  color: string;
  w: number;
  h: number;
  icon?: string;
  articleId: string;
  config?: Record<string, unknown>;
  landscape?: boolean;
  roundedCorners?: boolean;
}) {
  const material = mockDef?.material;
  const props = { w, h, color, material, uid: articleId };
  const pliage = String(config?.pliage ?? config?.type ?? '').toLowerCase();
  const foldType: 'bi' | 'tri' = pliage.includes('2') || pliage.includes('bi') ? 'bi' : 'tri';

  switch (kind) {
    case 'flyer': return <FlyerMockup {...props} landscape={landscape} />;
    case 'poster': return <PosterMockup {...props} landscape={landscape} />;
    case 'invitation': return <InvitationMockup {...props} />;
    case 'depliant': return <DepliantMockup {...props} foldType={foldType} />;
    case 'letterhead': return <LetterheadMockup {...props} />;
    case 'photo_print': return <PhotoPrintMockup {...props} />;
    case 'menu': return <MenuMockup {...props} />;
    case 'bob': return <BobMockup {...props} />;
    case 'maillot': return <MaillotMockup {...props} />;
    case 'combinaison': return <CombinaisonMockup {...props} />;
    case 'survetement': return <SurvetementMockup {...props} />;
    case 'lambahoany': return <LambahoanyMockup {...props} />;
    case 'tshirt': return <TShirtMockup {...props} />;
    case 'polo': return <PoloMockup {...props} />;
    case 'sweat': return <SweatMockup {...props} />;
    case 'gilet': return <GiletMockup {...props} />;
    case 'cap': return <CapMockup {...props} />;
    case 'tote': return <ToteBagMockup {...props} />;
    case 'bag': return <ToteBagMockup {...props} />;
    case 'mug': return <MugMockup3D {...props} />;
    case 'cup': return <PaperCupMockup {...props} />;
    case 'pen': return <PenMockup {...props} />;
    case 'rollup': return <RollUpMockup {...props} />;
    case 'xbanner': return <XBannerMockup w={w} h={h} color={color} uid={articleId} />;
    case 'card': return <BusinessCardMockup w={w} h={h * 0.58} color={color} uid={articleId} roundedCorners={roundedCorners} />;
    case 'box': return <BoxMockup3D {...props} depthRatio={(spec.depthMm ?? 80) / (spec.widthMm || 200)} />;
    case 'pouch': return <PouchMockup {...props} />;
    case 'paperbag': return <PaperBagMockup {...props} />;
    case 'notebook': return <NotebookMockup {...props} />;
    case 'book': return <BookMockup3D {...props} />;
    case 'photobook': return <PhotobookMockup {...props} />;
    case 'calendar': return <CalendarMockup {...props} />;
    case 'chevalet': return <ChevaletMockup {...props} />;
    case 'flag': return <FlagMockup {...props} />;
    case 'canvas': return <CanvasMockup {...props} />;
    case 'rigid_panel': return <RigidPanelMockup {...props} />;
    case 'panel': return <RigidPanelMockup {...props} />;
    case 'mesh_banner': return <MeshBannerMockup {...props} />;
    case 'vinyl_sheet': return <VinylSheetMockup {...props} />;
    case 'flat': return <PaperMockup {...props} landscape={landscape} />;
    case 'sticker': return <StickerMockup {...props} />;
    case 'envelope': return <EnvelopeMockup {...props} />;
    case 'bottle': return <BottleMockup {...props} />;
    case 'badge': return <BadgeMockup {...props} />;
    case 'bracelet': return <BraceletMockup {...props} />;
    case 'ticket': return <TicketMockup {...props} />;
    case 'lanyard': return <LanyardMockup {...props} />;
    case 'playing_cards': return <PlayingCardsMockup {...props} />;
    case 'display': return <DisplayStandMockup {...props} />;
    case 'totem': return <TotemMockup {...props} />;
    case 'photocall': return <PhotocallMockup {...props} />;
    case 'keychain': return <KeychainMockup {...props} />;
    case 'pin': return <PinMockup {...props} />;
    case 'usb': return <UsbMockup {...props} />;
    case 'umbrella': return <UmbrellaMockup {...props} />;
    case 'lighter': return <LighterMockup {...props} />;
    case 'mousepad': return <MousepadMockup {...props} />;
    case 'phone_case': return <PhoneCaseMockup {...props} />;
    case 'stamp': return <StampMockup {...props} />;
    case 'conception': return <ConceptionMockup {...props} />;
    default:
      return <GenericProductMockup {...props} icon={icon} />;
  }
}

export { resolveSilhouette, type SilhouetteSpec };
