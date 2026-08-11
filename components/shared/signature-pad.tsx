'use client';

import { useEffect, useRef, useState } from 'react';
import { Eraser } from 'lucide-react';

type Props = {
  value?: string;
  onChange: (dataUrl: string) => void;
  className?: string;
};

/** Pad signature tactile — export PNG data URL. */
export function SignaturePad({ value, onChange, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(!value);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !value) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setEmpty(false);
    };
    img.src = value;
  }, [value]);

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const data = canvas.toDataURL('image/png');
    onChange(data);
    setEmpty(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
    setEmpty(true);
  };

  return (
    <div className={className}>
      <p className="text-[10px] text-muted-foreground mb-1">Signature du destinataire</p>
      <canvas
        ref={canvasRef}
        width={400}
        height={120}
        className="w-full h-[120px] rounded-[7px] border border-dashed border-border bg-white touch-none cursor-crosshair"
        onPointerDown={(e) => {
          drawing.current = true;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          const { x, y } = getPos(e);
          ctx.beginPath();
          ctx.moveTo(x, y);
          (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          const { x, y } = getPos(e);
          ctx.lineTo(x, y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          exportImage();
        }}
        onPointerLeave={() => {
          if (drawing.current) {
            drawing.current = false;
            exportImage();
          }
        }}
      />
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">{empty ? 'Signez ci-dessus' : 'Signature capturée'}</span>
        <button type="button" onClick={clear} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
          <Eraser size={12} /> Effacer
        </button>
      </div>
    </div>
  );
}
