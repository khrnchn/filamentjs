import { describe, it, expect } from 'vitest';
import { t, buildTable } from './factory.js';

describe('t factory', () => {
  it('creates a text column builder', () => {
    expect(t.text('title').sortable().build()).toMatchObject({ type: 'text', name: 'title', sortable: true });
  });
  it('creates a badge column with colors', () => {
    expect(t.badge('role').colors({ admin: 'red' }).build().colors).toEqual({ admin: 'red' });
  });
  it('creates a select filter', () => {
    expect(t.select('role').options({ a: 'A' }).build()).toMatchObject({ type: 'select', name: 'role' });
  });
  it('creates standard actions', () => {
    expect(t.editAction().build()).toMatchObject({ type: 'edit', name: 'edit' });
    expect(t.deleteAction().build()).toMatchObject({ type: 'delete', name: 'delete', requiresConfirmation: true, destructive: true });
    expect(t.createAction().build()).toMatchObject({ type: 'create', name: 'create' });
    expect(t.deleteBulkAction().build()).toMatchObject({ type: 'deleteBulk', name: 'deleteBulk', destructive: true });
  });
});

describe('buildTable', () => {
  it('normalizes an input of builders into a config, defaulting empty arrays', () => {
    const config = buildTable({
      columns: [t.text('title'), t.boolean('active')],
      filters: [t.select('role').options({ a: 'A' })],
      actions: [t.editAction()],
    });
    expect(config.columns).toHaveLength(2);
    expect(config.filters).toHaveLength(1);
    expect(config.actions).toHaveLength(1);
    expect(config.bulkActions).toEqual([]);
    expect(config.headerActions).toEqual([]);
  });
  it('builds a view action', () => {
    expect(t.viewAction().build()).toEqual({ type: 'view', name: 'view' });
  });
  it('defaults page sizes and carries an empty state', () => {
    const config = buildTable({ columns: [t.text('title')] });
    expect(config.pageSizes).toEqual([10, 25, 50, 100]);
    expect(config.emptyState).toBeUndefined();

    const custom = buildTable({
      columns: [t.text('title')],
      pageSizes: [5, 10],
      emptyState: { heading: 'No posts yet', description: 'Write one.' },
    });
    expect(custom.pageSizes).toEqual([5, 10]);
    expect(custom.emptyState).toEqual({ heading: 'No posts yet', description: 'Write one.' });
  });
});
