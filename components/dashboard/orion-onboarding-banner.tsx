'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'orion-onboarding-v1';

export function OrionOnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="rounded-[7px] border border-yellow-500/40 bg-yellow-500/10 p-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3 min-w-0">
        <Compass size={20} className="text-yellow-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Première connexion ORION ?</p>
          <p className="text-xs text-muted-foreground mt-1">
            Explorez le cockpit, le POS configurateur et le hub commande 360°. Le centre d&apos;aide récapitule les parcours métier.
          </p>
          <Link href="/aide" className="text-xs text-primary hover:underline mt-2 inline-block font-medium">
            Ouvrir le centre d&apos;aide →
          </Link>
        </div>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={dismiss} className="shrink-0 h-8 w-8 p-0" aria-label="Fermer">
        <X size={16} />
      </Button>
    </div>
  );
}
