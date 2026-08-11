'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MessageCircle, Volume2, VolumeX } from 'lucide-react';
import { useAnsTalk } from '@/lib/hooks/use-ans-talk';
import { useBottomActionStackOptional } from '@/components/responsive/bottom-action-stack';

/**
 * Badge ANS Talk bas-droite → ouvre `/messagerie` plein écran.
 * Mini-panel flottant désactivé (cohérence parcours ; code panel conservé hors usage).
 */
export function FloatingMessengerBubble() {
  const router = useRouter();
  const pathname = usePathname();
  const isMessagerie = pathname?.startsWith('/messagerie');

  const { unreadTotal, reload } = useAnsTalk();
  const stack = useBottomActionStackOptional();
  const setLayerHeight = stack?.setLayerHeight;
  const offsetAbove = stack?.offsetAbove;

  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [prevUnread, setPrevUnread] = useState(0);
  const toastInit = useRef(true);

  useEffect(() => {
    if (toastInit.current) {
      toastInit.current = false;
      setPrevUnread(unreadTotal);
      return;
    }
    if (unreadTotal > prevUnread && !muted) {
      setToast('Nouveau message ANS Talk');
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
    setPrevUnread(unreadTotal);
  }, [unreadTotal, muted, prevUnread]);

  useEffect(() => {
    // Desktop : FAB à droite du ticker (même ligne) — pas de réserve verticale stack
    setLayerHeight?.('fabTalk', 0);
    return () => setLayerHeight?.('fabTalk', 0);
  }, [setLayerHeight, isMessagerie]);

  if (isMessagerie) return null;

  const stackBottom = offsetAbove ? offsetAbove('fabTalk') : 0;
  const toastBottom = `calc(env(safe-area-inset-bottom, 0px) + ${stackBottom + 64}px)`;

  return (
    <>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="talk-floating-toast fixed right-4 z-[60] max-w-xs rounded-lg px-3 py-2 text-xs font-medium hidden md:block"
          style={{ bottom: toastBottom }}
        >
          {toast}
          <button
            type="button"
            className="ml-2 underline font-semibold"
            onClick={() => router.push('/messagerie')}
          >
            Ouvrir
          </button>
        </div>
      )}

      {/* Position bas-droite = CSS (aligné ticker Live) — plus de surélévation POS */}
      <div className="fixed z-[100] pointer-events-none talk-floating-bubble-btn talk-floating-bubble-btn--docked hidden md:block">
        <div className="pointer-events-auto flex flex-row-reverse items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              void reload();
              router.push('/messagerie');
            }}
            className={`flex items-center justify-center hover:scale-105 transition-transform talk-btn-primary talk-floating-bubble relative ${unreadTotal > 0 ? 'has-unread' : ''}`}
            aria-label={`ANS Talk${unreadTotal ? `, ${unreadTotal} non lus` : ''} — ouvrir messagerie`}
          >
            <MessageCircle size={22} strokeWidth={1.75} />
            {unreadTotal > 0 && (
              <span className="talk-unread-badge absolute -top-1 -right-1 min-w-[1.375rem] h-[1.375rem] px-1 text-xs font-semibold flex items-center justify-center rounded-full border-2 border-[var(--orion-bg-2)]">
                {unreadTotal > 99 ? '99+' : unreadTotal}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="talk-icon-btn bg-card border border-border shadow-sm"
            aria-label={muted ? 'Activer notifications' : 'Couper notifications'}
          >
            {muted ? <VolumeX size={14} strokeWidth={1.75} /> : <Volume2 size={14} strokeWidth={1.75} />}
          </button>
        </div>
      </div>
    </>
  );
}
