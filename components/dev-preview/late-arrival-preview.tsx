'use client';

import { useState } from 'react';
import {
  Bus,
  User,
  HeartPulse,
  Wrench,
  CloudRain,
  MoreHorizontal,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LATE_CAUSES, type LateCause } from '@/lib/constants/rh';
import type { OrionRadioCardOption } from '@/components/orion/auth';
import { AuthDarkBackground } from '@/components/auth/auth-dark-background';
import { DelayDeclarationCard } from '@/components/auth/delay-declaration-card';

const MOCK = {
  employeeName: 'Jean Rakoto',
  matricule: 'AX0-001',
  poste: 'Directeur',
  departement: 'Direction',
  scheduledTime: '08:00',
  currentTime: '08:09',
  retardMin: 9,
};

const LATE_CAUSE_META: Record<LateCause, { icon: LucideIcon; description: string }> = {
  Transport: { icon: Bus, description: 'Embouteillage, taxi, bus, déplacement difficile' },
  'Problème perso': { icon: User, description: 'Contrainte personnelle exceptionnelle' },
  Santé: { icon: HeartPulse, description: 'Raison médicale ou malaise' },
  'Panne véhicule': { icon: Wrench, description: 'Problème mécanique ou immobilisation' },
  Intempéries: { icon: CloudRain, description: 'Pluie, cyclone, route difficile' },
  Autre: { icon: MoreHorizontal, description: 'Autre motif à préciser' },
};

const LATE_OPTIONS: OrionRadioCardOption[] = LATE_CAUSES.map((cause) => ({
  value: cause,
  label: cause === 'Problème perso' ? 'Problème personnel' : cause,
  description: LATE_CAUSE_META[cause].description,
  icon: LATE_CAUSE_META[cause].icon,
}));

const SUCCESS_DELAY_MS = 220;

/** Aperçu local modale retard — mock, sans API. */
export function LateArrivalPreview() {
  const [phase, setPhase] = useState<'form' | 'success'>('form');
  const [cause, setCause] = useState<string>(LATE_CAUSES[0]);
  const [remarque, setRemarque] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCauseChange = (value: string) => {
    setCause(value);
    if (value !== 'Autre') setRemarque('');
  };

  const submit = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setPhase('success');
    setSaving(false);
    await new Promise((r) => setTimeout(r, SUCCESS_DELAY_MS));
    setPhase('form');
    setCause(LATE_CAUSES[0]);
    setRemarque('');
  };

  return (
    <AuthDarkBackground embedded>
      <DelayDeclarationCard
        phase={phase}
        employee={MOCK}
        cause={cause}
        onCauseChange={handleCauseChange}
        causeOptions={LATE_OPTIONS}
        remarque={remarque}
        onRemarqueChange={setRemarque}
        saving={saving}
        onSubmit={submit}
        successMessage="Aperçu — retour au formulaire…"
        footerHelper="Aperçu local — transmission RH simulée"
      />
    </AuthDarkBackground>
  );
}
