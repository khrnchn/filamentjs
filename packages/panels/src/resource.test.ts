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
});
