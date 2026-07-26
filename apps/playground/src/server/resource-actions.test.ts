import { beforeAll, describe, expect, it, vi } from 'vitest';
import { eq, inArray } from 'drizzle-orm';

const session: { user: { id: string; role: string } } = {
  user: { id: 'resource-actions-test-admin', role: 'admin' },
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
import { panel } from '../filament/panel.js';
import { deleteResources, listResource } from './resource-fns.js';

const USER_ID = 'resource-actions-test-user';

beforeAll(async () => {
  await db.delete(user).where(eq(user.id, USER_ID));
  await db.insert(user).values({
    id: USER_ID,
    name: 'Resource Actions Tester',
    email: 'resource-actions@test.local',
  });
});

describe('resource list actions against real Postgres', () => {
  it('returns index-aligned row permissions and hides a denied create action', async () => {
    const [inserted] = await db
      .insert(posts)
      .values({
        title: 'Permission list record',
        slug: `permission-list-record-${Date.now()}`,
        status: 'draft',
      })
      .returning({ id: posts.id });
    const resource = panel.getResource('posts')!;
    const originalCreate = resource.can.create;
    resource.can.create = ({ user: policyUser }) => policyUser.role === 'admin';

    try {
      session.user = { id: USER_ID, role: 'user' };
      const editorList = await listResource({
        data: { slug: 'posts', params: { page: 1, pageSize: 100 } },
      });

      expect(editorList.permissions).toHaveLength(editorList.rows.length);
      const editorIndex = editorList.rows.findIndex((row) => row.id === inserted!.id);
      expect(editorIndex).toBeGreaterThanOrEqual(0);
      expect(editorList.permissions[editorIndex]).toEqual({ update: true, delete: false });
      expect(editorList.spec.headerActions.some((action) => action.type === 'create')).toBe(false);

      session.user = { id: USER_ID, role: 'admin' };
      const adminList = await listResource({
        data: { slug: 'posts', params: { page: 1, pageSize: 100 } },
      });

      expect(adminList.permissions).toHaveLength(adminList.rows.length);
      const adminIndex = adminList.rows.findIndex((row) => row.id === inserted!.id);
      expect(adminIndex).toBeGreaterThanOrEqual(0);
      expect(adminList.permissions[adminIndex]).toEqual({ update: true, delete: true });
      expect(adminList.spec.headerActions.some((action) => action.type === 'create')).toBe(true);
    } finally {
      resource.can.create = originalCreate;
      session.user = { id: 'resource-actions-test-admin', role: 'admin' };
      await db.delete(posts).where(eq(posts.id, inserted!.id));
    }
  });

  it('bulk deletes only records allowed by the row policy and reports a partial success', async () => {
    const inserted = await db
      .insert(posts)
      .values([
        {
          title: 'Permitted bulk delete',
          slug: `permitted-bulk-delete-${Date.now()}`,
          status: 'draft',
        },
        {
          title: 'Denied bulk delete',
          slug: `denied-bulk-delete-${Date.now()}`,
          status: 'published',
        },
      ])
      .returning({ id: posts.id });
    const ids = inserted.map((row) => row.id);
    const resource = panel.getResource('posts')!;
    const originalDelete = resource.can.delete;
    resource.can.delete = ({ record }) =>
      (record as { status?: string } | undefined)?.status === 'draft';

    try {
      const result = await deleteResources({ data: { slug: 'posts', ids } });

      expect(result).toEqual({ ok: true, deleted: 1 });

      const list = await listResource({
        data: { slug: 'posts', params: { page: 1, pageSize: 100 } },
      });
      const remainingIds = list.rows.map((row) => row.id);
      expect(remainingIds).not.toContain(ids[0]);
      expect(remainingIds).toContain(ids[1]);
    } finally {
      resource.can.delete = originalDelete;
      await db.delete(posts).where(inArray(posts.id, ids));
    }
  });
});
