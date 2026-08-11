import type { Metadata } from 'next';
import './globals.css';
/* Après globals/Tailwind : KPI pastel compact (cascade prioritaire) */
import '@/styles/orion-kpi-refonte.css';
/* Couches finales (après Tailwind — pas via @import post-rules, incompatible Turbopack) */
import '@/styles/field-writable-neutral.css';
import '@/styles/radius-unify.css';
/* POS Soft UI / catalogue : chargés uniquement via app/(app)/pos (évite ~130 Ko CSS sur chaque page) */
import Providers from './providers';

const localHost = process.env.HOST || '127.0.0.1';
const localPort = process.env.PORT || '3020';

function resolveMetadataBase(): URL {
  const fallback = `http://${localHost}:${localPort}`;
  const raw = process.env.NEXTAUTH_URL?.trim() || process.env.VERCEL_URL?.trim() || fallback;
  const href = raw.startsWith('http') ? raw : `https://${raw}`;
  try {
    return new URL(href);
  } catch {
    return new URL(fallback);
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: 'ANS ORION — Print Studio ERP',
  description: 'Système ERP/CRM complet pour imprimerie grand format',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: 'any' },
      { url: '/branding/ans-logo-mark-rounded.png', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.png',
    apple: [{ url: '/apple-touch-icon.png', type: 'image/png' }],
  },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, title: 'ORION', statusBarStyle: 'black-translucent' },
  openGraph: { images: ['/og-image.png'] },
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
