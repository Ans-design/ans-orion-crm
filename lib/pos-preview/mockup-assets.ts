/** Assets mockup — chemins publics (SVG studio + placeholders futurs GLB) */
export const MOCKUP_ASSET_BASE = '/assets/products/studio';
export const MOCKUP_3D_BASE = '/mockups/3d';
export const MOCKUP_TEXTURE_BASE = '/mockups/textures';
export const MOCKUP_SHADOW_BASE = '/mockups/shadows';

export function studioAssetPath(kind: string): string {
  return `${MOCKUP_ASSET_BASE}/${kind}.svg`;
}

export function glbAssetPath(name: string): string {
  return `${MOCKUP_3D_BASE}/${name}`;
}

/** Placeholders textures CSS (pas de licence externe) */
export const TEXTURE_CLASSES = {
  paper: 'bg-[linear-gradient(135deg,#faf9f6_0%,#f0eeea_50%,#faf9f6_100%)]',
  vinyl: 'bg-[linear-gradient(160deg,#f8f8f8_0%,#e8e8e8_40%,#ffffff_100%)]',
  fabric: 'bg-[repeating-linear-gradient(45deg,#f5f5f5_0px,#f5f5f5_2px,#ececec_2px,#ececec_4px)]',
  acrylic: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(200,230,255,0.35)_100%)]',
} as const;
