import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { inArray } from 'drizzle-orm';

const session: { user: { id: string; role: string } } = {
  user: { id: 'relation-fns-test-admin', role: 'admin' },
};

vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => ({
    validator() {
      return this;
    },
    handler(handler: (input: { data: unknown }) => unknown) {
      return handler;
    },
  }),
}));
vi.mock('~/db/client', async () => import('../db/client.js'));
vi.mock('~/db/schema', async () => import('../db/schema.js'));
vi.mock('~/filament/panel', async () => import('../filament/panel.js'));
vi.mock('./session.js', () => ({ currentSession: async () => session }));

import { db } from '../db/client.js';
import { comments, posts } from '../db/schema.js';
import { panel } from '../filament/panel.js';
import { deleteRelated, listRelated, saveRelated } from './relation-fns.js';

const postIds: string[] = [];

beforeAll(async () => {
  const insertedPosts = await db
    .insert(posts)
    .values([
      {
        title: 'Relation parent A',
        slug: `relation-parent-a-${Date.now()}`,
        status: 'draft',
      },
      {
        title: 'Relation parent B',
        slug: `relation-parent-b-${Date.now()}`,
        status: 'draft',
      },
    ])
    .returning({ id: posts.id });
  postIds.push(...insertedPosts.map((post) => post.id));

  await db.insert(comments).values([
    { postId: postIds[0]!, author: 'Ada', body: 'First child' },
    { postId: postIds[0]!, author: 'Grace', body: 'Second child' },
    { postId: postIds[1]!, author: 'Linus', body: 'Other parent child' },
  ]);
});

afterAll(async () => {
  if (postIds.length > 0) await db.delete(posts).where(inArray(posts.id, postIds));
});

describe('relation server functions against real Postgres', () => {
  it("lists only the selected parent's children", async () => {
    const result = await listRelated({
      data: {
        slug: 'posts',
        id: postIds[0]!,
        relation: 'comments',
        params: { page: 1, pageSize: 10 },
      },
    });

    expect(result.title).toBe('Comments');
    expect(result.total).toBe(2);
    expect(result.rows.map((row) => row.body).sort()).toEqual([
      'First child',
      'Second child',
    ]);
    expect(result.permissions).toEqual([
      { update: true, delete: true },
      { update: true, delete: true },
    ]);
  });

  it('injects the parent foreign key when creating a child', async () => {
    const result = await saveRelated({
      data: {
        slug: 'posts',
        id: postIds[0]!,
        relation: 'comments',
        values: { author: 'Margaret', body: 'Created through relation', approved: true },
      },
    });

    expect(result.ok).toBe(true);
    const listed = await listRelated({
      data: {
        slug: 'posts',
        id: postIds[0]!,
        relation: 'comments',
        params: { page: 1, pageSize: 10 },
      },
    });
    expect(listed.rows).toContainEqual(
      expect.objectContaining({
        id: result.id,
        postId: postIds[0],
        author: 'Margaret',
        body: 'Created through relation',
        approved: true,
      }),
    );
  });

  it('refuses update and delete through a different parent id', async () => {
    const created = await saveRelated({
      data: {
        slug: 'posts',
        id: postIds[0]!,
        relation: 'comments',
        values: { author: 'Scoped', body: 'Belongs to A', approved: false },
      },
    });
    expect(created.ok).toBe(true);

    const update = await saveRelated({
      data: {
        slug: 'posts',
        id: postIds[1]!,
        relation: 'comments',
        childId: created.id,
        values: { author: 'Forged', body: 'Changed through B', approved: true },
      },
    });
    const deletion = await deleteRelated({
      data: {
        slug: 'posts',
        id: postIds[1]!,
        relation: 'comments',
        childId: created.id!,
      },
    });

    expect(update).toEqual({ ok: false, error: 'Related record not found' });
    expect(deletion).toEqual({ ok: false, error: 'Related record not found' });
    const listed = await listRelated({
      data: {
        slug: 'posts',
        id: postIds[0]!,
        relation: 'comments',
        params: { page: 1, pageSize: 10 },
      },
    });
    expect(listed.rows).toContainEqual(
      expect.objectContaining({
        id: created.id,
        author: 'Scoped',
        body: 'Belongs to A',
        approved: false,
      }),
    );
  });

  it("refuses every operation when the parent's update policy denies", async () => {
    const resource = panel.getResource('posts')!;
    const originalUpdate = resource.can.update;
    resource.can.update = () => false;

    try {
      await expect(
        listRelated({
          data: {
            slug: 'posts',
            id: postIds[0]!,
            relation: 'comments',
            params: { page: 1, pageSize: 10 },
          },
        }),
      ).rejects.toThrow('unauthorized');
      await expect(
        saveRelated({
          data: {
            slug: 'posts',
            id: postIds[0]!,
            relation: 'comments',
            values: { author: 'Denied', body: 'Denied', approved: false },
          },
        }),
      ).resolves.toEqual({ ok: false, error: 'unauthorized' });
      await expect(
        deleteRelated({
          data: {
            slug: 'posts',
            id: postIds[0]!,
            relation: 'comments',
            childId: '00000000-0000-0000-0000-000000000000',
          },
        }),
      ).resolves.toEqual({ ok: false, error: 'unauthorized' });
    } finally {
      resource.can.update = originalUpdate;
    }
  });
});
