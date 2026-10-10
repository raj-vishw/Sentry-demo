import { useState } from 'react';
import { FileText, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, Th, Td } from '@/components/ui/Table';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useUiStore } from '@/stores/uiStore';
import { useAdminPages, useCreatePage, useUpdatePage, useDeletePage } from './hooks/useAdmin';
import { PageFormModal, type PageFormValues } from './components/PageFormModal';
import { formatRelativeTime } from '@/lib/utils';
import type { AdminPage } from '@/types';

export function AdminPagesPage() {
  const { data, isLoading } = useAdminPages();
  const pushToast = useUiStore((s) => s.pushToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPage | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage();
  const deleteMutation = useDeletePage();

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(page: AdminPage) {
    setEditing(page);
    setModalOpen(true);
  }

  async function handleSubmit(input: PageFormValues) {
    if (editing) {
      await updateMutation.mutateAsync(
        { id: editing.id, input },
        {
          onSuccess: () => {
            pushToast({ title: 'Page updated', variant: 'success' });
            setModalOpen(false);
          },
          onError: () => pushToast({ title: 'Could not save page', variant: 'error' }),
        },
      );
    } else {
      await createMutation.mutateAsync(input, {
        onSuccess: () => {
          pushToast({ title: 'Page created', variant: 'success' });
          setModalOpen(false);
        },
        onError: () => pushToast({ title: 'Could not create page', variant: 'error' }),
      });
    }
  }

  return (
    <PageContainer className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Pages</h1>
          <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
            Custom markdown pages (rules, prizes, code of conduct...) — published at /pages/&lt;slug&gt;.
          </p>
        </div>
        <Button leftIcon={<Plus className="size-4" />} onClick={openCreate}>
          New Page
        </Button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.length ? (
        <div className="flex flex-col items-center gap-2 py-16 text-center text-[var(--color-text-muted)]">
          <FileText className="size-8" />
          <p className="text-sm">No custom pages yet.</p>
        </div>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <Th>Title</Th>
              <Th>Slug</Th>
              <Th>Updated</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </TableHead>
          <TableBody>
            {data.map((page) => (
              <TableRow key={page.id}>
                <Td className="font-medium text-[var(--color-text-primary)]">{page.title}</Td>
                <Td className="font-mono text-xs">{page.slug}</Td>
                <Td className="text-xs text-[var(--color-text-muted)]">{formatRelativeTime(page.updatedAt)}</Td>
                <Td>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => openEdit(page)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
                      aria-label={`Edit ${page.title}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(page.id)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-error)]"
                      aria-label={`Delete ${page.title}`}
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

      <PageFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        page={editing}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={() =>
          pendingDeleteId &&
          deleteMutation.mutate(pendingDeleteId, {
            onSuccess: () => {
              pushToast({ title: 'Page deleted', variant: 'info' });
              setPendingDeleteId(null);
            },
          })
        }
        title="Delete page"
        description="This permanently deletes the page. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </PageContainer>
  );
}
