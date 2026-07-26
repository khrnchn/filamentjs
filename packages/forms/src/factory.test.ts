import { describe, it, expect } from 'vitest';
import { f } from './factory.js';

describe('f factory: fields', () => {
  it('creates a text field', () => {
    expect(f.text('name').build()).toMatchObject({ type: 'text', name: 'name' });
  });
  it('creates a select with options', () => {
    const node = f.select('role').options({ admin: 'Admin' }).build();
    expect(node).toMatchObject({ type: 'select', name: 'role', options: { admin: 'Admin' } });
  });
  it('creates a relation select for a related model', () => {
    const user = { table: 'user' };
    const node = f.relationSelect('authorId').relatedTo(user, { label: 'name' }).build();
    expect(node).toMatchObject({
      type: 'relationSelect',
      name: 'authorId',
      relation: {
        model: user,
        labelColumn: 'name',
        valueColumn: 'id',
      },
    });
  });
  it('exposes email() on text builders', () => {
    expect(f.text('email').email().build().rules).toEqual([{ name: 'email' }]);
  });
});

describe('f factory: layout', () => {
  it('builds a section with heading and built children', () => {
    const node = f.section('Profile', [f.text('bio'), f.toggle('active')]).build();
    expect(node.type).toBe('section');
    expect(node.heading).toBe('Profile');
    expect(node.children).toEqual([
      expect.objectContaining({ type: 'text', name: 'bio' }),
      expect.objectContaining({ type: 'toggle', name: 'active' }),
    ]);
  });
  it('builds a grid with a column count', () => {
    const node = f.grid(2, [f.text('a')]).build();
    expect(node.type).toBe('grid');
    expect(node.columns).toBe(2);
    expect(node.children).toHaveLength(1);
  });
  it('nests layout inside layout', () => {
    const node = f.section('Outer', [f.grid(2, [f.text('a')])]).build();
    expect(node.children?.[0]).toMatchObject({ type: 'grid', columns: 2 });
  });
  it('creates a file upload carrying its constraints', () => {
    const node = f
      .fileUpload('cover')
      .label('Cover')
      .accept(['image/png', 'image/jpeg'])
      .maxSize(5_000_000)
      .build();
    expect(node).toMatchObject({
      type: 'fileUpload',
      name: 'cover',
      label: 'Cover',
      accept: ['image/png', 'image/jpeg'],
      maxSize: 5_000_000,
    });
  });
});
