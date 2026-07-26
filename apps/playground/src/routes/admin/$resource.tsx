import { createFileRoute, Link, useNavigate, useRouter } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { resolveColumnValue, type ColumnNode } from '@filamentjs/tables';
import { listResource } from '~/server/resource-fns';
import { deleteResource } from '~/server/resource-fns';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

interface ResourceSearch {
  search?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  page: number;
}

const PAGE_SIZE = 10;

export const Route = createFileRoute('/admin/$resource')({
  validateSearch: (s: Record<string, unknown>): ResourceSearch => ({
    search: typeof s.search === 'string' && s.search ? s.search : undefined,
    sort: typeof s.sort === 'string' ? s.sort : undefined,
    dir: s.dir === 'desc' ? 'desc' : s.dir === 'asc' ? 'asc' : undefined,
    page: Number(s.page) > 0 ? Number(s.page) : 1,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ params, deps }) =>
    listResource({
      data: {
        slug: params.resource,
        params: {
          search: deps.search,
          sort: deps.sort,
          dir: deps.dir,
          page: deps.page,
          pageSize: PAGE_SIZE,
        },
      },
    }),
  component: ResourceList,
});

function renderCell(type: string, value: unknown) {
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'badge') return <Badge className="bg-muted">{String(value)}</Badge>;
  return value == null ? '' : String(value);
}

function ResourceList() {
  const { resource } = Route.useParams();
  const { title, spec, rows, total } = Route.useLoaderData();
  const { search, sort, dir, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const router = useRouter();
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('search');
    navigate({ search: (prev) => ({ ...prev, search: String(value) || undefined, page: 1 }) });
  };

  const onDelete = async (id: string) => {
    await deleteResource({ data: { slug: resource, id } });
    router.invalidate();
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Link to="/admin/$resource/new" params={{ resource }}>
          <Button>New</Button>
        </Link>
      </div>

      <form onSubmit={onSearch} className="mb-4 flex gap-2">
        <Input name="search" defaultValue={search ?? ''} placeholder="Search..." className="max-w-xs" />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {spec.columns.map((col) => (
                <TableHead key={col.name}>
                  {col.sortable ? (
                    <Link
                      to={Route.fullPath}
                      params={{ resource }}
                      search={(prev) => ({
                        ...prev,
                        sort: col.name,
                        dir: sort === col.name && dir === 'asc' ? 'desc' : 'asc',
                        page: 1,
                      })}
                      className="hover:underline"
                    >
                      {col.label}
                      {sort === col.name ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </Link>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={spec.columns.length + 1} className="text-center text-muted-foreground">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              (rows as Array<Record<string, unknown>>).map((row, i) => (
                <TableRow key={i}>
                  {spec.columns.map((col) => (
                    <TableCell key={col.name}>
                      {/* ColumnSpec widens `type` to string for serialization; the resolver
                          only reads `name`/`accessor`, so it is safe to narrow back. */}
                      {renderCell(col.type, resolveColumnValue(row, col as ColumnNode))}
                    </TableCell>
                  ))}
                  <TableCell className="flex gap-3">
                    <Link
                      to="/admin/$resource/$id/edit"
                      params={{ resource, id: String(row.id) }}
                      className="text-sm hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDelete(String(row.id))}
                      className="text-sm text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total} total, page {page} of {lastPage}
        </span>
        <div className="flex gap-2">
          <Link to={Route.fullPath} params={{ resource }} search={(p) => ({ ...p, page: Math.max(1, page - 1) })}>
            <Button variant="outline" size="sm" disabled={page <= 1}>Previous</Button>
          </Link>
          <Link to={Route.fullPath} params={{ resource }} search={(p) => ({ ...p, page: Math.min(lastPage, page + 1) })}>
            <Button variant="outline" size="sm" disabled={page >= lastPage}>Next</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
