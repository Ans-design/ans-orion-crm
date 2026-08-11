'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import '@/styles/late-arrival-modal.css';
import {
  Bus,
  User,
  HeartPulse,
  Wrench,
  CloudRain,
  MoreHorizontal,
  RefreshCw,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { LATE_CAUSES, type LateCause } from '@/lib/constants/rh';
import { uxToast, UX_MSG } from '@/lib/ux/feedback';
import { unwrapApiData, getApiErrorMessage } from '@/lib/api-client';
import type { OrionRadioCardOption } from '@/components/orion/auth';
import { AuthDarkBackground } from '@/components/auth/auth-dark-background';
import { DelayDeclarationCard } from '@/components/auth/delay-declaration-card';

const LATE_CAUSE_META: Record<LateCause, { icon: LucideIcon; description: string }> = {
  Transport: {
    icon: Bus,
    description: 'Embouteillage, taxi, bus, déplacement difficile',
  },
  'Problème perso': {
    icon: User,
    description: 'Contrainte personnelle exceptionnelle',
  },
  Santé: {
    icon: HeartPulse,
    description: 'Raison médicale ou malaise',
  },
  'Panne véhicule': {
    icon: Wrench,
    description: 'Problème mécanique ou immobilisation',
  },
  Intempéries: {
    icon: CloudRain,
    description: 'Pluie, cyclone, route difficile',
  },
  Autre: {
    icon: MoreHorizontal,
    description: 'Autre motif à préciser',
  },
};

const LATE_OPTIONS: OrionRadioCardOption[] = LATE_CAUSES.map((cause) => ({
  value: cause,
  label: cause === 'Problème perso' ? 'Problème personnel' : cause,
  description: LATE_CAUSE_META[cause].description,
  icon: LATE_CAUSE_META[cause].icon,
}));

type LateArrivalPayload = {
  blocked?: boolean;
  degraded?: boolean;
  reason?: string;
  employeeName?: string;
  matricule?: string;
  poste?: string | null;
  departement?: string | null;
  scheduledTime?: string;
  currentTime?: string | null;
  retardMin?: number;
};

type GateState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'clear' }
  | {
      status: 'blocked';
      employeeName: string;
      matricule: string;
      poste?: string | null;
      departement?: string | null;
      scheduledTime: string;
      currentTime?: string | null;
      retardMin: number;
    }
  | {
      status: 'success';
      employeeName: string;
      matricule: string;
      poste?: string | null;
      departement?: string | null;
      scheduledTime: string;
      currentTime?: string | null;
      retardMin: number;
    };

const SUCCESS_DELAY_MS = 220;
const IS_DEV = process.env.NODE_ENV === 'development';

function devLog(...args: unknown[]) {
  if (IS_DEV) console.info('[LateArrivalGate]', ...args);
}

function devWarn(...args: unknown[]) {
  if (IS_DEV) console.warn('[LateArrivalGate]', ...args);
}

type LateArrivalGateProps = {
  children: ReactNode;
};

