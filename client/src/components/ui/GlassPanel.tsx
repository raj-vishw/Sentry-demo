import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Strength = 'regular' | 'strong';

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  strength?: Strength;
}

/**
 * The base translucent surface for the "Glass Laboratory" aesthetic —
 * frosted, thin-bordered, soft-shadowed. Used for nav, panels, tooltips,
 * and modals alike so the whole app reads as one coherent material.
 */
export function GlassPanel({ className, strength = 'regular', ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)]',
        strength === 'regular' ? 'glass-panel' : 'glass-panel-strong',
        className,
      )}
      {...props}
    />
  );
}
