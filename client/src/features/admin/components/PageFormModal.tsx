import { useEffect, useState, type FormEvent } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { AdminPage } from '@/types';

export interface PageFormValues {
  slug: string;
  title: string;
  content: string;
}

export function PageFormModal({
  open,
  onClose,
  page,
  isSubmitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  page: AdminPage | null;
  isSubmitting: boolean;
  onSubmit: (input: PageFormValues) => Promise<void>;
}) {
  const [form, setForm] = useState<PageFormValues>({ slug: '', title: '', content: '' });

  useEffect(() => {
    if (open) {
      setForm({ slug: page?.slug ?? '', title: page?.title ?? '', content: page?.content ?? '' });
    }
  }, [open, page]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await onSubmit(form);
  }

  return (
    <Modal open onClose={onClose} title={page ? `Edit "${page.title}"` : 'New page'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Slug"
          mono
          placeholder="code-of-conduct"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          hint="Lowercase letters, numbers, and hyphens only — this becomes /pages/<slug>."
          required
        />
        <Input
          label="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          required
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
            Content (Markdown)
          </label>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            maxLength={50_000}
            rows={12}
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
          />
        </div>
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting}>
            {page ? 'Save changes' : 'Create page'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