export function LateArrivalGate({ children }: LateArrivalGateProps) {
  const { status: sessionStatus } = useSession();
  const [gate, setGate] = useState<GateState>({ status: 'idle' });
  const [checkDegraded, setCheckDegraded] = useState(false);
  const [checkMessage, setCheckMessage] = useState('');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [cause, setCause] = useState<string>(LATE_CAUSES[0]);
  const [remarque, setRemarque] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const markDegraded = useCallback((message: string) => {
    setGate({ status: 'clear' });
    setCheckDegraded(true);
    setCheckMessage(message);
    setBannerDismissed(false);
    devWarn('verification degraded:', message);
  }, []);

  const load = useCallback(async () => {
    if (sessionStatus !== 'authenticated') {
      devLog('skip check — session not authenticated');
      return;
    }

    setGate({ status: 'loading' });
    setError('');

    try {
      const r = await fetch('/api/rh/late-arrival', { cache: 'no-store' });
      const raw = await r.json().catch(() => ({}));

      if (!r.ok) {
        markDegraded(
          getApiErrorMessage(raw, 'Vérification du pointage temporairement indisponible.'),
        );
        return;
      }

      const d = unwrapApiData<LateArrivalPayload>(raw);
      devLog('check result', d);

      if (d.degraded || d.reason === 'check_failed') {
        markDegraded('Vérification du pointage temporairement indisponible.');
        return;
      }

      setCheckDegraded(false);
      setCheckMessage('');
      setBannerDismissed(false);

      if (d.blocked) {
        setGate({
          status: 'blocked',
          employeeName: d.employeeName ?? '',
          matricule: d.matricule ?? '',
          poste: d.poste,
          departement: d.departement,
          scheduledTime: d.scheduledTime ?? '',
          currentTime: d.currentTime,
          retardMin: d.retardMin ?? 0,
        });
        return;
      }

      setGate({ status: 'clear' });
    } catch (err) {
      devWarn('network error', err);
      markDegraded('Connexion instable — pointage non vérifié pour le moment.');
    }
  }, [markDegraded, sessionStatus]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (sessionStatus === 'unauthenticated') {
      setGate({ status: 'clear' });
      setCheckDegraded(false);
      return;
    }
    void load();
  }, [sessionStatus, load]);

  const handleCauseChange = (value: string) => {
    setCause(value);
    if (value !== 'Autre') setRemarque('');
    setError('');
  };

  const submit = async () => {
    if (!cause) {
      setError('Sélectionnez une cause du retard.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/rh/late-arrival', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cause, remarque: remarque.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(getApiErrorMessage(d, 'Enregistrement impossible'));
        return;
      }
      if (gate.status !== 'blocked') return;
      setGate({ ...gate, status: 'success' });
      setCheckDegraded(false);
      setCheckMessage('');
      await new Promise((r) => setTimeout(r, SUCCESS_DELAY_MS));
      setGate({ status: 'clear' });
      uxToast.success(UX_MSG.lateDeclared);
    } finally {
      setSaving(false);
    }
  };

  const retryCheck = () => {
    setBannerDismissed(false);
    void load();
  };

  const showBlockedOverlay = gate.status === 'blocked' || gate.status === 'success';
  const overlayEmployee = gate.status === 'blocked' || gate.status === 'success' ? gate : null;
  const checking = gate.status === 'loading';

  return (
    <>
      {children}

      {checking && (
        <div
          className="late-arrival-gate-loading"
          role="status"
          aria-live="polite"
          aria-label="Vérification du pointage en cours"
        >
          <span className="late-arrival-gate-loading__bar" />
        </div>
      )}

      {checkDegraded && !bannerDismissed && gate.status !== 'blocked' && gate.status !== 'success' && (
        <div className="late-arrival-gate-banner" role="status" aria-live="polite">
          <div className="late-arrival-gate-banner__content">
            <AlertTriangle size={16} className="late-arrival-gate-banner__icon" aria-hidden />
            <p className="late-arrival-gate-banner__text">
              {checkMessage || 'Vérification du pointage indisponible — vous pouvez continuer à travailler.'}
            </p>
            <button
              type="button"
              className="late-arrival-gate-banner__retry orion-ux-press"
              onClick={retryCheck}
              disabled={checking}
            >
              <RefreshCw size={14} className={checking ? 'animate-spin' : undefined} aria-hidden />
              Réessayer
            </button>
            <button
              type="button"
              className="late-arrival-gate-banner__dismiss orion-ux-press"
              onClick={() => setBannerDismissed(true)}
              aria-label="Masquer l'alerte"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {showBlockedOverlay && overlayEmployee && (
        <AuthDarkBackground>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <DelayDeclarationCard
              phase={gate.status === 'success' ? 'success' : 'form'}
              employee={{
                employeeName: overlayEmployee.employeeName,
                matricule: overlayEmployee.matricule,
                poste: overlayEmployee.poste,
                departement: overlayEmployee.departement,
                scheduledTime: overlayEmployee.scheduledTime,
                currentTime: overlayEmployee.currentTime,
                retardMin: overlayEmployee.retardMin,
              }}
              cause={cause}
              onCauseChange={handleCauseChange}
              causeOptions={LATE_OPTIONS}
              remarque={remarque}
              onRemarqueChange={setRemarque}
              error={error}
              saving={saving}
              onSubmit={submit}
            />
          </motion.div>
        </AuthDarkBackground>
      )}
    </>
  );
}
