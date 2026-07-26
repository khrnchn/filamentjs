import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { resolveColumnValue, type ColumnNode } from '@filamentjs/tables';
import { useToast } from '~/components/toaster';
import { deleteResource, deleteResources, listResource } from '~/server/resource-fns';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

type ResourceSearch = {
  search?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  page: number;
  perPage?: number;
} & Record<string, string | number | undefined>;

const DEFAULT_PAGE_SIZE = 10;

export const Route = createFileRoute('/admin/$resource')({
  validateSearch: (search: Record<string, unknown>): ResourceSearch => {
    const parsed: ResourceSearch = {
      search: typeof search.search === 'string' && search.search ? search.search : undefined,
      sort: typeof search.sort === 'string' && search.sort ? search.sort : undefined,
      dir: search.dir === 'desc' ? 'desc' : search.dir === 'asc' ? 'asc' : undefined,
      page: Number(search.page) > 0 ? Number(search.page) : 1,
      perPage: Number(search.perPage) > 0 ? Number(search.perPage) : DEFAULT_PAGE_SIZE,
    };

    // The router parses "true" and "1" into a boolean or number, so filter values are
    // normalized back to strings rather than dropped for not being strings already.
    for (const [key, value] of Object.entries(search)) {
      if (!key.startsWith('filter_') && !key.startsWith('col_')) continue;
      if (value === undefined || value === null || value === '') continue;
      parsed[key] = String(value);
    }

    return parsed;
  },
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) => {
    const filters: Record<string, unknown> = Object.create(null);
    const columnSearches: Record<string, string> = Object.create(null);
    for (const [key, value] of Object.entries(deps)) {
      if (value === undefined) continue;
      if (key.startsWith('filter_')) filters[key.slice('filter_'.length)] = String(value);
      if (key.startsWith('col_')) columnSearches[key.slice('col_'.length)] = String(value);
    }

    return listResource({
      data: {
        slug: params.resource,
        params: {
          search: deps.search,
          sort: deps.sort,
          dir: deps.dir,
          filters,
          columnSearches,
          page: deps.page,
          pageSize: deps.perPage ?? DEFAULT_PAGE_SIZE,
        },
      },
    });
  },
  component: ResourceList,
});

function renderCell(type: string, value: unknown) {
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'badge') return <Badge className="bg-muted">{String(value)}</Badge>;
  return value == null ? '' : String(value);
}

