import { useCallback, useEffect, useState } from 'react';
import { resolveColumnValue, type ColumnNode } from '@filamentjs/tables';
import { FormRenderer } from '~/filament/form-renderer';
import { useToast } from '~/components/toaster';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import {
  deleteRelated,
  listRelated,
  saveRelated,
  type RelationListResponse,
} from '~/server/relation-fns';
import type { FormCell } from '~/server/resource-fns';

interface RelationManagerTabsProps {
  resource: string;
  id: string;
  relations: Array<{ slug: string; title: string }>;
}

function renderCell(type: string, value: unknown) {
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'badge') return <Badge className="bg-muted">{String(value)}</Badge>;
  if (value instanceof Date) return value.toLocaleString();
  return value == null ? '' : String(value);
}

export function RelationManagerTabs({ resource, id, relations }: RelationManagerTabsProps) {
  const [active, setActive] = useState(relations[0]?.slug ?? '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RelationListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const toast = useToast();
  const pageSize = 5;

  const load = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    try {
      setData(
        await listRelated({
          data: {
            slug: resource,
            id,
            relation: active,
            params: { page, pageSize },
          },
        }),
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not load relation', 'error');
    } finally {
      setLoading(false);
    }
  }, [active, id, page, resource, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  if (relations.length === 0) return null;

  const selected =
    editingId == null
      ? undefined
      : (data?.rows.find((row) => String(row.id) === editingId) as
          | Record<string, unknown>
          | undefined);
  const lastPage = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  const submit = async (values: Record<string, unknown>) => {
    const result = await saveRelated({
      data: {
        slug: resource,
        id,
        relation: active,
        childId: editingId ?? undefined,
        values: values as Record<string, FormCell>,
      },
    });
    if (!result.ok) {
      setErrors(result.errors ?? {});
      if (result.error) toast(result.error, 'error');
      return;
    }
    toast(editingId ? 'Related record updated' : 'Related record created');
    setErrors({});
    setEditingId(undefined);
    await load();
  };

  const remove = async (childId: string) => {
    if (!window.confirm('Delete this related record?')) return;
    const result = await deleteRelated({
      data: { slug: resource, id, relation: active, childId },
    });
    if (!result.ok) {
      toast(result.error ?? 'Delete failed', 'error');
      return;
    }
    toast('Related record deleted');
    if (editingId === childId) setEditingId(undefined);
    await load();
  };

  return (
    <section className="mt-8 border-t pt-6">
      <div className="mb-4 flex gap-2 border-b" role="tablist">
        {relations.map((relation) => (
          <button
            key={relation.slug}
            type="button"
            role="tab"
            aria-selected={active === relation.slug}
            onClick={() => {
              setActive(relation.slug);
              setPage(1);
              setData(null);
              setEditingId(undefined);
              setErrors({});
            }}
            className={
              active === relation.slug
                ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium'
                : 'px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {relation.title}
          </button>
        ))}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {relations.find((relation) => relation.slug === active)?.title}
        </h2>
        {data?.form.length ? (
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setEditingId(null);
              setErrors({});
            }}
          >
            Create
          </Button>
        ) : null}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {data?.spec.columns.map((column) => (
                <TableHead key={column.name}>{column.label}</TableHead>
              ))}
              {(data?.spec.actions.length ?? 0) > 0 ? <TableHead>Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={(data?.spec.columns.length ?? 0) + 1}>Loading...</TableCell>
              </TableRow>
            ) : !data || data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={(data?.spec.columns.length ?? 0) + 1}
                  className="py-8 text-center"
                >
                  {data?.spec.emptyState?.heading ?? 'No related records found.'}
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => {
                const childId = String(row.id);
                return (
                  <TableRow key={childId}>
                    {data.spec.columns.map((column) => (
                      <TableCell key={column.name}>
                        {renderCell(
                          column.type,
                          resolveColumnValue(row, column as ColumnNode),
                        )}
                      </TableCell>
                    ))}
                    {data.spec.actions.length > 0 ? (
                      <TableCell>
                        <div className="flex gap-3">
                          {data.spec.actions.map((action) =>
                            action.type === 'edit' ? (
                              <button
                                key={action.name}
                                type="button"
                                className="text-sm hover:underline"
                                onClick={() => {
                                  setEditingId(childId);
                                  setErrors({});
                                }}
                              >
                                {action.label ?? 'Edit'}
                              </button>
                            ) : action.type === 'delete' ? (
                              <button
                                key={action.name}
                                type="button"
                                className="text-sm text-destructive hover:underline"
                                onClick={() => void remove(childId)}
                              >
                                {action.label ?? 'Delete'}
                              </button>
                            ) : null,
                          )}
                        </div>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {data && lastPage > 1 ? (
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {data.total} total, page {page} of {lastPage}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= lastPage}
              onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {data && editingId !== undefined ? (
        <div className="mt-4 rounded-md border p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-medium">{editingId ? 'Edit related record' : 'Create related record'}</h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setEditingId(undefined)}
            >
              Cancel
            </Button>
          </div>
          <FormRenderer
            key={`${active}:${editingId ?? 'new'}`}
            spec={data.form}
            initialValues={selected ?? data.values}
            errors={errors}
            onSubmit={submit}
          />
        </div>
      ) : null}
    </section>
  );
}
