import { describe, it, expect, beforeAll } from 'vitest';
import { buildTable, t } from '@filamentjs/tables';
import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { posts, user } from '../db/schema.js';
import { resolveQuery } from './resolve-query.js';

const config = buildTable({
  columns: [t.text('title').sortable().searchable(), t.text('status'), t.boolean('published')],
  filters: [
    t.select('status').options({ draft: 'Draft', published: 'Published' }),
    t.ternary('published'),
  ],
});

// Relation columns are read-only: marking one sortable/searchable must not push it
// into the SQL, since only top-level columns exist on the queried table.
const relationConfig = buildTable({
  columns: [
    t.text('title').sortable().searchable(),
    t.text('author.name').sortable().searchable(),
  ],
});

const AUTHOR_ID = 'resolve-query-test-author';

beforeAll(async () => {
  await db.delete(posts);
  await db.delete(user).where(eq(user.id, AUTHOR_ID));
  await db.insert(user).values({
    id: AUTHOR_ID,
    name: 'Ada Lovelace',
    email: 'ada@resolve-query.test',
  });
  await db.insert(posts).values([
    {
      title: 'Alpha guide',
      slug: 'alpha',
      status: 'published',
      published: true,
      authorId: AUTHOR_ID,
    },
    { title: 'Beta guide', slug: 'beta', status: 'draft', published: false },
    { title: 'Gamma notes', slug: 'gamma', status: 'published', published: true },
    { title: 'Delta notes', slug: 'delta', status: 'draft', published: false },
  ]);
});

const base = { page: 1, pageSize: 10 } as const;

describe('resolveQuery against real Postgres', () => {
  it('returns all rows with total when unfiltered', async () => {
    const res = await resolveQuery(posts, config, { ...base });
    expect(res.total).toBe(4);
    expect(res.rows).toHaveLength(4);
  });

  it('searches searchable columns case-insensitively', async () => {
    const res = await resolveQuery(posts, config, { ...base, search: 'guide' });
    expect(res.total).toBe(2);
    expect((res.rows as Array<{ title: string }>).map((r) => r.title).sort()).toEqual([
      'Alpha guide',
      'Beta guide',
    ]);
  });

  it('applies a select filter', async () => {
    const res = await resolveQuery(posts, config, { ...base, filters: { status: 'draft' } });
    expect(res.total).toBe(2);
  });

  it('applies a ternary filter (true)', async () => {
    const res = await resolveQuery(posts, config, { ...base, filters: { published: 'true' } });
    expect(res.total).toBe(2);
  });

  it('narrows results with a per-column search', async () => {
    const res = await resolveQuery(posts, config, { ...base, columnSearches: { title: 'alpha' } });
    expect(res.total).toBe(1);
    expect((res.rows as Array<{ title: string }>)[0]!.title).toBe('Alpha guide');
  });

  it('ands per-column searches together with the global search', async () => {
    const res = await resolveQuery(posts, config, {
      ...base,
      search: 'guide',
      columnSearches: { title: 'beta' },
    });
    expect(res.total).toBe(1);
    expect((res.rows as Array<{ title: string }>)[0]!.title).toBe('Beta guide');
  });

  it('ignores a per-column search on an unknown or non-searchable column', async () => {
    const unknown = await resolveQuery(posts, config, { ...base, columnSearches: { nope: 'x' } });
    expect(unknown.total).toBe(4);
    const notSearchable = await resolveQuery(posts, config, {
      ...base,
      columnSearches: { status: 'draft' },
    });
    expect(notSearchable.total).toBe(4);
  });

  it('sorts and paginates', async () => {
    const res = await resolveQuery(posts, config, {
      ...base,
      sort: 'title',
      dir: 'asc',
      pageSize: 2,
      page: 1,
    });
    expect(res.total).toBe(4);
    expect((res.rows as Array<{ title: string }>).map((r) => r.title)).toEqual([
      'Alpha guide',
      'Beta guide',
    ]);
  });

  it('reads the second page', async () => {
    const res = await resolveQuery(posts, config, {
      ...base,
      sort: 'title',
      dir: 'asc',
      pageSize: 2,
      page: 2,
    });
    expect((res.rows as Array<{ title: string }>).map((r) => r.title)).toEqual([
      'Delta notes',
      'Gamma notes',
    ]);
  });
});

describe('resolveQuery summaries', () => {
  const summaryConfig = buildTable({
    columns: [t.text('title').searchable(), t.text('status').summarize('count')],
    filters: [t.select('status').options({ draft: 'Draft', published: 'Published' })],
  });

  it('aggregates over the whole filtered set, not just the page', async () => {
    const res = await resolveQuery(posts, summaryConfig, { ...base, pageSize: 1 });
    expect(res.rows).toHaveLength(1);
    expect(res.summaries).toEqual({ status: 4 });
  });

  it('respects the active filters', async () => {
    const res = await resolveQuery(posts, summaryConfig, {
      ...base,
      filters: { status: 'draft' },
    });
    expect(res.summaries).toEqual({ status: 2 });
  });

  it('omits summaries when no column asks for one', async () => {
    const res = await resolveQuery(posts, config, { ...base });
    expect(res.summaries).toBeUndefined();
  });
});

describe('resolveQuery with dot-path relation columns', () => {
  it('loads the related record for a dot-path column', async () => {
    const res = await resolveQuery(posts, relationConfig, {
      ...base,
      sort: 'title',
      dir: 'asc',
    });
    const rows = res.rows as Array<{ title: string; author: { name: string } | null }>;
    expect(res.total).toBe(4);
    expect(rows.map((r) => r.title)).toEqual([
      'Alpha guide',
      'Beta guide',
      'Delta notes',
      'Gamma notes',
    ]);
    expect(rows[0]!.author).toEqual({ name: 'Ada Lovelace' });
    expect(rows[1]!.author).toBeNull();
  });

  it('ignores a relation column when searching', async () => {
    const res = await resolveQuery(posts, relationConfig, { ...base, search: 'Ada' });
    expect(res.total).toBe(0);
    expect(res.rows).toHaveLength(0);
  });

  it('ignores a per-column search on a relation column', async () => {
    const res = await resolveQuery(posts, relationConfig, {
      ...base,
      columnSearches: { 'author.name': 'Ada' },
    });
    expect(res.total).toBe(4);
  });

  it('ignores a sort on a relation column', async () => {
    const res = await resolveQuery(posts, relationConfig, {
      ...base,
      sort: 'author.name',
      dir: 'desc',
    });
    expect(res.total).toBe(4);
    expect(res.rows).toHaveLength(4);
  });
});
