import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiError } from '@/lib/apiClient';

export interface ChallengeImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (archive: File, flag: string) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Packages never carry a real flag value (flags are a one-way hash,
 * never recoverable — see server/README.md), so importing one always
 * requires the admin to type the real flag in here directly, the same
 * way creating a challenge by hand already does.
 */
export function ChallengeImportModal({ open, onClose, onImport, isSubmitting }: ChallengeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [flag, setFlag] = useState('');
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setFlag('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) {
      setError('Choose a .zip package to import.');
      return;
    }
    if (flag.trim().length < 3) {
      setError('Flag must be at least 3 characters.');
      return;
    }
    try {
      await onImport(file, flag.trim());
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed.');
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Import Challenge Package"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Imports as a draft — nothing becomes visible to players until you review and publish it. See
          docs/challenges/challenge-packages.md for the package format.
        </p>

        {error && (
          <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-3.5 py-2.5 text-sm text-[var(--color-error)]">
            {error}
          </p>
        )}

        <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-3.5 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]">
          <Upload className="size-4" />
          {file ? file.name : 'Choose .zip package'}
          <input
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <Input
          label="Flag"
          mono
          placeholder="CTF{...}"
          value={flag}
          onChange={(e) => setFlag(e.target.value)}
        />

        <div className="mt-2 flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Import as draft
          </Button>
        </div>
      </form>
    </Modal>
  );
}
