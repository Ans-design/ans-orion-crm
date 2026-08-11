import { formatFileSize } from '@/lib/constants/file-assets';

export const ASYNC_PREVIEW_EXTENSIONS = new Set(['ai', 'psd', 'cdr', 'eps']);

const NATIVE_PREVIEW_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'pdf', 'tif', 'tiff',
]);

export function fileExtension(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

export function needsAsyncPreview(name: string): boolean {
  return ASYNC_PREVIEW_EXTENSIONS.has(fileExtension(name));
}

export function isNativePreviewable(name: string, mimeType?: string | null): boolean {
  const ext = fileExtension(name);
  if (NATIVE_PREVIEW_EXTENSIONS.has(ext)) return true;
  if (mimeType?.startsWith('image/')) return true;
  if (mimeType === 'application/pdf') return true;
  return false;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Placeholder SVG pour formats pro sans raster natif (AI, PSD, CDR, EPS). */
export function buildPlaceholderSvg(params: { name: string; ext: string; sizeBytes: number }): string {
  const label = params.ext.toUpperCase();
  const size = formatFileSize(params.sizeBytes);
  const shortName = params.name.length > 36 ? `${params.name.slice(0, 33)}…` : params.name;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" fill="#111827"/>
  <rect x="16" y="16" width="368" height="268" rx="7" fill="#1f2937" stroke="#FF174D" stroke-width="2"/>
  <text x="200" y="118" text-anchor="middle" fill="#FF174D" font-family="system-ui,sans-serif" font-size="44" font-weight="700">${label}</text>
  <text x="200" y="158" text-anchor="middle" fill="#f3f4f6" font-family="system-ui,sans-serif" font-size="13">${escapeXml(shortName)}</text>
  <text x="200" y="182" text-anchor="middle" fill="#9ca3af" font-family="system-ui,sans-serif" font-size="11">${size} · Aperçu serveur</text>
</svg>`;
}
