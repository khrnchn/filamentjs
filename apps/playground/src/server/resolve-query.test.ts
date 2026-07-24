import { describe, it, expect, beforeAll } from 'vitest';
import { buildTable, t } from '@filamentjs/tables';
import { db } from '../db/client.js';
import { posts } from '../db/schema.js';
import { resolveQuery } from './resolve-query.js';

const config = buildTable({
  columns: [t.text('title').sortable().searchable(), t.text('status'), t.boolean('published')],
  filters: [
    t.select('status').options({ draft: 'Draft', published: 'Published' }),
    t.ternary('published'),
  ],
});

beforeAll(async () => {
  await db.delete(posts);
  await db.insert(posts).values([
    { title: 'Alpha guide', slug: 'alpha', status: 'published', published: true },
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
