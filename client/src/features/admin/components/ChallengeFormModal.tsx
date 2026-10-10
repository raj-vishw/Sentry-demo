import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ExternalLink, Plus, Trash2, Upload } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LIST, DIFFICULTY_META } from '@/lib/categories';
import type { AdminChallengeDetail, AdminChallengeInput } from '@/services/adminService';
import { useUiStore } from '@/stores/uiStore';

const CHALLENGE_TYPES = [
  { id: 'STATIC', label: 'Static — download files, submit a flag' },
  { id: 'INTERACTIVE', label: 'Interactive — a running environment, no files required' },
  { id: 'HYBRID', label: 'Hybrid — both files and a running environment' },
] as const;

const hintSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, 'Hint title is required.'),
  content: z.string().trim().min(1, 'Hint content is required.'),
  cost: z.number().int().min(0),
  order: z.number().int().min(0),
  active: z.boolean(),
});

const environmentSchema = z.object({
  port: z.number().int().min(1).max(65535).nullable(),
  protocol: z.enum(['HTTP', 'TCP', 'UDP']),
  cpuLimit: z.number().min(0.1).max(16),
  memoryLimitMb: z.number().int().min(16).max(16384),
  timeoutSeconds: z.number().int().min(60).max(86400),
});

const formSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.'),
  shortDescription: z.string().trim().max(160),
  description: z.string().trim().min(10, 'Description must be at least 10 characters.'),
  tagsText: z.string(),
  category: z.enum(CATEGORY_LIST.map((c) => c.id) as [string, ...string[]]),
  type: z.enum(['STATIC', 'INTERACTIVE', 'HYBRID']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'insane']),
  points: z.number().int().min(0).max(10000),
  flag: z.string().trim().optional(),
  flagFormat: z.string().trim().min(1),
  published: z.boolean(),
  hints: z.array(hintSchema),
  prerequisite: z.string().nullable(),
  environment: environmentSchema,
});

type FormValues = z.infer<typeof formSchema>;

const emptyDefaults: FormValues = {
  title: '',
  shortDescription: '',
  description: '',
  tagsText: '',
  category: 'web',
  type: 'STATIC',
  difficulty: 'easy',
  points: 100,
  flag: '',
  flagFormat: 'CTF{...}',
  published: false,
  hints: [],
  prerequisite: null,
  environment: { port: null, protocol: 'HTTP', cpuLimit: 1, memoryLimitMb: 512, timeoutSeconds: 3600 },
};

export interface ChallengeFormModalProps {
  open: boolean;
  onClose: () => void;
  challenge?: AdminChallengeDetail | null;
  /** Every challenge, for the "Requires" picker — only published ones are
   * offered (unpublished/draft challenges can't be a prerequisite). The
   * server independently rejects an invalid choice (self-reference, or a
   * challenge that already has a prerequisite of its own — see
   * challenge.service.ts#validatePrerequisite) if this client-side filter
   * is ever insufficient. */
  allChallenges: { id: string; title: string; published?: boolean }[];
  onSubmit: (input: AdminChallengeInput) => Promise<void>;
  isSubmitting: boolean;
  onUploadFile?: (file: File) => Promise<void>;
}

function toFormValues(challenge: AdminChallengeDetail): FormValues {
  return {
    title: challenge.title,
    shortDescription: challenge.shortDescription,
    description: challenge.description,
    tagsText: challenge.tags.join(', '),
    category: challenge.category,
    type: challenge.type,
    difficulty: challenge.difficulty,
    points: challenge.points,
    flag: '',
    flagFormat: challenge.flagFormat,
    published: challenge.published,
    hints: challenge.hints,
    prerequisite: challenge.prerequisite,
    environment: challenge.environment
      ? {
          port: challenge.environment.port,
          protocol: challenge.environment.protocol,
          cpuLimit: challenge.environment.cpuLimit,
          memoryLimitMb: challenge.environment.memoryLimitMb,
          timeoutSeconds: challenge.environment.timeoutSeconds,
        }
      : emptyDefaults.environment,
  };
}

/**
 * Organized into named sections (Identity & Classification / Flag /
 * Resources / Environment / Lifecycle) rather than a flat list of fields —
 * the "Environment" section only renders at all for INTERACTIVE/HYBRID,
 * so a STATIC challenge's form never shows it. One shared form/schema
 * throughout rather than per-step state, which keeps this simple while
 * still giving the guided, type-aware feel the sections provide.
 */
