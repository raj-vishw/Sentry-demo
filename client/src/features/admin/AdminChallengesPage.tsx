import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, Archive, ArchiveRestore, Download, Upload } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, Th, Td } from '@/components/ui/Table';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { adminService, type AdminChallengeDetail, type AdminChallengeInput } from '@/services/adminService';
import { CATEGORY_META, DIFFICULTY_META } from '@/lib/categories';
import { useUiStore } from '@/stores/uiStore';
import { ChallengeFormModal } from './components/ChallengeFormModal';
import { ChallengeImportModal } from './components/ChallengeImportModal';
import type { ChallengeStatus } from '@/types';

const STATUS_BADGE: Record<ChallengeStatus, 'success' | 'default' | 'warning'> = {
  PUBLISHED: 'success',
  DRAFT: 'default',
  ARCHIVED: 'warning',
};

const CHALLENGES_KEY = ['admin-challenges'];

export function AdminChallengesPage() {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const { data, isLoading } = useQuery({ queryKey: CHALLENGES_KEY, queryFn: adminService.getChallenges });

  const [modalOpen, setModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminChallengeDetail | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: CHALLENGES_KEY });
    queryClient.invalidateQueries({ queryKey: ['challenges'] });
  }

  const createMutation = useMutation({
    mutationFn: (input: AdminChallengeInput) => adminService.createChallenge(input),
    onSuccess: () => {
      invalidate();
      pushToast({ title: 'Challenge created', variant: 'success' });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AdminChallengeInput }) => adminService.updateChallenge(id, input),
    onSuccess: () => {
      invalidate();
      pushToast({ title: 'Challenge updated', variant: 'success' });
      setModalOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteChallenge(id),
    onSuccess: () => {
      invalidate();
      pushToast({ title: 'Challenge deleted', variant: 'info' });
      setPendingDeleteId(null);
    },
  });

  const publishMutation = useMutation({
    mutationFn: ({ id, published }: { id: string; published: boolean }) => adminService.setPublished(id, published),
    onSuccess: (_res, vars) => {
      invalidate();
      pushToast({ title: vars.published ? 'Challenge published' : 'Challenge unpublished', variant: 'info' });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => adminService.uploadChallengeFile(id, file),
    onSuccess: () => invalidate(),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => adminService.archiveChallenge(id),
    onSuccess: () => {
      invalidate();
      pushToast({ title: 'Challenge archived', variant: 'info' });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminService.restoreChallenge(id),
    onSuccess: () => {
      invalidate();
      pushToast({ title: 'Challenge restored to draft', variant: 'info' });
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ archive, flag }: { archive: File; flag: string }) => adminService.importChallenge(archive, flag),
    onSuccess: () => {
      invalidate();
      pushToast({ title: 'Challenge imported as draft', variant: 'success' });
      setImportModalOpen(false);
    },
  });

  async function handleExport(challenge: AdminChallengeDetail | { id: string; slug: string }) {
    setExportingId(challenge.id);
    try {
      await adminService.exportChallenge(challenge.id, `${challenge.slug}.zip`);
    } catch {
      pushToast({ title: 'Export failed', variant: 'error' });
    } finally {
      setExportingId(null);
    }
  }

  async function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  async function openEdit(id: string) {
    const detail = await adminService.getChallengeById(id);
    setEditing(detail);
    setModalOpen(true);
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Challenges
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Manage the challenge catalog.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" leftIcon={<Upload className="size-4" />} onClick={() => setImportModalOpen(true)}>
            Import
          </Button>
          <Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>
            New Challenge
          </Button>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <Table>
          <TableHead>
            <tr>
              <Th>Title</Th>
              <Th>Category</Th>
              <Th>Difficulty</Th>
              <Th className="text-right">Points</Th>
              <Th className="text-right">Solves</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </TableHead>
          <TableBody>
            {data?.map((challenge) => (
              <TableRow key={challenge.id}>
                <Td className="font-medium text-[var(--color-text-primary)]">{challenge.title}</Td>
                <Td>{CATEGORY_META[challenge.category].name}</Td>
                <Td style={{ color: DIFFICULTY_META[challenge.difficulty].color }}>
                  {DIFFICULTY_META[challenge.difficulty].label}
                </Td>
                <Td className="text-right font-mono">{challenge.points}</Td>
                <Td className="text-right">{challenge.solveCount}</Td>
                <Td>
                  <Badge variant={STATUS_BADGE[challenge.status]}>{challenge.status}</Badge>
                </Td>
                <Td>
                  <div className="flex justify-end gap-3">
                    {challenge.status === 'ARCHIVED' ? (
                      <button
                        onClick={() => restoreMutation.mutate(challenge.id)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                        aria-label={`Restore ${challenge.title} to draft`}
                        title="Restore to draft"
                      >
                        <ArchiveRestore className="size-4" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => publishMutation.mutate({ id: challenge.id, published: !challenge.published })}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                          aria-label={challenge.published ? `Unpublish ${challenge.title}` : `Publish ${challenge.title}`}
                          title={challenge.published ? 'Unpublish' : 'Publish'}
                        >
                          {challenge.published ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                        <button
                          onClick={() => archiveMutation.mutate(challenge.id)}
                          className="text-[var(--color-text-muted)] hover:text-[var(--color-warning)]"
                          aria-label={`Archive ${challenge.title}`}
                          title="Archive"
                        >
                          <Archive className="size-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleExport(challenge)}
                      disabled={exportingId === challenge.id}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)] disabled:opacity-50"
                      aria-label={`Export ${challenge.title}`}
                      title="Export as package"
                    >
                      <Download className="size-4" />
                    </button>
                    <button
                      onClick={() => openEdit(challenge.id)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                      aria-label={`Edit ${challenge.title}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(challenge.id)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                      aria-label={`Delete ${challenge.title}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </Td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <ChallengeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        challenge={editing}
        allChallenges={data ?? []}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (input) => {
          if (editing) {
            await updateMutation.mutateAsync({ id: editing.id, input });
          } else {
            await createMutation.mutateAsync(input);
          }
        }}
        onUploadFile={editing ? (file) => uploadMutation.mutateAsync({ id: editing.id, file }) : undefined}
      />

      <ChallengeImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        isSubmitting={importMutation.isPending}
        onImport={async (archive, flag) => {
          await importMutation.mutateAsync({ archive, flag });
        }}
      />

      <ConfirmDialog
        open={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() => pendingDeleteId && deleteMutation.mutate(pendingDeleteId)}
        title="Delete challenge"
        description="This permanently deletes the challenge and its hints. Submission history is kept for auditing. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
