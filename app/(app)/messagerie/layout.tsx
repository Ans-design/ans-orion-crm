'use client';

import '@/components/ans-talk/ans-talk.css';
import { AnsTalkProvider } from '@/lib/hooks/use-ans-talk';

/** ANS Talk — provider chargé uniquement sur la messagerie (pas sur tout le shell). */
export default function MessagerieLayout({ children }: { children: React.ReactNode }) {
  return <AnsTalkProvider variant="fullscreen">{children}</AnsTalkProvider>;
}
