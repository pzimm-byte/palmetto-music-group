'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { clamp } from '@/lib/format';

/**
 * Playback clock for the song page.
 *
 * Phase 1 has no audio files (Cloudflare R2 arrives in Phase 2), so the playhead
 * is driven by a timer at real-time speed. Phase 2 replaces this hook's internals
 * with WaveSurfer.js + the signed audio URL; the API (position/playing/seek/toggle)
 * stays the same so the UI does not change.
 */
export function usePlayer(duration: number) {
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef<number | null>(null);
  const last = useRef<number | null>(null);

  useEffect(() => {
    if (!playing) return;
    const tick = (t: number) => {
      if (last.current !== null) {
        const dt = (t - last.current) / 1000;
        setPosition((p) => {
          const next = p + dt;
          if (next >= duration) {
            setPlaying(false);
            return duration;
          }
          return next;
        });
      }
      last.current = t;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      last.current = null;
    };
  }, [playing, duration]);

  const seek = useCallback((t: number) => setPosition(clamp(t, 0, duration)), [duration]);
  const toggle = useCallback(() => {
    setPlaying((p) => {
      if (!p) setPosition((pos) => (pos >= duration ? 0 : pos));
      return !p;
    });
  }, [duration]);
  const skip = useCallback((delta: number) => setPosition((p) => clamp(p + delta, 0, duration)), [duration]);

  return { position, playing, seek, toggle, skip, duration };
}
