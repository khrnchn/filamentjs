import { describe, it, expect } from 'vitest';
import { buildTable, t } from '@filamentjs/tables';
import { defineResource } from './resource.js';
import { definePanel } from './panel.js';

const table = buildTable({ columns: [t.text('x')] });
const mk = (name: string, slug: string, nav?: { group?: string; sort?: number }) =>
  defineResource({ name, slug, model: {}, form: [], table, nav });

describe('definePanel', () => {
  it('defaults basePath and brand', () => {
    const p = definePanel({ resources: [mk('Post', 'posts')] });
    expect(p.basePath).toBe('/admin');
    expect(p.brand).toBe('FilamentJS');
  });
  it('builds hrefs and groups by nav group in navGroups order', () => {
    const p = definePanel({
      navGroups: ['Content', 'Access'],
      resources: [
        mk('User', 'users', { group: 'Access', sort: 1 }),
        mk('Post', 'posts', { group: 'Content', sort: 1 }),
        mk('Tag', 'tags', { group: 'Content', sort: 2 }),
      ],
    });
    expect(p.nav.map((g) => g.label)).toEqual(['Content', 'Access']);
    expect(p.nav[0]!.items.map((i) => i.slug)).toEqual(['posts', 'tags']);
    expect(p.nav[0]!.items[0]!.href).toBe('/admin/posts');
  });
  it('puts ungrouped resources in a trailing null group', () => {
    const p = definePanel({ navGroups: ['Content'], resources: [mk('Post', 'posts', { group: 'Content' }), mk('Setting', 'settings')] });
    expect(p.nav[p.nav.length - 1]!.label).toBeNull();
    expect(p.nav[p.nav.length - 1]!.items[0]!.slug).toBe('settings');
  });
  it('looks up a resource by slug', () => {
    const p = definePanel({ resources: [mk('Post', 'posts')] });
    expect(p.getResource('posts')?.name).toBe('Post');
    expect(p.getResource('nope')).toBeUndefined();
  });
});
