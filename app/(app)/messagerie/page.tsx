'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Megaphone, MessageSquare } from 'lucide-react';
import { AnsTalkApp } from '@/components/ans-talk/ans-talk-app';
import { TeamAnnouncementsPanel } from '@/components/ans-talk/team-announcements-panel';
import { AppRouteLoading } from '@/components/ui/app-ui';

function MessagerieContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') === 'annonces' ? 'annonces' : 'talk';
  const conv = searchParams.get('conv');

  if (tab === 'annonces') {
    return (
      <div className="ans-talk-page ans-talk-page--flush talk-announce-page flex flex-col min-h-0 flex-1 w-full max-w-none">
        <header className="talk-announce-topbar shrink-0">
          <div className="talk-topbar-brand min-w-0">
            <div className="talk-topbar-icon talk-topbar-icon--announce" aria-hidden>
              <Megaphone size={17} strokeWidth={1.85} />
            </div>
            <div className="min-w-0">
              <div className="talk-announce-eyebrow">Communication interne</div>
              <h1 className="talk-announce-page-title">Annonces équipe</h1>
              <p className="talk-announce-page-sub truncate">Fil d&apos;actualité ANS ORION · toutes annexes</p>
            </div>
          </div>
          <Link href="/messagerie" className="talk-topbar-link shrink-0">
            <MessageSquare size={14} strokeWidth={1.8} />
            Retour ANS Talk
          </Link>
        </header>
        <TeamAnnouncementsPanel />
      </div>
    );
  }

  return (
    <div className="ans-talk-page ans-talk-page--flush flex flex-col min-h-0 flex-1 w-full max-w-none">
      <AnsTalkApp initialConvId={conv} />
    </div>
  );
}

export default function MessageriePage() {
  return (
    <Suspense fallback={<AppRouteLoading message="Chargement ANS Talk…" hint="Messagerie pleine page" />}>
      <MessagerieContent />
    </Suspense>
  );
}
