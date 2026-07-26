import { describe, it, expect } from 'vitest';
import { BadgeEntryBuilder, EntryBuilder, GridBuilder, SectionBuilder } from './entries.js';

describe('EntryBuilder', () => {
  it('builds a node with the type and name', () => {
    expect(new EntryBuilder('text', 'title').build()).toEqual({ type: 'text', name: 'title' });
  });

  it('accumulates label and placeholder', () => {
    const node = new EntryBuilder('text', 'title').label('Post title').placeholder('None').build();
    expect(node.label).toBe('Post title');
    expect(node.placeholder).toBe('None');
  });

  it('takes a label as a function prop', () => {
    const fn = () => 'Computed';
    expect(new EntryBuilder('text', 'title').label(fn).build().label).toBe(fn);
  });

  it('inherits visible and columnSpan from NodeBuilder', () => {
    const pred = () => false;
    const node = new EntryBuilder('text', 'title').visible(pred).columnSpan(2).build();
    expect(node.visible).toBe(pred);
    expect(node.columnSpan).toBe(2);
  });

  it('returns this for chaining', () => {
    const b = new EntryBuilder('text', 'title');
    expect(b.label('x')).toBe(b);
    expect(b.placeholder('y')).toBe(b);
  });

  it('build() returns a copy, not the live node', () => {
    const b = new EntryBuilder('text', 'title');
    const first = b.build();
    b.columnSpan(3);
    expect(first.columnSpan).toBeUndefined();
    expect(b.build()).not.toBe(first);
  });
});

describe('BadgeEntryBuilder', () => {
  it('carries a color map', () => {
    const node = new BadgeEntryBuilder('badge', 'status').colors({ draft: 'gray' }).build();
    expect(node.colors).toEqual({ draft: 'gray' });
  });
});

describe('SectionBuilder', () => {
  it('builds a section with heading and built children', () => {
    const node = new SectionBuilder('Details', [new EntryBuilder('text', 'title')]).build();
    expect(node).toEqual({
      type: 'section',
      heading: 'Details',
      children: [{ type: 'text', name: 'title' }],
    });
  });
});

describe('GridBuilder', () => {
  it('builds a grid with columns and built children', () => {
    const node = new GridBuilder(2, [new EntryBuilder('text', 'title')]).build();
    expect(node).toEqual({
      type: 'grid',
      columns: 2,
      children: [{ type: 'text', name: 'title' }],
    });
  });
});
