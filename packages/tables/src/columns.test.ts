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
  it('marks a column toggleable, optionally hidden by default', () => {
    expect(new ColumnBuilder('text', 'slug').toggleable().build()).toMatchObject({
      toggleable: true,
      hiddenByDefault: false,
    });
    expect(
      new ColumnBuilder('text', 'slug').toggleable({ hiddenByDefault: true }).build(),
    ).toMatchObject({ toggleable: true, hiddenByDefault: true });
  });
  it('attaches an aggregate to a column', () => {
    expect(new ColumnBuilder('text', 'views').summarize('sum').build().summarize).toBe('sum');
  });
});
