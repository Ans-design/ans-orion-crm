'use client';

import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video, Mic, MicOff, VideoOff } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { TALK_SHELL, TALK_R } from './ans-talk-utils';

export type CallMode = 'audio' | 'video';

type Props = {
  open: boolean;
  mode: CallMode;
  contactName: string;
  onClose: () => void;
};

export function AnsTalkCallModal({ open, mode, contactName, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [ringing, setRinging] = useState(true);

  useEffect(() => {
    if (!open) return;
    setRinging(true);
    setMuted(false);
    setCamOff(false);
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === 'video',
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current && mode === 'video') {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setTimeout(() => setRinging(false), 1500);
      } catch {
        uxToast.error('Micro ou caméra inaccessible — vérifiez les permissions du navigateur');
        onClose();
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, mode, onClose]);

  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !muted; });
  }, [muted]);

  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !camOff; });
  }, [camOff]);

  const hangUp = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-backdrop backdrop-blur-sm">
      <div
        className={`w-full max-w-md ${TALK_R} overflow-hidden shadow-2xl`}
        style={{ background: TALK_SHELL.panel2, border: `1px solid ${TALK_SHELL.border}` }}
      >
        <div className="relative aspect-video flex items-center justify-center" style={{ background: '#0a0a0c' }}>
          {mode === 'video' && !camOff ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-zinc-400">
              <div
                className={`talk-avatar w-20 h-20 flex items-center justify-center text-2xl font-bold text-white`}
                style={{ background: TALK_SHELL.red }}
              >
                {contactName.slice(0, 1).toUpperCase()}
              </div>
              {mode === 'audio' && <Phone size={28} className="text-emerald-400 animate-pulse" />}
            </div>
          )}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-white">{contactName}</p>
              <p className="text-xs text-zinc-400">
                {ringing ? 'Connexion…' : mode === 'video' ? 'Appel vidéo (aperçu local)' : 'Appel audio'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className={`w-11 h-11 ${TALK_R} flex items-center justify-center bg-white/10 hover:bg-white/15 text-zinc-200`}
            aria-label={muted ? 'Activer micro' : 'Couper micro'}
          >
            {muted ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          {mode === 'video' && (
            <button
              type="button"
              onClick={() => setCamOff(!camOff)}
              className={`w-11 h-11 ${TALK_R} flex items-center justify-center bg-white/10 hover:bg-white/15 text-zinc-200`}
              aria-label={camOff ? 'Activer caméra' : 'Couper caméra'}
            >
              {camOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
          )}
          <button
            type="button"
            onClick={hangUp}
            className={`w-12 h-12 ${TALK_R} flex items-center justify-center text-white`}
            style={{ background: '#dc2626' }}
            aria-label="Raccrocher"
          >
            <PhoneOff size={22} />
          </button>
        </div>

        <p className="text-center orion-text-meta text-zinc-600 pb-4 px-4">
          Appels WebRTC non disponibles — utilisez{' '}
          <a href="/messagerie" className="font-bold text-[var(--orion-red,#cc0033)] underline">
            ANS Talk /messagerie
          </a>{' '}
          pour discuter (texte, fichiers).
        </p>
      </div>
    </div>
  );
}
