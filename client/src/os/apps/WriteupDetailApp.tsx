import { useEffect } from 'react';
import { WriteupView } from '@/features/writeups/components/WriteupView';
import { useWriteup } from '@/features/writeups/hooks/useWriteups';
import { useWindowStore } from '../state/windowStore';
import type { AppContentProps } from '../types';

export function WriteupDetailApp({ windowId, params, isCompact }: AppContentProps) {
  const slug = params.slug;
  const { data: writeup } = useWriteup(slug);
  const setWindowTitle = useWindowStore((s) => s.setWindowTitle);

  useEffect(() => {
    if (writeup?.title) setWindowTitle(windowId, writeup.title);
  }, [writeup?.title, windowId, setWindowTitle]);

  return (
    <div className="@container h-full overflow-y-auto">
      <WriteupView slug={slug} dense={isCompact} />
    </div>
  );
}
