import { useId, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import type { CategoryProgress } from '@/types';
import { CATEGORY_LIST } from '@/lib/categories';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useAppBasePath } from '@/lib/appPath';
import { cn } from '@/lib/utils';

const VIEWBOX = 520;
const CENTER = VIEWBOX / 2;
const RADIUS = 190;

interface PositionedNode {
  id: string;
  name: string;
  description: string;
  icon: (typeof CATEGORY_LIST)[number]['icon'];
  x: number;
  y: number;
  solved: number;
  total: number;
  fraction: number;
}

export function ObservatoryGraph({ progress }: { progress: CategoryProgress[] }) {
  const navigate = useNavigate();
  const appBasePath = useAppBasePath();
  const reduceMotion = usePrefersReducedMotion();
  const gradientId = useId();
  const [activeId, setActiveId] = useState<string | null>(null);

  const nodes = useMemo<PositionedNode[]>(() => {
    const byCategory = new Map(progress.map((p) => [p.category, p]));
    return CATEGORY_LIST.map((cat, i) => {
      const angle = (i / CATEGORY_LIST.length) * Math.PI * 2 - Math.PI / 2;
      const p = byCategory.get(cat.id);
      const solved = p?.solved ?? 0;
      const total = p?.total ?? 0;
      const fraction = total > 0 ? solved / total : 0;
      return {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        x: CENTER + RADIUS * Math.cos(angle),
        y: CENTER + RADIUS * Math.sin(angle),
        solved,
        total,
        fraction,
      };
    });
  }, [progress]);

  const active = nodes.find((n) => n.id === activeId) ?? null;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[560px]">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-full w-full overflow-visible" role="presentation">
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Faint orbit ring for spatial context */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--color-glass-border)" strokeWidth={1} />

        {/* Edges from center to each category */}
        {nodes.map((node) => (
          <line
            key={`edge-${node.id}`}
            x1={CENTER}
            y1={CENTER}
            x2={node.x}
            y2={node.y}
            stroke={node.fraction > 0 ? 'var(--color-accent)' : 'var(--color-glass-border)'}
            strokeOpacity={node.fraction > 0 ? 0.35 + node.fraction * 0.4 : 0.5}
            strokeWidth={node.fraction > 0 ? 1.5 : 1}
          />
        ))}

        {/* Center "YOU" node */}
        <circle cx={CENTER} cy={CENTER} r={64} fill={`url(#${gradientId})`} />
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={26}
          fill="var(--color-surface-elevated)"
          stroke="var(--color-accent)"
          strokeWidth={1.5}
          animate={reduceMotion ? undefined : { r: [26, 28, 26] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <text
          x={CENTER}
          y={CENTER + 4}
          textAnchor="middle"
          className="font-mono"
          fontSize={11}
          fill="var(--color-accent)"
          letterSpacing={1}
        >
          YOU
        </text>

        {/* Category nodes */}
        {nodes.map((node, i) => {
          const size = 14 + node.fraction * 12;
          const isActive = node.id === activeId;
          return (
            <motion.g
              key={node.id}
              initial={reduceMotion ? undefined : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: reduceMotion ? 0 : i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setActiveId(node.id)}
              onMouseLeave={() => setActiveId((cur) => (cur === node.id ? null : cur))}
              onFocus={() => setActiveId(node.id)}
              onBlur={() => setActiveId((cur) => (cur === node.id ? null : cur))}
              onClick={() => navigate(`${appBasePath}/challenges?category=${node.id}`)}
              tabIndex={0}
              role="button"
              aria-label={`${node.name}: ${node.solved} of ${node.total} solved`}
            >
              {node.fraction > 0 && (
                <circle cx={node.x} cy={node.y} r={size * 2.2} fill="var(--color-accent)" opacity={0.08} />
              )}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={size}
                fill={node.fraction > 0 ? 'var(--color-accent-soft)' : 'var(--color-surface)'}
                stroke={isActive ? 'var(--color-accent)' : 'var(--color-glass-border-strong)'}
                strokeWidth={isActive ? 2 : 1.2}
                animate={{ r: isActive ? size * 1.25 : size }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              />
              <text
                x={node.x}
                y={node.y + size + 18}
                textAnchor="middle"
                fontSize={12}
                fontWeight={500}
                fill="var(--color-text-secondary)"
                className="select-none"
              >
                {node.name}
              </text>
            </motion.g>
          );
        })}
      </svg>

      <AnimatePresence>
        {active && (
          // Positioned relative to the hovered node's own coordinates (as a
          // % of the SVG viewBox) rather than a fixed spot — previously this
          // always rendered at left-1/2/top-2 regardless of which category
          // was hovered. The outer div handles that positioning (plain CSS,
          // so it doesn't fight framer-motion's own transform on the inner
          // element); the inner motion.div only does the fade/scale pop-in.
          <div
            className="pointer-events-none absolute w-64"
            style={{
              left: `${(active.x / VIEWBOX) * 100}%`,
              top: `${(active.y / VIEWBOX) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 40px))',
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="glass-panel-strong rounded-[var(--radius-lg)] p-4"
            >
              <div className="flex items-center gap-2">
                <active.icon className="size-4 text-[var(--color-accent)]" />
                <p className="font-display text-sm font-semibold text-[var(--color-text-primary)]">{active.name}</p>
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                {active.description}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-xs text-[var(--color-text-muted)]">
                  {active.solved}/{active.total} explored
                </span>
                <span className={cn('inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]')}>
                  Explore <ArrowUpRight className="size-3.5" />
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
