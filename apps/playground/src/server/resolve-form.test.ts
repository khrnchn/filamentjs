import { describe, expect, it, vi } from 'vitest';

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
vi.mock('~/db/client', () => ({
  db: {
    select: () => ({
      from: () => ({
        orderBy: () => ({
          limit: async () => [{ value: 'author-1', label: 'Ada Lovelace' }],
        }),
      }),
    }),
  },
}));
vi.mock('~/db/schema', async () => import('../db/schema.js'));
vi.mock('~/filament/panel', async () => import('../filament/panel.js'));
vi.mock('./session.js', () => ({
  currentSession: async () => ({
    user: { id: 'resolve-form-test-user', role: 'admin' },
  }),
}));

import { resolveForm } from './resource-fns.js';

describe('resolveForm', () => {
  it('re-resolves dependent visibility while preserving relation options', async () => {
    const draft = await resolveForm({
      data: { slug: 'posts', values: { status: 'draft' } },
    });
    const published = await resolveForm({
      data: { slug: 'posts', values: { status: 'published' } },
    });

    expect(draft.spec.find((node) => node.name === 'body')?.visible).toBe(true);
    expect(published.spec.find((node) => node.name === 'body')?.visible).toBe(false);
    expect(draft.spec.find((node) => node.name === 'authorId')?.options).toEqual({
      'author-1': 'Ada Lovelace',
    });
  });
});
