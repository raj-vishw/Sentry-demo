import { useEffect, useRef } from 'react';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useSettingsStore } from '@/os/state/settingsStore';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** 0 = distant/dim/small, 1 = near/bright/large — creates spatial depth. */
  depth: number;
}

const NODE_SPACING = 130;
const LINK_DISTANCE = 150;
const MOUSE_RADIUS = 200;

/**
 * The "digital observatory" field: a calm, depth-layered constellation of
 * nodes rather than a dense hacker-matrix grid. Canvas-based (cheap at this
 * density), pauses when off-screen/tab hidden, and renders a single static
 * frame under prefers-reduced-motion instead of looping.
 */
/** Bright specks read as "signal" on a dark field; on light they'd just look
 * like a mistake, so light mode uses muted ink flecks instead of the brand
 * accent color. */
const PALETTE = {
  dark: { line: '0, 229, 255', dot: '140, 235, 250', glow: '0, 229, 255' },
  light: { line: '30, 41, 59', dot: '51, 65, 85', glow: '8, 145, 178' },
};

export function AnimatedBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useSettingsStore((s) => s.theme);
  const colors = PALETTE[theme];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let nodes: Node[] = [];
    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let rafId = 0;
    let running = true;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      width = canvasEl.clientWidth;
      height = canvasEl.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasEl.width = width * dpr;
      canvasEl.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(80, Math.floor((width * height) / (NODE_SPACING * NODE_SPACING)));
      nodes = Array.from({ length: count }, () => {
        const depth = Math.random();
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (0.05 + depth * 0.12),
          vy: (Math.random() - 0.5) * (0.05 + depth * 0.12),
          depth,
        };
      });
    }

    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }

    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    function draw() {
      if (!running) return;
      ctx!.clearRect(0, 0, width, height);

      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        const dx = node.x - mouse.x;
        const dy = node.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < MOUSE_RADIUS) {
          const force = (1 - dist / MOUSE_RADIUS) * (0.3 + node.depth * 0.6);
          node.x += (dx / (dist || 1)) * force;
          node.y += (dy / (dist || 1)) * force;
        }
      }

      // Constellation lines only between nearer nodes — keeps the field
      // calm and readable instead of a dense noisy mesh.
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (a.depth < 0.35) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          if (b.depth < 0.35) continue;
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DISTANCE) {
            const opacity = (1 - dist / LINK_DISTANCE) * 0.14 * ((a.depth + b.depth) / 2);
            ctx!.strokeStyle = `rgba(${colors.line}, ${opacity})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      for (const node of nodes) {
        const radius = 0.6 + node.depth * 1.6;
        const opacity = (theme === 'light' ? 0.22 : 0.18) + node.depth * (theme === 'light' ? 0.45 : 0.55);
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${colors.dot}, ${opacity})`;
        ctx!.fill();

        if (node.depth > 0.75) {
          ctx!.beginPath();
          ctx!.arc(node.x, node.y, radius * 3, 0, Math.PI * 2);
          const gradient = ctx!.createRadialGradient(node.x, node.y, 0, node.x, node.y, radius * 3);
          gradient.addColorStop(0, `rgba(${colors.glow}, ${(theme === 'light' ? 0.08 : 0.12) * node.depth})`);
          gradient.addColorStop(1, `rgba(${colors.glow}, 0)`);
          ctx!.fillStyle = gradient;
          ctx!.fill();
        }
      }

      rafId = requestAnimationFrame(draw);
    }

    resize();

    if (!prefersReducedMotion) {
      rafId = requestAnimationFrame(draw);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseleave', onMouseLeave);
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
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [prefersReducedMotion, colors, theme]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      role="presentation"
    />
  );
}
