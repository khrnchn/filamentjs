import { describe, it, expect } from 'vitest';
import { buildTable, t } from '@filamentjs/tables';
import { f } from '@filamentjs/forms';
import { defineResource } from './resource.js';

const table = buildTable({ columns: [t.text('title')] });

describe('defineResource', () => {
  it('fills defaults', () => {
    const r = defineResource({ name: 'Post', slug: 'posts', model: {}, form: [f.text('title')], table });
    expect(r.pluralName).toBe('Posts');
    expect(r.nav).toEqual({});
    expect(r.roles).toEqual([]);
    expect(r.slug).toBe('posts');
  });
  it('keeps explicit pluralName, nav, roles', () => {
    const r = defineResource({
      name: 'Category', pluralName: 'Categories', slug: 'categories', model: {},
      form: [], table, nav: { group: 'Content', sort: 2 }, roles: ['admin'],
    });
    expect(r.pluralName).toBe('Categories');
    expect(r.nav.group).toBe('Content');
    expect(r.roles).toEqual(['admin']);
  });
  it('defaults relations to an empty map and keeps declared ones', () => {
    const related = { name: 'users' };
    const base = { name: 'Post', slug: 'posts', model: {}, form: [], table };
    expect(defineResource(base).relations).toEqual({});
    expect(defineResource({ ...base, relations: { author: related } }).relations).toEqual({ author: related });
  });
  it('defaults the infolist to an empty list and resolves an infolist closure', () => {
    const base = { name: 'Post', slug: 'posts', model: {}, form: [], table };
    expect(defineResource(base).infolist).toEqual([]);
    const r = defineResource({ ...base, infolist: (ii) => [ii.text('title').label('Title')] });
    expect(r.infolist[0]!.build()).toMatchObject({ type: 'text', name: 'title', label: 'Title' });
  });
  it('resolves a form closure with the field factory', () => {
    const r = defineResource({
      name: 'Post', slug: 'posts', model: {},
      form: (ff) => [ff.text('title').label('Title')],
      table,
    });
    expect(r.form).toHaveLength(1);
    expect(r.form[0]!.build()).toMatchObject({ type: 'text', name: 'title', label: 'Title' });
  });
  it('resolves a table closure with the column factory', () => {
    const r = defineResource({
      name: 'Post', slug: 'posts', model: {},
      form: [],
      table: (tt) => buildTable({ columns: [tt.text('title').sortable()] }),
    });
    expect(r.table.columns).toEqual([expect.objectContaining({ name: 'title', sortable: true })]);
  });
});
