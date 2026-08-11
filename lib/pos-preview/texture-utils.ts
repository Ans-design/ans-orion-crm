import type { CSSProperties } from 'react';

/** Utilitaires texture / design client */

export function hasUploadableDesign(url: string | null | undefined): boolean {
  return Boolean(url && url.trim().length > 0);
}

export function printZoneStyle(
  uploadedDesign: string | null | undefined,
): CSSProperties {  if (!uploadedDesign) {
    return {
      background: 'linear-gradient(135deg, rgba(0,217,255,0.08) 0%, rgba(255,255,255,0.4) 100%)',
      border: '1px dashed rgba(0,217,255,0.35)',
    };
  }
  return {
    backgroundImage: `url(${uploadedDesign})`,
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
  };
}
