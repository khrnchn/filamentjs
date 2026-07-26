import { describe, expect, it, beforeAll, vi } from 'vitest';
import { eq } from 'drizzle-orm';

// The handler is invoked directly rather than over HTTP, so the server-fn wrapper and
// the request-scoped session are stubbed. The database is the real one.
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
vi.mock('./session.js', () => ({
  currentSession: async () => ({ user: { id: SESSION_USER_ID, role: 'admin' } }),
}));

const SESSION_USER_ID = 'resolve-form-test-user';

import { db } from '../db/client.js';
import { user } from '../db/schema.js';
import { resolveForm } from './resource-fns.js';

beforeAll(async () => {
  await db.delete(user).where(eq(user.id, SESSION_USER_ID));
  await db.insert(user).values({
    id: SESSION_USER_ID,
    name: 'Resolve Form Tester',
    email: 'resolve-form@test.local',
  });
});

describe('resolveForm against real Postgres', () => {
  it('re-resolves dependent visibility from the posted values', async () => {
    const draft = await resolveForm({ data: { slug: 'posts', values: { status: 'draft' } } });
    const published = await resolveForm({ data: { slug: 'posts', values: { status: 'published' } } });

    expect(draft.spec.find((node) => node.name === 'body')?.visible).toBe(true);
    expect(published.spec.find((node) => node.name === 'body')?.visible).toBe(false);
  });

  it('marks the driving field live so the client knows to round trip', async () => {
    const { spec } = await resolveForm({ data: { slug: 'posts', values: { status: 'draft' } } });
    expect(spec.find((node) => node.name === 'status')?.live).toBe(true);
  });

  it('loads relation options from the database on every re-resolve', async () => {
    const { spec } = await resolveForm({ data: { slug: 'posts', values: { status: 'draft' } } });
    const options = spec.find((node) => node.name === 'authorId')?.options ?? {};
    expect(options[SESSION_USER_ID]).toBe('Resolve Form Tester');
  });
});
