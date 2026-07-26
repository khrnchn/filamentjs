import { describe, it, expect } from 'vitest';
import { buildTable, t } from '@filamentjs/tables';
import { defineResource } from './resource.js';
import { authorizeResource } from './authorize.js';

const table = buildTable({ columns: [t.text('title')] });
const base = { name: 'Post', slug: 'posts', model: {}, form: [], table };

describe('authorizeResource', () => {
  it('allows every action when no roles and no policies are declared', () => {
    const r = defineResource(base);
    const ctx = { user: { id: 'u1', role: null } };
    expect(authorizeResource(r, 'view', ctx)).toBe(true);
    expect(authorizeResource(r, 'delete', ctx)).toBe(true);
  });

  it('denies when the user role is outside the resource roles', () => {
    const r = defineResource({ ...base, roles: ['admin'] });
    expect(authorizeResource(r, 'view', { user: { id: 'u1', role: 'editor' } })).toBe(false);
    expect(authorizeResource(r, 'view', { user: { id: 'u1', role: 'admin' } })).toBe(true);
  });

  it('applies the per-action policy', () => {
    const r = defineResource({ ...base, can: { create: () => false } });
    const ctx = { user: { id: 'u1', role: 'admin' } };
    expect(authorizeResource(r, 'create', ctx)).toBe(false);
    expect(authorizeResource(r, 'update', ctx)).toBe(true);
  });

  it('passes the record to the policy for record-level rules', () => {
    const r = defineResource({
      ...base,
      model: {} as { authorId: string },
      can: { update: ({ user, record }) => record?.authorId === user.id },
    });
    expect(authorizeResource(r, 'update', { user: { id: 'u1' }, record: { authorId: 'u1' } })).toBe(true);
    expect(authorizeResource(r, 'update', { user: { id: 'u1' }, record: { authorId: 'u2' } })).toBe(false);
  });

  it('checks roles before the policy', () => {
    const r = defineResource({
      ...base,
      roles: ['admin'],
      can: {
        view: () => {
          throw new Error('policy should not run for a role mismatch');
        },
      },
    });
    expect(authorizeResource(r, 'view', { user: { id: 'u1', role: 'editor' } })).toBe(false);
  });
});
