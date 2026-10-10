import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useUiStore } from '@/stores/uiStore';
import { useReportWriteup } from '../hooks/useWriteups';

export function ReportModal({ writeupId, open, onClose }: { writeupId: string; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const report = useReportWriteup();
  const pushToast = useUiStore((s) => s.pushToast);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    report.mutate(
      { writeupId, reason },
      {
        onSuccess: () => {
          pushToast({ title: 'Report submitted', description: 'An admin will review this shortly.', variant: 'success' });
          setReason('');
          onClose();
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Report this writeup">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
            What's wrong with it?
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            minLength={3}
            rows={4}
            placeholder="e.g. plagiarized, offensive content, spam..."
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-3 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
          />
        </label>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" size="sm" isLoading={report.isPending}>
            Submit report
          </Button>
        </div>
      </form>
    </Modal>
  );
}
