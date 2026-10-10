import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, PenLine } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Tabs } from '@/components/ui/Tabs';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { EmptyState } from '@/components/feedback/EmptyState';
import { useUiStore } from '@/stores/uiStore';
import { useAppBasePath } from '@/lib/appPath';
import { ApiError } from '@/lib/apiClient';
import { challengeService } from '@/services/challengeService';
import { useWriteup, useCreateWriteup, useUpdateWriteup } from './hooks/useWriteups';
import type { AppContentProps } from '@/os/types';

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Try again.';
}

export function WriteupEditorPage({ params }: AppContentProps) {
  const editSlug = params.slug;
  const isEditing = !!editSlug;
  const navigate = useNavigate();
  const pushToast = useUiStore((s) => s.pushToast);
  const appBasePath = useAppBasePath();

  const { data: existing, isLoading: isLoadingExisting } = useWriteup(editSlug);
  const { data: solvedChallenges, isLoading: isLoadingChallenges } = useQuery({
    queryKey: ['writeup-editor-solved-challenges'],
    queryFn: () => challengeService.list({ solved: 'solved', limit: 100 }),
    enabled: !isEditing,
  });

  const createWriteup = useCreateWriteup();
  const updateWriteup = useUpdateWriteup();

  const [title, setTitle] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setContent(existing.content);
    }
  }, [existing]);

  if (isEditing && isLoadingExisting) return <LoadingSpinner label="Loading writeup..." />;
  if (isEditing && !existing) {
    return <EmptyState title="Writeup not found" description="It may have been deleted." />;
  }
  if (isEditing && existing && !['DRAFT', 'REJECTED'].includes(existing.status)) {
    return (
      <EmptyState
        title="This writeup can't be edited"
        description={`Only a draft or a rejected writeup can be edited — it's currently ${existing.status.toLowerCase().replace('_', ' ')}.`}
      />
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEditing && existing) {
        await updateWriteup.mutateAsync({ id: existing.id, input: { title, content } });
        pushToast({ title: 'Writeup updated', variant: 'success' });
        navigate(`${appBasePath}/writeups/${existing.slug}`);
      } else {
        const writeup = await createWriteup.mutateAsync({ title, challengeId, content });
        pushToast({ title: 'Draft saved', description: 'Submit it for review when ready.', variant: 'success' });
        navigate(`${appBasePath}/writeups/${writeup.slug}`);
      }
    } catch (err) {
      pushToast({ title: 'Could not save writeup', description: messageOf(err), variant: 'error' });
    }
  }

  const isSaving = createWriteup.isPending || updateWriteup.isPending;
  const canSubmit = title.trim().length >= 3 && content.trim().length >= 50 && (isEditing || !!challengeId);

  return (
    <div className="@container flex h-full flex-col gap-5 overflow-y-auto p-5">
      <div>
        <h1 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
          {isEditing ? 'Edit Writeup' : 'Write a Writeup'}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          {isEditing
            ? 'Saved as a draft until you submit it for review again.'
            : 'You can only write up a challenge you\'ve already solved. Saved as a draft first — submit for review when ready.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={120} required />

        {!isEditing && (
          <Select
            label="Challenge"
            value={challengeId}
            onChange={(e) => setChallengeId(e.target.value)}
            required
            disabled={isLoadingChallenges}
          >
            <option value="">Select a solved challenge...</option>
            {solvedChallenges?.challenges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        )}
        {!isEditing && solvedChallenges && solvedChallenges.challenges.length === 0 && (
          <p className="text-xs text-[var(--color-text-muted)]">
            Solve a challenge first — writeups can only be published for challenges you've completed.
          </p>
        )}

        <Tabs items={[{ value: 'write', label: 'Write' }, { value: 'preview', label: 'Preview' }]} defaultValue="write">
          {(active) =>
            active === 'write' ? (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                minLength={50}
                maxLength={20000}
                rows={16}
                placeholder="## Enumeration&#10;&#10;How I found the vulnerability...&#10;&#10;## Exploitation&#10;&#10;..."
                className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-4 font-mono text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
              />
            ) : (
              <div className="min-h-[20rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                {content.trim() ? (
                  <MarkdownContent content={content} />
                ) : (
                  <p className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
                    <Eye className="size-4" /> Nothing to preview yet.
                  </p>
                )}
              </div>
            )
          }
        </Tabs>

        <Button type="submit" leftIcon={<PenLine className="size-4" />} isLoading={isSaving} disabled={!canSubmit}>
          {isEditing ? 'Save changes' : 'Save draft'}
        </Button>
      </form>
    </div>
  );
}
