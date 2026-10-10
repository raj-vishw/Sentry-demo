import { useState } from 'react';
import { Layers, Pencil } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { DataTable, type DataTableColumn } from '@/components/ui/DataTable';
import { useAdminCategories, useUpdateCategory } from './hooks/useAdmin';
import type { AdminCategory } from '@/types';

function EditCategoryModal({ category, onClose }: { category: AdminCategory | null; onClose: () => void }) {
  const updateCategory = useUpdateCategory();
  const [form, setForm] = useState(() => ({
    name: category?.name ?? '',
    description: category?.description ?? '',
    icon: category?.icon ?? '',
    active: category?.active ?? true,
  }));

  if (!category) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateCategory.mutate({ slug: category!.slug, input: form }, { onSuccess: onClose });
  }

  return (
    <Modal open onClose={onClose} title={`Edit "${category.slug}"`}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Display name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
        <Input
          label="Description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <Input
          label="Icon (lucide name)"
          value={form.icon}
          onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
          hint="e.g. globe, key, terminal"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            className="size-4 rounded border-[var(--color-border-strong)]"
          />
          Active (visible to players)
        </label>
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={updateCategory.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function AdminCategoriesPage() {
  const { data, isLoading, isError, refetch } = useAdminCategories();
  const [editing, setEditing] = useState<AdminCategory | null>(null);

  const columns: DataTableColumn<AdminCategory>[] = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium text-[var(--color-text-primary)]">{c.name}</span> },
    { key: 'slug', header: 'Slug', render: (c) => <span className="font-mono">{c.slug}</span> },
    { key: 'description', header: 'Description', render: (c) => <span className="text-xs">{c.description || '—'}</span> },
    { key: 'icon', header: 'Icon', render: (c) => <span className="font-mono text-xs">{c.icon}</span> },
    {
      key: 'active',
      header: 'Status',
      render: (c) => <Badge variant={c.active ? 'success' : 'default'}>{c.active ? 'Active' : 'Hidden'}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (c) => (
        <Button variant="ghost" size="sm" leftIcon={<Pencil className="size-3.5" />} onClick={() => setEditing(c)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <PageContainer className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">Categories</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Manage display metadata for the platform's 8 challenge categories. The category set itself is fixed —
          this edits how each one is presented, not which ones exist.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={data ?? []}
        rowKey={(c) => c.slug}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyIcon={Layers}
        emptyTitle="No categories found"
      />

      <EditCategoryModal category={editing} onClose={() => setEditing(null)} />
    </PageContainer>
  );
}
