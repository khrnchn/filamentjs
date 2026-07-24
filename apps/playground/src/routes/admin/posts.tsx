import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import type { FormEvent } from 'react';
import { listPosts } from '~/server/list-posts';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table';
import { Input } from '~/components/ui/input';
import { Button } from '~/components/ui/button';
import { Badge } from '~/components/ui/badge';

interface PostsSearch {
  search?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
  page: number;
}

const PAGE_SIZE = 10;

export const Route = createFileRoute('/admin/posts')({
  validateSearch: (s: Record<string, unknown>): PostsSearch => ({
    search: typeof s.search === 'string' && s.search ? s.search : undefined,
    sort: typeof s.sort === 'string' ? s.sort : undefined,
    dir: s.dir === 'desc' ? 'desc' : s.dir === 'asc' ? 'asc' : undefined,
    page: Number(s.page) > 0 ? Number(s.page) : 1,
  }),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    listPosts({
      data: {
        search: deps.search,
        sort: deps.sort,
        dir: deps.dir,
        page: deps.page,
        pageSize: PAGE_SIZE,
      },
    }),
  component: PostsList,
});

function renderCell(type: string, value: unknown, colors?: Record<string, string>) {
  if (type === 'boolean') return value ? 'Yes' : 'No';
  if (type === 'badge') {
    const key = String(value);
    return <Badge className={colors?.[key] ? `bg-muted` : ''}>{key}</Badge>;
  }
  return value == null ? '' : String(value);
}

function PostsList() {
  const { spec, rows, total } = Route.useLoaderData();
  const { search, sort, dir, page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const onSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = new FormData(e.currentTarget).get('search');
    navigate({ search: (prev) => ({ ...prev, search: String(value) || undefined, page: 1 }) });
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Posts</h1>
        <Link to="/admin/posts/new">
          <Button>New post</Button>
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
                  No posts found.
                </TableCell>
              </TableRow>
            ) : (
              (rows as Array<Record<string, unknown>>).map((row, i) => (
                <TableRow key={i}>
                  {spec.columns.map((col) => (
                    <TableCell key={col.name}>{renderCell(col.type, row[col.name], col.colors)}</TableCell>
                  ))}
                  <TableCell>
                    <Link
                      to="/admin/posts/$id/edit"
                      params={{ id: String(row.id) }}
                      className="text-sm hover:underline"
                    >
                      Edit
                    </Link>
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
          <Link to={Route.fullPath} search={(p) => ({ ...p, page: Math.max(1, page - 1) })}>
            <Button variant="outline" size="sm" disabled={page <= 1}>Previous</Button>
          </Link>
          <Link to={Route.fullPath} search={(p) => ({ ...p, page: Math.min(lastPage, page + 1) })}>
            <Button variant="outline" size="sm" disabled={page >= lastPage}>Next</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
