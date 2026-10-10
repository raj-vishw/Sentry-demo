import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useSettingsStore } from '@/os/state/settingsStore';

const GLYPHS = '01アイウエオカキクケコサシスセソタチツテトABCDEF$#%&*+-/<>{}[]'.split('');
const FONT_SIZE = 16;
const TRAIL_LENGTH = 14;

interface Column {
  x: number;
  headRow: number;
  speed: number;
  glyphs: string[];
}

/** Same theme-adjustment reasoning as AnimatedBackground.tsx's PALETTE —
 * bright green reads as "signal" on dark, but would just look broken on a
 * light background, so light mode uses a muted ink green instead. */
const PALETTE = {
  dark: { lead: '220, 255, 230', trail: '110, 255, 160' },
  light: { lead: '8, 60, 28', trail: '30, 110, 60' },
};

function randomGlyph(): string {
  return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
}

/**
 * Classic falling-code effect for the "matrix" wallpaper. Each column
 * redraws a short fading trail of glyphs from scratch every frame (rather
 * than the usual translucent-fill-over-canvas trick) specifically so it
 * stays theme-correct — a persistent black fill would fade toward black
 * regardless of light/dark mode.
 */
export function DigitalRain({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useSettingsStore((s) => s.theme);
  const colors = PALETTE[theme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let columns: Column[] = [];
    let width = 0;
    let height = 0;
    let totalRows = 0;
    let rafId = 0;
    let running = true;

    function resize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      width = canvasEl.clientWidth;
      height = canvasEl.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      totalRows = Math.ceil(height / FONT_SIZE);
      const columnCount = Math.ceil(width / FONT_SIZE);
      columns = Array.from({ length: columnCount }, (_, i) => ({
        x: i * FONT_SIZE,
        headRow: Math.random() * -totalRows,
        speed: 0.25 + Math.random() * 0.5,
        glyphs: Array.from({ length: TRAIL_LENGTH }, randomGlyph),
      }));
    }

    function draw() {
      if (!running) return;
      ctx!.clearRect(0, 0, width, height);
      ctx!.font = `${FONT_SIZE}px monospace`;
      ctx!.textBaseline = 'top';

      for (const col of columns) {
        col.headRow += col.speed;
        if (col.headRow - TRAIL_LENGTH > totalRows) {
          col.headRow = Math.random() * -totalRows * 0.5;
          col.speed = 0.25 + Math.random() * 0.5;
        }
        // Occasionally mutate a glyph mid-trail for a "data flicker" feel.
        if (Math.random() < 0.05) {
          col.glyphs[Math.floor(Math.random() * col.glyphs.length)] = randomGlyph();
        }

        for (let t = 0; t < TRAIL_LENGTH; t++) {
          const row = Math.floor(col.headRow) - t;
          if (row < 0 || row > totalRows) continue;
          const y = row * FONT_SIZE;
          const fade = 1 - t / TRAIL_LENGTH;
          const color = t === 0 ? colors.lead : colors.trail;
          const opacity = t === 0 ? 0.9 : fade * fade * 0.55;
          ctx!.fillStyle = `rgba(${color}, ${opacity})`;
          ctx!.fillText(col.glyphs[t % col.glyphs.length], col.x, y);
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    resize();

    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(draw);
    } else {
      draw();
      running = false;
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);

    function onVisibilityChange() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(rafId);
      } else if (!prefersReducedMotion) {
        running = true;
        rafId = requestAnimationFrame(draw);
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      running = false;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [prefersReducedMotion, colors, theme]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" role="presentation" />;
}