function ResourceList() {
  const { resource } = Route.useParams();
  const { title, spec, rows, permissions, total } = Route.useLoaderData();
  const searchParams = Route.useSearch();
  const { search, sort, dir, page } = searchParams;
  const perPage = searchParams.perPage ?? DEFAULT_PAGE_SIZE;
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const hasBulkActions = spec.bulkActions.length > 0;
  const hasBulkDelete = spec.bulkActions.some((action) => action.type === 'deleteBulk');
  const selectableIds = (rows as Array<Record<string, unknown>>)
    .map((row, index) => ({
      id: String(row.id),
      permitted: !hasBulkDelete || permissions[index]?.delete,
    }))
    .filter((row) => row.permitted)
    .map((row) => row.id);
  const allPageSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const activeFilters = spec.filters.flatMap((filter) => {
    const value = searchParams[`filter_${filter.name}`];
    return typeof value === 'string' && value ? [{ filter, value }] : [];
  });

  useEffect(() => {
    setSelected(new Set());
  }, [rows]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selected.size > 0 && !allPageSelected;
    }
  }, [allPageSelected, selected.size]);

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get('search');
    navigate({
      search: (previous) => ({
        ...previous,
        search: String(value) || undefined,
        page: 1,
      }),
    });
  };

  const onColumnSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    navigate({
      search: (previous) => {
        const next: ResourceSearch = { ...previous, page: 1 };
        for (const column of spec.columns.filter((candidate) => candidate.searchable)) {
          const value = String(data.get(`col_${column.name}`) ?? '');
          next[`col_${column.name}`] = value || undefined;
        }
        return next;
      },
    });
  };

  const onDelete = async (id: string, requiresConfirmation?: boolean) => {
    if (requiresConfirmation && !window.confirm('Delete this record?')) return;
    setDeleting(id);
    try {
      const result = await deleteResource({ data: { slug: resource, id } });
      if (!result.ok) {
        toast(result.error ?? 'Delete failed', 'error');
        return;
      }
      toast('Deleted');
      await router.invalidate();
    } finally {
      setDeleting(null);
    }
  };

  const onBulkDelete = async () => {
    const ids = [...selected];
    if (!window.confirm(`Delete ${ids.length} selected record${ids.length === 1 ? '' : 's'}?`)) {
      return;
    }
    setDeleting('bulk');
    try {
      const result = await deleteResources({ data: { slug: resource, ids } });
      if (!result.ok) {
        toast(result.error ?? 'Bulk delete failed', 'error');
        return;
      }
      if (result.deleted === ids.length) {
        toast(`Deleted ${result.deleted} record${result.deleted === 1 ? '' : 's'}`);
      } else {
        toast(`Deleted ${result.deleted} of ${ids.length} selected records`);
      }
      setSelected(new Set());
      await router.invalidate();
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex gap-2">
          {spec.headerActions.map((action) =>
            action.type === 'create' ? (
              <Link key={action.name} to="/admin/$resource/new" params={{ resource }}>
                <Button>{action.label ?? action.name[0]!.toUpperCase() + action.name.slice(1)}</Button>
              </Link>
            ) : (
              <Button key={action.name} disabled>
                {action.label ?? action.name}
              </Button>
            ),
          )}
        </div>
      </div>

      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <Input
          name="search"
          defaultValue={search ?? ''}
          placeholder="Search..."
          className="max-w-xs"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {spec.filters.length > 0 && (
        <div className="mb-4 space-y-3 rounded-md border p-4">
          <div className="flex flex-wrap gap-3">
            {spec.filters.map((filter) => {
              const key = `filter_${filter.name}`;
              const value = searchParams[key];
              return (
                <label key={filter.name} className="grid min-w-44 gap-1 text-sm">
                  <span className="font-medium">{filter.label}</span>
                  <select
                    name={key}
                    value={typeof value === 'string' ? value : ''}
                    onChange={(event) =>
                      navigate({
                        search: (previous) => ({
                          ...previous,
                          [key]: event.target.value || undefined,
                          page: 1,
                        }),
                      })
                    }
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">All</option>
                    {filter.type === 'ternary' ? (
                      <>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                        <option value="blank">Blank</option>
                      </>
                    ) : (
                      Object.entries(filter.options ?? {}).map(([optionValue, label]) => (
                        <option key={optionValue} value={optionValue}>
                          {label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              );
            })}
          </div>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2" aria-label="Active filters">
              {activeFilters.map(({ filter, value }) => {
                const label =
                  filter.type === 'ternary'
                    ? ({ true: 'Yes', false: 'No', blank: 'Blank' }[value] ?? value)
                    : (filter.options?.[value] ?? value);
                return (
                  <button
                    key={filter.name}
                    type="button"
                    onClick={() =>
                      navigate({
                        search: (previous) => ({
                          ...previous,
                          [`filter_${filter.name}`]: undefined,
                          page: 1,
                        }),
                      })
                    }
                    className="rounded-full border bg-muted px-3 py-1 text-xs hover:bg-muted/70"
                  >
                    {filter.label}: {label} ×
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {spec.columns.some((column) => column.searchable) && (
        <form onSubmit={onColumnSearch} className="mb-4 flex flex-wrap items-end gap-3">
          {spec.columns
            .filter((column) => column.searchable)
            .map((column) => (
              <label key={column.name} className="grid min-w-44 gap-1 text-sm">
                <span className="font-medium">{column.label}</span>
                <Input
                  name={`col_${column.name}`}
                  defaultValue={String(searchParams[`col_${column.name}`] ?? '')}
                  placeholder={`Search ${column.label.toLowerCase()}`}
                />
              </label>
            ))}
          <Button type="submit" variant="outline">
            Apply column searches
          </Button>
        </form>
      )}

      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-md border bg-muted/40 px-4 py-2">
          <span className="text-sm font-medium">
            {selected.size} record{selected.size === 1 ? '' : 's'} selected
          </span>
          <div className="flex gap-2">
            {spec.bulkActions.map((action) =>
              action.type === 'deleteBulk' ? (
                <Button
                  key={action.name}
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleting === 'bulk'}
                  onClick={onBulkDelete}
                >
                  {deleting === 'bulk'
                    ? 'Deleting...'
                    : (action.label ?? action.name[0]!.toUpperCase() + action.name.slice(1))}
                </Button>
              ) : (
                <Button key={action.name} type="button" size="sm" disabled>
                  {action.label ?? action.name}
                </Button>
              ),
            )}
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {hasBulkActions && (
                <TableHead className="w-10">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    aria-label="Select all records on this page"
                    checked={allPageSelected}
                    disabled={selectableIds.length === 0}
                    onChange={(event) =>
                      setSelected((previous) => {
                        const next = new Set(previous);
                        for (const id of selectableIds) {
                          if (event.target.checked) next.add(id);
                          else next.delete(id);
                        }
                        return next;
                      })
                    }
                  />
                </TableHead>
              )}
              {spec.columns.map((column) => (
                <TableHead key={column.name}>
                  {column.sortable ? (
                    <Link
                      to={Route.fullPath}
                      params={{ resource }}
                      search={(previous) => ({
                        ...previous,
                        sort: column.name,
                        dir: sort === column.name && dir === 'asc' ? 'desc' : 'asc',
                        page: 1,
                      })}
                      className="hover:underline"
                    >
                      {column.label}
                      {sort === column.name ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </Link>
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
              {spec.actions.length > 0 && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={spec.columns.length + (hasBulkActions ? 1 : 0) + (spec.actions.length ? 1 : 0)}
                  className="text-center text-muted-foreground"
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              (rows as Array<Record<string, unknown>>).map((row, index) => {
                const id = String(row.id);
                const permission = permissions[index];
                return (
                  <TableRow key={id}>
                    {hasBulkActions && (
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select record ${id}`}
                          checked={selected.has(id)}
                          disabled={hasBulkDelete && !permission?.delete}
                          onChange={(event) =>
                            setSelected((previous) => {
                              const next = new Set(previous);
                              if (event.target.checked) next.add(id);
                              else next.delete(id);
                              return next;
                            })
                          }
                        />
                      </TableCell>
                    )}
                    {spec.columns.map((column) => (
                      <TableCell key={column.name}>
                        {renderCell(
                          column.type,
                          resolveColumnValue(row, column as ColumnNode),
                        )}
                      </TableCell>
                    ))}
                    {spec.actions.length > 0 && (
                      <TableCell>
                        <div className="flex gap-3">
                          {spec.actions.map((action) => {
                            const label =
                              action.label ??
                              action.name[0]!.toUpperCase() + action.name.slice(1);
                            if (action.type === 'view') {
                              return (
                                <Link
                                  key={action.name}
                                  to="/admin/$resource/$id"
                                  params={{ resource, id }}
                                  className="text-sm hover:underline"
                                >
                                  {label}
                                </Link>
                              );
                            }
                            if (action.type === 'edit') {
                              return permission?.update ? (
                                <Link
                                  key={action.name}
                                  to="/admin/$resource/$id/edit"
                                  params={{ resource, id }}
                                  className="text-sm hover:underline"
                                >
                                  {label}
                                </Link>
                              ) : null;
                            }
                            if (action.type === 'delete') {
                              return permission?.delete ? (
                                <button
                                  key={action.name}
                                  type="button"
                                  onClick={() => onDelete(id, action.requiresConfirmation)}
                                  disabled={deleting === id}
                                  className="text-sm text-destructive hover:underline disabled:opacity-50"
                                >
                                  {deleting === id ? 'Deleting...' : label}
                                </button>
                              ) : null;
                            }
                            return (
                              <button key={action.name} type="button" className="text-sm" disabled>
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} total, page {page} of {lastPage}
        </span>
        <div className="flex gap-2">
          <Link
            to={Route.fullPath}
            params={{ resource }}
            search={(previous) => ({ ...previous, page: Math.max(1, page - 1) })}
          >
            <Button variant="outline" size="sm" disabled={page <= 1}>
              Previous
            </Button>
          </Link>
          <Link
            to={Route.fullPath}
            params={{ resource }}
            search={(previous) => ({
              ...previous,
              page: Math.min(lastPage, page + 1),
            })}
          >
            <Button variant="outline" size="sm" disabled={page >= lastPage}>
              Next
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
