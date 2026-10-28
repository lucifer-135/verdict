'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, UploadSimple } from '@phosphor-icons/react';
import { BRIGHTNESS_MIN, meanLuminance } from '@/lib/image/prep';
import { buttonClass } from './ui';

type Mode = 'starting' | 'live' | 'fallback';

/** Oval guide width as a share of the frame width; the API needs the face > 60% of width. */
const OVAL_WIDTH = 0.7;
const SAMPLE_MS = 500;

function FilePicker({ onCapture, variant }: { onCapture: (f: Blob) => void; variant: 'primary' | 'ghost' }) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
    e.target.value = '';
  };
  return (
    <label className={buttonClass(variant, 'w-full')}>
      <UploadSimple aria-hidden size={20} weight="bold" />
      {variant === 'primary' ? 'Take or choose a selfie' : 'Upload a photo instead'}
      <input type="file" accept="image/*" capture="user" aria-label="Choose a selfie" className="sr-only" onChange={onChange} />
    </label>
  );
}

/** Front-camera capture with an oval guide and a live light check; falls back to a file picker. */
export function CameraCapture({ onCapture }: { onCapture: (file: Blob) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mode, setMode] = useState<Mode>('starting');
  const [tooDark, setTooDark] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    const media = navigator.mediaDevices;
    if (!media?.getUserMedia) {
      setMode('fallback');
      return;
    }
    media
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(s => {
        if (cancelled) return s.getTracks().forEach(t => t.stop());
        stream = s;
        const video = videoRef.current!;
        video.srcObject = s;
        return video.play().then(() => setMode('live'));
      })
      .catch(() => !cancelled && setMode('fallback'));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Sample brightness inside the oval while live.
  useEffect(() => {
    if (mode !== 'live') return;
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 64;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const id = window.setInterval(() => {
      const v = videoRef.current;
      if (!v || !ctx || !v.videoWidth) return;
      const crop = centerCrop(v.videoWidth, v.videoHeight);
      const ow = crop.w * OVAL_WIDTH;
      ctx.drawImage(v, crop.x + (crop.w - ow) / 2, crop.y + crop.h * 0.15, ow, crop.h * 0.7, 0, 0, 48, 64);
      setTooDark(meanLuminance(ctx.getImageData(0, 0, 48, 64).data) < BRIGHTNESS_MIN);
    }, SAMPLE_MS);
    return () => window.clearInterval(id);
  }, [mode]);

  function capture() {
    const v = videoRef.current;
    if (!v) return;
    const crop = centerCrop(v.videoWidth, v.videoHeight);
    const canvas = document.createElement('canvas');
    canvas.width = crop.w;
    canvas.height = crop.h;
    canvas.getContext('2d')!.drawImage(v, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
    canvas.toBlob(b => b && onCapture(b), 'image/jpeg', 0.92);
  }

  if (mode === 'fallback') {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center shadow-soft ring-1 ring-line/70">
        <span className="mx-auto mb-3 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Camera aria-hidden size={28} weight="duotone" />
        </span>
        <p className="font-semibold">Camera not available here</p>
        <p className="mt-1 mb-5 text-sm text-ink-muted">
          Take a selfie with your phone camera or choose a recent one. Face the light, glasses off.
        </p>
        <FilePicker onCapture={onCapture} variant="primary" />
      </div>
    );
  }

  const hint = mode === 'starting' ? 'Starting camera…' : tooDark ? 'Too dark — find more light' : 'Fit your face inside the oval';

  return (
    <div>
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-ink shadow-lift">
        <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <defs>
            <mask id="oval-cut">
              <rect width="300" height="400" fill="white" />
              <ellipse cx="150" cy="190" rx={150 * OVAL_WIDTH} ry="140" fill="black" />
            </mask>
          </defs>
          <rect width="300" height="400" fill="rgb(31 26 23 / 0.45)" mask="url(#oval-cut)" />
          <ellipse
            cx="150"
            cy="190"
            rx={150 * OVAL_WIDTH}
            ry="140"
            fill="none"
            stroke={tooDark ? '#fda4af' : 'white'}
            strokeWidth="2.5"
            strokeDasharray={tooDark ? '6 6' : undefined}
          />
        </svg>
        <p
          role="status"
          className={`absolute inset-x-0 top-4 mx-auto w-fit rounded-full px-3 py-1.5 text-sm font-medium backdrop-blur ${
            tooDark ? 'bg-rose-50/95 text-rose-800' : 'bg-ink/55 text-white'
          }`}
        >
          {hint}
        </p>
        <div className="absolute inset-x-0 bottom-5 flex justify-center">
          <button
            type="button"
            onClick={capture}
            disabled={mode !== 'live' || tooDark}
            aria-label="Take photo"
            className="grid size-[72px] cursor-pointer place-items-center rounded-full bg-white/95 ring-4 ring-white/40 transition-transform duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="size-14 rounded-full bg-primary" />
          </button>
        </div>
      </div>
      <div className="mt-3">
        <FilePicker onCapture={onCapture} variant="ghost" />
      </div>
    </div>
  );
}

/** Largest centered 3:4 portrait crop of a w×h frame. */
function centerCrop(w: number, h: number) {
  const targetW = Math.min(w, (h * 3) / 4);
  const targetH = (targetW * 4) / 3;
  return { x: (w - targetW) / 2, y: (h - targetH) / 2, w: targetW, h: targetH };
}
