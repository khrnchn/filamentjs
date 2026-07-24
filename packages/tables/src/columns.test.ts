import { describe, it, expect } from 'vitest';
import { ColumnBuilder, BadgeColumnBuilder } from './columns.js';

describe('ColumnBuilder', () => {
  it('builds a column with type and name', () => {
    expect(new ColumnBuilder('text', 'title').build()).toEqual({ type: 'text', name: 'title' });
  });
  it('accumulates label, sortable, searchable', () => {
    const node = new ColumnBuilder('text', 'title').label('Title').sortable().searchable().build();
    expect(node).toMatchObject({ label: 'Title', sortable: true, searchable: true });
  });
  it('stores an accessor', () => {
    const fn = (row: Record<string, unknown>) => row.x;
    expect(new ColumnBuilder('text', 'x').accessor(fn).build().accessor).toBe(fn);
  });
});

describe('BadgeColumnBuilder', () => {
  it('stores a colors map', () => {
    const node = new BadgeColumnBuilder('badge', 'role').colors({ admin: 'red' }).build();
    expect(node.colors).toEqual({ admin: 'red' });
  });
});