export function ChallengeFormModal({
  open,
  onClose,
  challenge,
  allChallenges,
  onSubmit,
  isSubmitting,
  onUploadFile,
}: ChallengeFormModalProps) {
  const isEdit = !!challenge;
  const pushToast = useUiStore((s) => s.pushToast);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: emptyDefaults });

  const { fields, append, remove } = useFieldArray({ control, name: 'hints' });
  const type = useWatch({ control, name: 'type' });
  const needsEnvironment = type !== 'STATIC';

  useEffect(() => {
    if (open) {
      reset(challenge ? toFormValues(challenge) : emptyDefaults);
    }
  }, [open, challenge, reset]);

  async function handleFormSubmit(values: FormValues) {
    if (!isEdit && !values.flag) {
      setError('flag', { message: 'Flag is required when creating a challenge.' });
      return;
    }
    await onSubmit({
      title: values.title,
      shortDescription: values.shortDescription,
      description: values.description,
      tags: values.tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      category: values.category as AdminChallengeInput['category'],
      type: values.type,
      difficulty: values.difficulty,
      points: values.points,
      flag: values.flag || undefined,
      flagFormat: values.flagFormat,
      published: values.published,
      hints: values.hints.map((h, i) => ({ ...h, order: i })),
      prerequisite: values.prerequisite || null,
      environment: needsEnvironment ? values.environment : null,
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onUploadFile) return;
    try {
      await onUploadFile(file);
      pushToast({ title: 'File uploaded', description: file.name, variant: 'success' });
    } catch {
      // Global mutation/query error handling already surfaces a toast.
    } finally {
      e.target.value = '';
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit: ${challenge?.title}` : 'New Challenge'} className="max-w-2xl">
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
        <section className="flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
            01 · Identity &amp; Classification
          </p>
          <Input label="Title" error={errors.title?.message} {...register('title')} />
          <Input
            label="Short description (optional, shown in listings)"
            maxLength={160}
            {...register('shortDescription')}
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              Description
            </label>
            <textarea
              rows={4}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
              {...register('description')}
            />
            {errors.description && <p className="text-xs text-[var(--color-error)]">{errors.description.message}</p>}
          </div>

          <Input label="Tags (comma-separated, optional)" placeholder="pcap, dns, incident-response" {...register('tagsText')} />

          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" {...register('category')}>
              {CATEGORY_LIST.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select label="Difficulty" {...register('difficulty')}>
              {Object.entries(DIFFICULTY_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Points"
              type="number"
              error={errors.points?.message}
              {...register('points', { valueAsNumber: true })}
            />
            <Select label="Challenge type" {...register('type')}>
              {CHALLENGE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">02 · Flag</p>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={isEdit ? 'Replace flag (leave blank to keep current)' : 'Flag'}
              mono
              placeholder="CTF{...}"
              error={errors.flag?.message}
              {...register('flag')}
            />
            <Input label="Flag format (hint shown to players)" {...register('flagFormat')} />
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">03 · Resources</p>
          {isEdit && onUploadFile && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                Add file
              </label>
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] px-3.5 py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]">
                <Upload className="size-4" />
                Upload file
                <input type="file" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
                Hints
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="size-3.5" />}
                onClick={() => append({ title: '', content: '', cost: 0, order: fields.length, active: true })}
              >
                Add hint
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3">
                <div className="flex gap-2">
                  <Input placeholder="Hint title" {...register(`hints.${index}.title`)} />
                  <Input
                    type="number"
                    placeholder="Cost"
                    className="w-24"
                    {...register(`hints.${index}.cost`, { valueAsNumber: true })}
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    aria-label="Remove hint"
                    className="shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <textarea
                  rows={2}
                  placeholder="Hint content"
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
                  {...register(`hints.${index}.content`)}
                />
              </div>
            ))}
          </div>
        </section>

        {needsEnvironment && (
          <section className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">04 · Environment</p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Metadata only — no container is actually built or run by this deployment yet. See
              docs/challenges/interactive-challenges.md.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Port"
                type="number"
                {...register('environment.port', { valueAsNumber: true })}
              />
              <Select label="Protocol" {...register('environment.protocol')}>
                <option value="HTTP">HTTP</option>
                <option value="TCP">TCP</option>
                <option value="UDP">UDP</option>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="CPU limit"
                type="number"
                step="0.1"
                {...register('environment.cpuLimit', { valueAsNumber: true })}
              />
              <Input
                label="Memory (MB)"
                type="number"
                {...register('environment.memoryLimitMb', { valueAsNumber: true })}
              />
              <Input
                label="Timeout (s)"
                type="number"
                {...register('environment.timeoutSeconds', { valueAsNumber: true })}
              />
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
            05 · Prerequisite &amp; Publish
          </p>
          <Select label="Requires (optional)" {...register('prerequisite')}>
            <option value="">None — always unlocked</option>
            {allChallenges
              .filter((c) => c.published && c.id !== challenge?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </Select>

          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input type="checkbox" className="size-4 accent-[var(--color-accent)]" {...register('published')} />
            Published (visible to players)
          </label>

          {isEdit && challenge && (
            <a
              href={`/challenges/${challenge.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-accent)] hover:underline"
            >
              <ExternalLink className="size-3.5" />
              Preview as player
            </a>
          )}
        </section>

        <div className="mt-2 flex justify-end gap-3 border-t border-[var(--color-border)] pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create challenge'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
