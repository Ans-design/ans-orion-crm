import { describe, expect, it } from 'vitest';
import {
  buildCommandePublicUrl,
  buildCommandeQrImageUrl,
  buildCommandeQrSvgDataUri,
  renderCommandeQrBlockHtml,
} from '@/lib/documents/commande-qr';

describe('commande QR', () => {
  it('construit une URL absolue scannable', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://orion.example.com';
    expect(buildCommandePublicUrl('abc123')).toBe('https://orion.example.com/commandes/abc123');
  });

  it('génère une image QR SVG embarquée', async () => {
    const src = await buildCommandeQrSvgDataUri('https://orion.example.com/commandes/abc123');
    expect(src).toBeTruthy();
    expect(src!.startsWith('data:image/svg+xml')).toBe(true);
  });

  it('fallback URL image API', () => {
    const url = buildCommandeQrImageUrl('https://orion.example.com/commandes/x', 160);
    expect(url).toContain('api.qrserver.com');
    expect(url).toContain(encodeURIComponent('https://orion.example.com/commandes/x'));
  });

  it('rend un bloc HTML QR', () => {
    const html = renderCommandeQrBlockHtml({
      qrSrc: 'data:image/svg+xml;charset=utf-8,x',
      targetUrl: 'https://orion.example.com/commandes/x',
      label: 'CMD-1',
    });
    expect(html).toContain('doc-qr');
    expect(html).toContain('CMD-1');
    expect(html).toContain('Scanner pour ouvrir');
  });
});
