/**
 * QR commande — URL dossier + image scannable (UI + PDF facture/proforma).
 */

import { localAppUrl } from '@/lib/local-dev';

export function buildCommandePublicUrl(commandeId: string): string {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL?.trim()
    || process.env.NEXTAUTH_URL?.trim()
    || localAppUrl()
  ).replace(/\/$/, '');
  return `${base}/commandes/${commandeId}`;
}

/** Image QR (API) — fallback si génération SVG locale indisponible. */
export function buildCommandeQrImageUrl(targetUrl: string, size = 160): string {
  const s = Math.max(80, Math.min(400, Math.round(size)));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${s}x${s}&margin=6&color=cc0033&data=${encodeURIComponent(targetUrl)}`;
}

/** SVG QR embarqué (scannable hors-ligne dans le PDF). */
export async function buildCommandeQrSvgDataUri(targetUrl: string): Promise<string | null> {
  try {
    const QRCode = await import('qrcode');
    const svg = await QRCode.toString(targetUrl, {
      type: 'svg',
      margin: 1,
      width: 160,
      color: { dark: '#cc0033', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    });
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}

export async function resolveCommandeQrSrc(targetUrl: string, size = 160): Promise<string> {
  const embedded = await buildCommandeQrSvgDataUri(targetUrl);
  return embedded || buildCommandeQrImageUrl(targetUrl, size);
}

export function renderCommandeQrBlockHtml(opts: {
  qrSrc: string;
  targetUrl: string;
  label?: string;
  caption?: string;
}): string {
  const label = opts.label?.trim() || 'Dossier commande';
  const caption = opts.caption?.trim() || 'Scanner pour ouvrir';
  return `<aside class="doc-qr" aria-label="QR code commande">
    <img class="doc-qr__img" src="${opts.qrSrc}" alt="QR ${escapeAttr(label)}" width="120" height="120" />
    <div class="doc-qr__meta">
      <strong>${escapeHtml(label)}</strong>
      <span>${escapeHtml(caption)}</span>
    </div>
  </aside>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
