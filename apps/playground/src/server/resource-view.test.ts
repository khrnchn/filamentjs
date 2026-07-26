import { describe, expect, it, beforeAll } from 'vitest';
import { vi } from 'vitest';
import { eq } from 'drizzle-orm';
import type { ResolvedEntry } from '@filamentjs/infolists';

const session: { user: { id: string; role: string } } = {
  user: { id: 'resource-view-test-admin', role: 'admin' },
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
import { posts, user } from '../db/schema.js';
import { getResourceView } from './resource-fns.js';

const AUTHOR_ID = 'resource-view-test-author';
let postId = '';

beforeAll(async () => {
  await db.delete(posts);
  await db.delete(user).where(eq(user.id, AUTHOR_ID));
  await db.insert(user).values({
    id: AUTHOR_ID,
    name: 'Ada Lovelace',
    email: 'ada@resource-view.test',
  });
  const inserted = await db
    .insert(posts)
    .values({
      title: 'Alpha guide',
      slug: 'alpha',
      body: 'Body copy',
      status: 'published',
      published: true,
      authorId: AUTHOR_ID,
    })
    .returning({ id: posts.id });
  postId = inserted[0]!.id;
});

describe('getResourceView against real Postgres', () => {
  it('resolves declared entries including relation dot paths', async () => {
    const view = await getResourceView({ data: { slug: 'posts', id: postId } });

    expect(view.title).toBe('Post');
    const flat: ResolvedEntry[] = [];
    const pending = [...view.spec];
    while (pending.length > 0) {
      const entry = pending.shift()!;
      if (entry.children) pending.push(...entry.children);
      else flat.push(entry);
    }

    expect(flat.find((e) => e.name === 'title')?.value).toBe('Alpha guide');
    expect(flat.find((e) => e.name === 'author.name')?.value).toBe('Ada Lovelace');
    expect(flat.find((e) => e.name === 'status')?.colors).toMatchObject({ published: expect.any(String) });
    expect(flat.find((e) => e.name === 'published')?.value).toBe(true);
  });

  it('falls back to the form fields when a resource declares no infolist', async () => {
    const view = await getResourceView({ data: { slug: 'users', id: AUTHOR_ID } });

    expect(view.title).toBe('User');
    expect(view.spec.map((e) => e.name)).toEqual(['name', 'email', 'role']);
    expect(view.spec.find((e) => e.name === 'name')?.value).toBe('Ada Lovelace');
  });

  it('refuses a resource the role gate denies', async () => {
    session.user = { id: 'resource-view-test-user', role: 'user' };
    await expect(getResourceView({ data: { slug: 'users', id: AUTHOR_ID } })).rejects.toThrow(
      'unauthorized',
    );
    session.user = { id: 'resource-view-test-admin', role: 'admin' };
  });
});
