'use client';

import '@/components/ans-talk/ans-talk.css';
import { usePathname } from 'next/navigation';
import { AnsTalkProvider } from '@/lib/hooks/use-ans-talk';
import { FloatingMessengerBubble } from './floating-messenger-bubble';

/** Widget flottant + provider — hors page `/messagerie` (provider déjà présent). */
export function FloatingMessengerRoot() {
  const pathname = usePathname();
  if (pathname?.startsWith('/messagerie')) return null;

  return (
    <AnsTalkProvider>
      <FloatingMessengerBubble />
    </AnsTalkProvider>
  );
}
