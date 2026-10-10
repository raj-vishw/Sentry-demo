import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useWindowStore } from '../state/windowStore';
import { Window, zoneRect } from './Window';
import type { SnapZone } from '../types';

export function WindowManager() {
  const windows = useWindowStore((s) => s.windows);
  const activeWorkspace = useWindowStore((s) => s.activeWorkspace);
  const [previewZone, setPreviewZone] = useState<SnapZone>(null);

  // Windows are stacked by RANK within this visible set, not by the store's
  // raw (monotonically-growing) zIndex counter — bounds the on-screen
  // z-index to [100, 100 + count] regardless of how long the session runs,
  // so it can never grow into the chrome/overlay range above it.
  const visible = [...windows]
    .filter((w) => w.workspace === activeWorkspace)
    .sort((a, b) => a.zIndex - b.zIndex);
  const rect = zoneRect(previewZone);

  return (
    <>
      {visible.map((win, rank) => (
        <Window key={win.id} win={win} stackIndex={rank} onSnapPreview={setPreviewZone} />
      ))}
      {rect &&
        createPortal(
          <motion.div
            className="pointer-events-none fixed rounded-[var(--radius-lg)] border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/10"
            style={{ zIndex: 90, left: rect.position.x, top: rect.position.y, width: rect.size.width, height: rect.size.height }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12 }}
          />,
          document.body,
        )}
    </>
  );
}
