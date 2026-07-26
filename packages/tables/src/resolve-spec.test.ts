import { describe, it, expect } from 'vitest';
import { t, buildTable } from './factory.js';
import { resolveTableSpec } from './resolve-spec.js';

describe('resolveTableSpec', () => {
  it('defaults labels and coerces flags', () => {
    const spec = resolveTableSpec(buildTable({ columns: [t.text('firstName').sortable()] }));
    expect(spec.columns[0]).toEqual({
      type: 'text',
      name: 'firstName',
      label: 'First Name',
      sortable: true,
      searchable: false,
    });
  });
  it('keeps an explicit label', () => {
    const spec = resolveTableSpec(buildTable({ columns: [t.text('author.name').label('Writer')] }));
    expect(spec.columns[0]!.label).toBe('Writer');
  });
  it('strips the accessor function (serializable output)', () => {
    const spec = resolveTableSpec(
      buildTable({ columns: [t.text('x').accessor((r) => r.id)] }),
    );
    expect('accessor' in spec.columns[0]!).toBe(false);
    expect(() => JSON.stringify(spec)).not.toThrow();
  });
  it('passes badge colors through', () => {
    const spec = resolveTableSpec(buildTable({ columns: [t.badge('role').colors({ admin: 'red' })] }));
    expect(spec.columns[0]!.colors).toEqual({ admin: 'red' });
  });
  it('defaults filter labels and includes actions', () => {
    const spec = resolveTableSpec(
      buildTable({
        columns: [t.text('title')],
        filters: [t.select('role').options({ a: 'A' })],
        actions: [t.editAction()],
      }),
    );
    expect(spec.filters[0]).toMatchObject({ name: 'role', label: 'Role', options: { a: 'A' } });
    expect(spec.actions[0]).toMatchObject({ type: 'edit' });
  });
  it('keeps only serializable action keys', () => {
    const action = { type: 'custom', name: 'archive', label: 'Archive', handler: () => 'nope' };
    const config = buildTable({ columns: [t.text('title')] });
    config.actions = [action as unknown as (typeof config.actions)[number]];
    const spec = resolveTableSpec(config);
    expect(spec.actions[0]).toEqual({ type: 'custom', name: 'archive', label: 'Archive' });
    expect(() => JSON.stringify(spec)).not.toThrow();
  });
});
