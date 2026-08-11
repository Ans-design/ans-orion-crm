/** Alerte sonore douce ANS Talk (Web Audio) — volume bas, courte. */

let sharedCtx: AudioContext | null = null;
let lastPlayedAt = 0;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

/** Bip doux double (urgence) — throttle 8s, ignore reduced-motion. */
export function playTalkUrgentChime(force = false): void {
  if (typeof window === 'undefined') return;
  if (!force && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const now = Date.now();
  if (!force && now - lastPlayedAt < 8000) return;
  lastPlayedAt = now;

  try {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx.resume();

    const tone = (freq: number, start: number, dur: number, gainPeak: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainPeak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    };

    const t0 = ctx.currentTime + 0.01;
    tone(660, t0, 0.12, 0.045);
    tone(880, t0 + 0.14, 0.14, 0.038);
  } catch {
    /* autoplay / AudioContext bloqué — silencieux */
  }
}
